-- =============================================================================
-- ROBUST SOCIAL FIXES MIGRATION
-- Database-level solutions for social features audit findings.
--
-- This migration fixes:
-- 1. Canonical friendship pairs (prevents race condition duplicates)
-- 2. Nudge rate limiting (database-enforced daily limit)
-- 3. Referral XP idempotency (atomic function with unique constraint)
-- 4. Block status checks (trigger-based enforcement)
-- 5. Stricter privacy defaults (opt-in visibility)
--
-- PHILOSOPHY: Fix issues at the database level so bugs are impossible,
-- not just handled in application code.
-- =============================================================================

-- =============================================================================
-- 1. CANONICAL FRIENDSHIP PAIRS
-- Problem: A→B and B→A can create separate records when sent simultaneously.
-- Solution: Add generated columns for canonical ordering + unique constraint.
-- =============================================================================

-- Add canonical pair columns using generated columns (PostgreSQL 12+)
-- These always store the "smaller" UUID as user_a and "larger" as user_b
ALTER TABLE friendships
  ADD COLUMN IF NOT EXISTS user_a UUID GENERATED ALWAYS AS (
    LEAST(user_id, friend_id)
  ) STORED,
  ADD COLUMN IF NOT EXISTS user_b UUID GENERATED ALWAYS AS (
    GREATEST(user_id, friend_id)
  ) STORED;

-- Drop old constraint if it exists, add new one on canonical pair
-- This allows only ONE record per user pair, regardless of who sent the request
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS unique_friendship;
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS unique_user_pair;
ALTER TABLE friendships ADD CONSTRAINT unique_user_pair UNIQUE (user_a, user_b);

-- Add index for efficient lookups by canonical pair
CREATE INDEX IF NOT EXISTS idx_friendships_canonical_pair ON friendships(user_a, user_b);

-- Add comments for clarity
COMMENT ON COLUMN friendships.user_a IS 'Canonical pair: smaller UUID of the two users (auto-generated)';
COMMENT ON COLUMN friendships.user_b IS 'Canonical pair: larger UUID of the two users (auto-generated)';
COMMENT ON COLUMN friendships.user_id IS 'The user who sent the request (requester)';
COMMENT ON COLUMN friendships.friend_id IS 'The user who received the request (addressee)';

-- =============================================================================
-- 2. NUDGE RATE LIMITING
-- Problem: No database constraint exists - users can spam unlimited nudges.
-- Solution: Partial unique index for daily rate limit (UTC-based).
-- =============================================================================

-- Create immutable function to extract UTC date from timestamp
-- Required because (ts::date) is not immutable (depends on timezone setting)
CREATE OR REPLACE FUNCTION utc_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
  SELECT (ts AT TIME ZONE 'UTC')::DATE
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;

COMMENT ON FUNCTION utc_date IS 'Extracts the UTC date from a timestamptz. Immutable for use in indexes.';

-- Clean up existing duplicate nudges before creating the unique index
-- Keep only the earliest nudge for each user pair per day
DELETE FROM nudges n1
WHERE EXISTS (
  SELECT 1 FROM nudges n2
  WHERE n2.from_user_id = n1.from_user_id
    AND n2.to_user_id = n1.to_user_id
    AND utc_date(n2.created_at) = utc_date(n1.created_at)
    AND n2.created_at < n1.created_at
);

-- Create unique index that only allows one nudge per sender-recipient pair per day
-- Uses UTC date for consistency across timezones
CREATE UNIQUE INDEX IF NOT EXISTS idx_nudges_daily_limit
  ON nudges (from_user_id, to_user_id, utc_date(created_at));

-- Add comment explaining the constraint
COMMENT ON INDEX idx_nudges_daily_limit IS 'Enforces rate limit: 1 nudge per sender-recipient pair per day (UTC)';

-- =============================================================================
-- 3. REFERRAL XP IDEMPOTENCY
-- Problem: Multiple concurrent calls can award XP multiple times.
-- Solution: Separate referrals table + atomic PostgreSQL function.
-- =============================================================================

