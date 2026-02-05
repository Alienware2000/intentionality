-- =============================================================================
-- PREMIUM WAITLIST TABLE
-- Database schema for collecting email waitlist signups for premium features.
--
-- This table stores users who express interest in premium features before
-- they're available. No actual billing - just UI preparation and waitlist.
--
-- LEARNING: Building a Waitlist Before Launch
-- -------------------------------------------
-- Collecting waitlist emails before launching premium features allows:
-- 1. Gauging interest in specific features
-- 2. Building an audience for launch announcements
-- 3. Understanding which features to prioritize
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PREMIUM WAITLIST TABLE
-- Stores email addresses of users interested in premium features.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS premium_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference (nullable for anonymous signups)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Email address (required, unique)
  email TEXT NOT NULL UNIQUE,

  -- Features the user is interested in
  features_interested TEXT[] DEFAULT '{}',

  -- Where the signup came from
  source TEXT DEFAULT 'upgrade_modal',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_premium_waitlist_user_id
  ON premium_waitlist(user_id);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_premium_waitlist_email
  ON premium_waitlist(email);

-- RLS: Users can view/manage their own waitlist entry
ALTER TABLE premium_waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own waitlist entry
CREATE POLICY "Users can view own waitlist entry"
  ON premium_waitlist FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Anyone authenticated can insert (with their user_id)
CREATE POLICY "Users can insert waitlist entry"
  ON premium_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can update their own entry
CREATE POLICY "Users can update own waitlist entry"
  ON premium_waitlist FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own entry
CREATE POLICY "Users can delete own waitlist entry"
  ON premium_waitlist FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- COMMENTS
-- Document the table for future reference.
-- -----------------------------------------------------------------------------
COMMENT ON TABLE premium_waitlist IS 'Email waitlist for premium feature interest before launch';
COMMENT ON COLUMN premium_waitlist.features_interested IS 'Array of feature IDs user is interested in: unlimited_chat, better_models, voice_assistant, agentic_actions';
COMMENT ON COLUMN premium_waitlist.source IS 'Where the signup came from: upgrade_modal, settings, limit_reached';
