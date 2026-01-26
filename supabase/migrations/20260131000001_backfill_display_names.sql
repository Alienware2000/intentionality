-- =============================================================================
-- MIGRATION: Backfill Display Names for Existing Users
-- Sets display_name to email prefix for users who don't have one set.
-- =============================================================================

-- Update user_profiles that have no display_name, using the email prefix from auth.users
UPDATE user_profiles up
SET display_name = SPLIT_PART(au.email, '@', 1)
FROM auth.users au
WHERE up.user_id = au.id
  AND (up.display_name IS NULL OR up.display_name = '');
