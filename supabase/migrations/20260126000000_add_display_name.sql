-- =============================================================================
-- ADD DISPLAY_NAME TO USER_PROFILES
-- Allows users to set a preferred name for personalized greetings.
-- =============================================================================

-- Add display_name column to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.display_name IS 'User preferred display name for personalized greetings';