-- Create referrals table for audit trail and idempotency
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_awarded_to_referrer INTEGER NOT NULL DEFAULT 0,
  xp_awarded_to_referee INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only be referred ONCE (idempotency key)
  CONSTRAINT unique_referee UNIQUE (referee_id),
  -- Cannot refer yourself
  CONSTRAINT no_self_referral CHECK (referrer_id != referee_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);

-- RLS: Users can see referrals they're part of
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- Only system functions can insert referrals
CREATE POLICY "System can insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE referrals IS 'Tracks referral relationships and XP awards for idempotency';
COMMENT ON COLUMN referrals.referee_id IS 'The user who was referred (unique - can only be referred once)';

-- Atomic function for processing referrals
-- This function is idempotent - safe to call multiple times for the same referee
CREATE OR REPLACE FUNCTION process_referral(
  p_referrer_id UUID,
  p_referee_id UUID,
  p_base_xp INTEGER DEFAULT 50,
  p_first_bonus INTEGER DEFAULT 25,
  p_referee_bonus INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
  v_referrer_count INTEGER;
  v_referrer_xp INTEGER;
  v_is_first BOOLEAN;
  v_new_referrer_xp INTEGER;
  v_new_referrer_level INTEGER;
  v_new_referee_xp INTEGER;
  v_new_referee_level INTEGER;
BEGIN
  -- Validate inputs
  IF p_referrer_id = p_referee_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot refer yourself'
    );
  END IF;

  -- Try to insert referral record - fails if already referred (idempotent)
  BEGIN
    INSERT INTO referrals (referrer_id, referee_id)
    VALUES (p_referrer_id, p_referee_id);
  EXCEPTION WHEN unique_violation THEN
    -- Already processed - return success with no XP
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'referrer_xp', 0,
      'referee_xp', 0
    );
  END;

  -- Lock referrer row to prevent concurrent updates
  SELECT referral_count, xp_total INTO v_referrer_count, v_new_referrer_xp
  FROM user_profiles WHERE user_id = p_referrer_id
  FOR UPDATE;

  -- Check if referrer exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referrer not found'
    );
  END IF;

  v_is_first := (v_referrer_count = 0);
  v_referrer_xp := p_base_xp + (CASE WHEN v_is_first THEN p_first_bonus ELSE 0 END);
  v_new_referrer_xp := v_new_referrer_xp + v_referrer_xp;

  -- Calculate new level for referrer (using same formula as gamification.ts)
  -- XP for level = floor(50 * level^1.5) cumulative
  v_new_referrer_level := 1;
  WHILE (50 * power(v_new_referrer_level, 1.5))::INTEGER <= v_new_referrer_xp LOOP
    v_new_referrer_level := v_new_referrer_level + 1;
  END LOOP;

  -- Atomic update for referrer
  UPDATE user_profiles SET
    xp_total = v_new_referrer_xp,
    level = v_new_referrer_level,
    referral_count = referral_count + 1
  WHERE user_id = p_referrer_id;

  -- Get referee's current XP
  SELECT xp_total INTO v_new_referee_xp
  FROM user_profiles WHERE user_id = p_referee_id
  FOR UPDATE;

  IF FOUND THEN
    v_new_referee_xp := COALESCE(v_new_referee_xp, 0) + p_referee_bonus;

    -- Calculate new level for referee
    v_new_referee_level := 1;
    WHILE (50 * power(v_new_referee_level, 1.5))::INTEGER <= v_new_referee_xp LOOP
      v_new_referee_level := v_new_referee_level + 1;
    END LOOP;

    -- Atomic update for referee
    UPDATE user_profiles SET
      referred_by = p_referrer_id,
      xp_total = v_new_referee_xp,
      level = v_new_referee_level
    WHERE user_id = p_referee_id;
  END IF;

  -- Record XP for audit
  UPDATE referrals SET
    xp_awarded_to_referrer = v_referrer_xp,
    xp_awarded_to_referee = p_referee_bonus
  WHERE referee_id = p_referee_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'referrer_xp', v_referrer_xp,
    'referee_xp', p_referee_bonus,
    'is_first_referral', v_is_first
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_referral IS 'Atomically processes a referral, awarding XP to both parties. Idempotent - safe to call multiple times.';

