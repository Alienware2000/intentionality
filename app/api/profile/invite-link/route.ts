// =============================================================================
// INVITE LINK API ROUTE
// Returns the user's invite code and shareable URL.
// POST regenerates the invite code.
// =============================================================================

import {
  withAuth,
  successResponse,
  ApiErrors,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// GET /api/profile/invite-link
// -----------------------------------------------------------------------------

/**
 * GET /api/profile/invite-link
 *
 * Returns the authenticated user's invite code and shareable URLs.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} invite_code - The user's invite code
 * @returns {string} invite_url - Full URL for invite code
 * @returns {string} profile_url - Full URL for username-based profile
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase }) => {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("invite_code, username")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return ApiErrors.serverError(error?.message || "Profile not found");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intentionality.app";

  return successResponse({
    invite_code: profile.invite_code,
    invite_url: `${baseUrl}/invite/${profile.invite_code}`,
    profile_url: profile.username ? `${baseUrl}/u/${profile.username}` : null,
    username: profile.username,
  });
});

// -----------------------------------------------------------------------------
// POST /api/profile/invite-link
// -----------------------------------------------------------------------------

/**
 * POST /api/profile/invite-link
 *
 * Regenerates the user's invite code.
 * Use this if the code is compromised or user wants a new one.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} invite_code - The new invite code
 * @returns {string} invite_url - New full URL
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase }) => {
  // Generate new invite code (8-char uppercase from UUID)
  const newCode = crypto.randomUUID().substring(0, 8).toUpperCase();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .update({ invite_code: newCode })
    .eq("user_id", user.id)
    .select("invite_code, username")
    .single();

  if (error || !profile) {
    return ApiErrors.serverError(error?.message || "Failed to regenerate invite code");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://intentionality.app";

  return successResponse({
    invite_code: profile.invite_code,
    invite_url: `${baseUrl}/invite/${profile.invite_code}`,
    profile_url: profile.username ? `${baseUrl}/u/${profile.username}` : null,
    username: profile.username,
  });
});
