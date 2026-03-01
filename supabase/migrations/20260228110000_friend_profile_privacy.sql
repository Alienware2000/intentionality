-- =============================================================================
-- FRIEND PROFILE & PRIVACY ENHANCEMENTS
-- Adds privacy control for habit visibility on friend profile pages.
-- =============================================================================

-- Add show_habits_to_friends column to privacy settings
ALTER TABLE user_privacy_settings
ADD COLUMN IF NOT EXISTS show_habits_to_friends BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_privacy_settings.show_habits_to_friends IS 'Whether friends can see habit details on friend profile page';

-- Function removed: friend stats are handled by application-level queries
-- via service role client in /api/friends/[id]/stats.
