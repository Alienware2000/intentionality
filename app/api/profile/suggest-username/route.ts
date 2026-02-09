// =============================================================================
// SUGGEST USERNAME API ROUTE
// Generates a unique username suggestion based on the user's display name.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  successResponse,
  ApiErrors,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// GET /api/profile/suggest-username
// -----------------------------------------------------------------------------

/**
 * GET /api/profile/suggest-username?name=John%20Smith
 *
 * Suggests a unique username based on the provided name or the user's display name.
 * Uses the database function suggest_username() for uniqueness checking.
 *
 * @authentication Required
 *
 * @query {string} [name] - Optional base name to generate from. Falls back to display_name.
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} suggestion - Suggested unique username
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  let baseName = params.get("name");

  // If no name provided, get the user's display name
  if (!baseName) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    baseName = profile?.display_name || "user";
  }

  // Call the database function to get a unique suggestion
  const { data, error } = await supabase.rpc("suggest_username", {
    base_name: baseName,
    user_uuid: user.id,
  });

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ suggestion: data });
});
