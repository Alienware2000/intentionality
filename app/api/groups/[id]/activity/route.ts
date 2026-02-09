// =============================================================================
// GROUP ACTIVITY API ROUTE
// Fetches activity feed for a specific group.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  parseIntParam,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { ActivityFeedItemWithUser } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Helper: Extract group ID from request URL
// -----------------------------------------------------------------------------

function getGroupIdFromUrl(request: Request): string | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const groupsIndex = pathParts.findIndex((p) => p === "groups");
  if (groupsIndex >= 0 && pathParts.length > groupsIndex + 1) {
    return pathParts[groupsIndex + 1];
  }
  return null;
}

// -----------------------------------------------------------------------------
// GET /api/groups/[id]/activity
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]/activity
 *
 * Fetches recent activity from all group members.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @query {number} [limit=50] - Max items to return
 * @query {string} [cursor] - Pagination cursor (created_at timestamp)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {ActivityFeedItemWithUser[]} activities - Activity items with user info
 * @returns {boolean} has_more - Whether more items exist
 * @returns {string|null} next_cursor - Cursor for next page
 *
 * @throws {401} Not authenticated
 * @throws {404} Group not found or not a member
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const groupId = getGroupIdFromUrl(request);

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  const params = getSearchParams(request);
  const limit = parseIntParam(params.get("limit"), 50, 1, 100);
  const cursor = params.get("cursor");

  // Verify user is a member of this group
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return ApiErrors.notFound("Group not found or you are not a member");
  }

  // Get all member user IDs
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const memberUserIds = members?.map((m) => m.user_id) ?? [];

  if (memberUserIds.length === 0) {
    return successResponse({
      activities: [],
      has_more: false,
      next_cursor: null,
    });
  }

  // Build query for activity feed
  let query = supabase
    .from("activity_feed")
    .select("*")
    .in("user_id", memberUserIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1); // Fetch one extra to check for more

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: activities, error: activitiesError } = await query;

  if (activitiesError) {
    return ApiErrors.serverError(activitiesError.message);
  }

  // Check if there are more results
  const hasMore = (activities?.length ?? 0) > limit;
  const resultActivities = hasMore ? activities?.slice(0, limit) : activities;

  // Get profiles for all activity users
  const activityUserIds = [...new Set(resultActivities?.map((a) => a.user_id) ?? [])];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, level")
    .in("user_id", activityUserIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  // Build response with user info
  const activitiesWithUser: ActivityFeedItemWithUser[] = (resultActivities ?? []).map((a) => {
    const profile = profileMap.get(a.user_id);
    return {
      ...a,
      display_name: profile?.display_name ?? null,
      level: profile?.level ?? 1,
    };
  });

  const nextCursor = hasMore && resultActivities?.length
    ? resultActivities[resultActivities.length - 1].created_at
    : null;

  return successResponse({
    activities: activitiesWithUser,
    has_more: hasMore,
    next_cursor: nextCursor,
  });
});
