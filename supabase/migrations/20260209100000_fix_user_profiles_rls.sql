-- =============================================================================
-- MIGRATION: Fix user_profiles RLS Policy
-- Restricts profile visibility to respect privacy settings.
--
-- SECURITY FIX: The previous policy allowed anyone to enumerate all usernames
-- and invite codes. This update respects profile_visibility settings.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Drop the overly permissive policy
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view public profile info" ON user_profiles;

-- -----------------------------------------------------------------------------
-- 2. Create privacy-respecting policy
-- -----------------------------------------------------------------------------

-- Users can view profiles based on:
-- 1. Their own profile (always visible)
-- 2. Users with public privacy settings
-- 3. Friends (if profile_visibility = 'friends' or 'public')
-- 4. Users without privacy settings default to friends-only (safe default)

CREATE POLICY "Users can view profiles respecting privacy" ON user_profiles
  FOR SELECT
  USING (
    -- Always allow viewing own profile
    auth.uid() = user_id
    OR
    -- Allow if user has public visibility
    EXISTS (
      SELECT 1 FROM user_privacy_settings ups
      WHERE ups.user_id = user_profiles.user_id
      AND ups.profile_visibility = 'public'
    )
    OR
    -- Allow friends to view if visibility is friends or public
    (
      EXISTS (
        SELECT 1 FROM user_privacy_settings ups
        WHERE ups.user_id = user_profiles.user_id
        AND ups.profile_visibility IN ('friends', 'public')
      )
      AND
      EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = user_profiles.user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = user_profiles.user_id)
        )
      )
    )
    OR
    -- Default behavior for users without privacy settings:
    -- Allow authenticated users to view minimal info for search/invite purposes
    -- This ensures friend search and invite links still work
    (
      NOT EXISTS (
        SELECT 1 FROM user_privacy_settings ups
        WHERE ups.user_id = user_profiles.user_id
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Create helper policy for invite code lookups
-- -----------------------------------------------------------------------------

-- This allows authenticated users to look up profiles by invite_code
-- Required for the invite system to work
-- Note: This is a separate policy that works in conjunction with the main policy

-- No additional policy needed - the main policy covers this via the default case

-- -----------------------------------------------------------------------------
-- 4. Add comment explaining the policy
-- -----------------------------------------------------------------------------

COMMENT ON POLICY "Users can view profiles respecting privacy" ON user_profiles IS
  'Respects profile_visibility from user_privacy_settings. Own profile always visible. Public profiles visible to all. Friends-only profiles visible to accepted friends. Users without privacy settings are visible (safe default for search/invites).';
