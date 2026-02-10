// =============================================================================
// GROUPS [ID] HISTORY API ROUTE
// Returns weekly history for a group including past winners.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";
import type { GroupWeeklyHistoryWithNames } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/groups/[id]/history
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]/history
 *
 * Get weekly history for a group including past winners.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @query {number} [limit=10] - Number of weeks to return
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {GroupWeeklyHistoryWithNames[]} history - Array of weekly history
 *
 * @throws {401} Not authenticated
 * @throws {403} Not a member
 * @throws {404} Group not found
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  // Parse limit from query
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 52);

  // Check if user is a member
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return ApiErrors.notFound("Group not found");
  }

  // Fetch weekly history
  const { data: historyData, error: historyError } = await supabase
    .from("group_weekly_history")
    .select("*")
    .eq("group_id", groupId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (historyError) {
    return ApiErrors.serverError(historyError.message);
  }

  // Collect all user IDs for display names
  const userIds = new Set<string>();
  for (const h of historyData ?? []) {
    if (h.first_place_user_id) userIds.add(h.first_place_user_id);
    if (h.second_place_user_id) userIds.add(h.second_place_user_id);
    if (h.third_place_user_id) userIds.add(h.third_place_user_id);
  }

  // Fetch display names
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", Array.from(userIds));

  const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) ?? []);

  // Build response with names
  const history: GroupWeeklyHistoryWithNames[] = (historyData ?? []).map((h) => ({
    ...h,
    first_place_name: h.first_place_user_id ? nameMap.get(h.first_place_user_id) ?? null : null,
    second_place_name: h.second_place_user_id ? nameMap.get(h.second_place_user_id) ?? null : null,
    third_place_name: h.third_place_user_id ? nameMap.get(h.third_place_user_id) ?? null : null,
  }));

  return successResponse({ history });
});