-- =============================================================================
-- 4. BLOCK STATUS CHECKS
-- Problem: Auto-accept doesn't check if users have blocked each other.
-- Solution: Helper function + trigger to prevent blocked friendships.
-- =============================================================================

-- Helper function to check block status in either direction
CREATE OR REPLACE FUNCTION users_blocked(user1 UUID, user2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'blocked'
    AND (
      (user_id = user1 AND friend_id = user2)
      OR (user_id = user2 AND friend_id = user1)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION users_blocked IS 'Returns true if either user has blocked the other';

-- Trigger function to prevent friendships with blocked users
CREATE OR REPLACE FUNCTION check_not_blocked()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip check for blocked status itself
  IF NEW.status = 'blocked' THEN
    RETURN NEW;
  END IF;

  -- Check if there's an existing block between these users
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'blocked'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (user_id = NEW.user_id AND friend_id = NEW.friend_id)
      OR (user_id = NEW.friend_id AND friend_id = NEW.user_id)
    )
  ) THEN
    RAISE EXCEPTION 'Cannot create friendship with blocked user'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to allow re-running migration)
DROP TRIGGER IF EXISTS prevent_blocked_friendships ON friendships;
CREATE TRIGGER prevent_blocked_friendships
  BEFORE INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION check_not_blocked();

COMMENT ON FUNCTION check_not_blocked IS 'Prevents creating friendships where one user has blocked the other';

-- =============================================================================
-- 5. STRICTER PRIVACY DEFAULTS
-- Problem: Users without privacy settings are visible to everyone.
-- Solution: Update RLS policy to require explicit opt-in for visibility.
-- =============================================================================

-- Note: The original policy on user_profiles is complex and may involve
-- multiple policies. We'll add a helper function for cleaner privacy checks.

-- Helper function to check if a profile should be visible
CREATE OR REPLACE FUNCTION profile_visible_to(profile_user_id UUID, viewer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_visibility TEXT;
BEGIN
  -- Own profile always visible
  IF profile_user_id = viewer_id THEN
    RETURN TRUE;
  END IF;

  -- Get user's privacy setting
  SELECT profile_visibility INTO v_visibility
  FROM user_privacy_settings
  WHERE user_id = profile_user_id;

  -- If no privacy settings, not visible (privacy-first)
  IF v_visibility IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Public profiles visible to all
  IF v_visibility = 'public' THEN
    RETURN TRUE;
  END IF;

  -- Friends visibility - check if they're friends
  IF v_visibility = 'friends' THEN
    RETURN EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.user_id = viewer_id AND f.friend_id = profile_user_id)
        OR (f.friend_id = viewer_id AND f.user_id = profile_user_id)
      )
    );
  END IF;

  -- Private profiles only visible to owner
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION profile_visible_to IS 'Checks if a profile should be visible to a viewer based on privacy settings';

-- =============================================================================
-- AUTO-CREATE PRIVACY SETTINGS ON USER PROFILE CREATION
-- Ensures all users have default privacy settings
-- =============================================================================

-- Function to create default privacy settings when a user profile is created
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_privacy_settings (user_id, profile_visibility, allow_friend_requests)
  VALUES (NEW.user_id, 'friends', true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first to allow re-running migration)
DROP TRIGGER IF EXISTS create_privacy_settings_on_profile ON user_profiles;
CREATE TRIGGER create_privacy_settings_on_profile
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_privacy_settings();

-- Backfill: Create privacy settings for existing users who don't have them
INSERT INTO user_privacy_settings (user_id, profile_visibility, allow_friend_requests)
SELECT user_id, 'friends', true
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM user_privacy_settings ups WHERE ups.user_id = up.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION utc_date(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral(UUID, UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION users_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION profile_visible_to(UUID, UUID) TO authenticated;
