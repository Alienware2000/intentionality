-- =============================================================================
-- MIGRATION: Allow Profile Visibility for Leaderboards
-- Adds RLS policy so authenticated users can view all profiles.
-- This is needed for global leaderboard to show all users.
-- =============================================================================

-- Add policy allowing authenticated users to view all profiles
-- This enables leaderboard functionality
CREATE POLICY "Authenticated users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);
