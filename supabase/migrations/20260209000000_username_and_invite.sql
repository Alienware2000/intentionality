-- =============================================================================
-- MIGRATION: Username and Invite System
-- Adds unique usernames for social discovery and invite links for friend growth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add username column with unique constraint
-- -----------------------------------------------------------------------------

-- Add username column (NULL allowed for existing users until they set one)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Case-insensitive uniqueness via lowercase index
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_lower
  ON user_profiles (LOWER(username)) WHERE username IS NOT NULL;

-- Format validation: 3-20 chars, lowercase alphanumeric + underscores
-- Must start and end with alphanumeric (or be single char if length 3)
-- Pattern: starts with alnum, middle can have underscores, ends with alnum
ALTER TABLE user_profiles ADD CONSTRAINT valid_username_format
  CHECK (username IS NULL OR (
    LENGTH(username) >= 3 AND LENGTH(username) <= 20 AND
    username ~ '^[a-z0-9][a-z0-9_]*[a-z0-9]$|^[a-z0-9]{1,2}$'
  ));

-- -----------------------------------------------------------------------------
-- 2. Add invite system columns
-- -----------------------------------------------------------------------------

-- Personal invite code for each user (8-char uppercase)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS invite_code TEXT
  DEFAULT UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));

-- Ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_invite_code
  ON user_profiles (invite_code);

-- Referral tracking
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID
  REFERENCES user_profiles(user_id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- -----------------------------------------------------------------------------
-- 3. Backfill invite codes for existing users
-- -----------------------------------------------------------------------------

UPDATE user_profiles
SET invite_code = UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8))
WHERE invite_code IS NULL;

-- -----------------------------------------------------------------------------
-- 4. Helper function to suggest username based on display_name
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION suggest_username(base_name TEXT, user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  clean_name TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  -- Clean the name: lowercase, remove non-alphanumeric chars
  clean_name := LOWER(REGEXP_REPLACE(COALESCE(base_name, 'user'), '[^a-z0-9]', '', 'g'));

  -- Ensure minimum length of 3 characters
  IF LENGTH(clean_name) < 3 THEN
    clean_name := clean_name || SUBSTRING(REPLACE(user_uuid::TEXT, '-', '') FROM 1 FOR (3 - LENGTH(clean_name)));
  END IF;

  -- Truncate to max 15 chars to leave room for suffix
  clean_name := SUBSTRING(clean_name FROM 1 FOR 15);

  -- Start with the clean name as candidate
  candidate := clean_name;

  -- Check for uniqueness and add suffix if needed
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE LOWER(username) = LOWER(candidate)) LOOP
    suffix := suffix + 1;
    candidate := clean_name || suffix::TEXT;
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5. Update RLS policies
-- -----------------------------------------------------------------------------

-- Allow users to read other users' usernames and invite codes for search/invites
-- This is already covered by existing policies since we're adding to user_profiles

-- Policy for looking up users by username (public data)
DROP POLICY IF EXISTS "Users can view public profile info" ON user_profiles;
CREATE POLICY "Users can view public profile info" ON user_profiles
  FOR SELECT
  USING (true);

-- Note: Write policies already exist scoped to user_id = auth.uid()
