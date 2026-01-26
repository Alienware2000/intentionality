// =============================================================================
// FRIENDS SEARCH API ROUTE
// Search for users to add as friends by display name.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { UserSearchResult, LevelTitle } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/friends/search
// -----------------------------------------------------------------------------

/**
 * GET /api/friends/search?q=query
 *
 * Search for users by display name.
 * Returns users who have opted into global visibility or have public profiles.
 *
 * @authentication Required
 *
 * @query {string} q - Search query (min 2 characters)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {UserSearchResult[]} users - Array of matching users
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing or too short query
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const query = params.get("q");

  if (!query || query.length < 2) {
    return ApiErrors.badRequest("Search query must be at least 2 characters");
  }

  // Search for users with matching display names
  // Only return users who have opted into being discoverable
  const { data: profiles, error: searchError } = await supabase
    .from("user_profiles")
    .select(`
      user_id,
      display_name,
      level,
      current_streak,
      title
    `)
    .ilike("display_name", `%${query}%`)
    .neq("user_id", user.id) // Exclude self
    .limit(20);

  if (searchError) {
    return ApiErrors.serverError(searchError.message);
  }

  if (!profiles || profiles.length === 0) {
    return successResponse({ users: [] });
  }

  // Get privacy settings for these users
  const userIds = profiles.map((p) => p.user_id);
  const { data: privacySettings } = await supabase
    .from("user_privacy_settings")
    .select("user_id, profile_visibility, allow_friend_requests")
    .in("user_id", userIds);

  const privacyMap = new Map(
    privacySettings?.map((p) => [p.user_id, p]) ?? []
  );

  // Get existing friendships with these users
  const { data: existingFriendships } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(
      userIds
        .map(
          (id) =>
            `and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`
        )
        .join(",")
    );

  // Build friendship status map
  const friendshipMap = new Map<string, { is_friend: boolean; has_pending: boolean }>();
  existingFriendships?.forEach((f) => {
    const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
    friendshipMap.set(otherId, {
      is_friend: f.status === "accepted",
      has_pending: f.status === "pending",
    });
  });

  // Filter and map results
  const users: UserSearchResult[] = profiles
    .filter((p) => {
      // Check if user allows being found
      const privacy = privacyMap.get(p.user_id);
      // Default: allow if no privacy settings or not explicitly private
      if (!privacy) return true;
      return privacy.profile_visibility !== "private";
    })
    .map((p) => {
      const friendship = friendshipMap.get(p.user_id);
      return {
        user_id: p.user_id,
        display_name: p.display_name,
        level: p.level,
        current_streak: p.current_streak,
        title: (p.title as LevelTitle) ?? "Novice",
        is_friend: friendship?.is_friend ?? false,
        has_pending_request: friendship?.has_pending ?? false,
      };
    });

  return successResponse({ users });
});
