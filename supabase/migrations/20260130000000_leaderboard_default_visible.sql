-- =============================================================================
-- MIGRATION: Change Global Leaderboard Default to Visible
-- Makes all users visible on the global leaderboard by default
-- =============================================================================

-- Change default for new users to be visible on global leaderboard
ALTER TABLE user_privacy_settings
ALTER COLUMN show_on_global_leaderboard SET DEFAULT true;

-- Update existing users to be visible
UPDATE user_privacy_settings
SET show_on_global_leaderboard = true
WHERE show_on_global_leaderboard = false;
