// =============================================================================
// GROUP LEADERBOARD API ROUTE
// Fetches leaderboard rankings for a specific group.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  parseIntParam,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";
import type { LeaderboardEntry, LeaderboardMetric } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/groups/[id]/leaderboard
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]/leaderboard
 *
 * Fetches leaderboard rankings for group members.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @query {string} [metric="xp"] - Ranking metric: xp, streak, level
 * @query {number} [limit=50] - Max results
 * @query {number} [offset=0] - Pagination offset
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {LeaderboardEntry[]} entries - Ranked members
 * @returns {number|null} my_rank - Current user's rank (if member)
 * @returns {number} total_participants - Total members in ranking
 *
 * @throws {401} Not authenticated
 * @throws {404} Group not found or not a member
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  const params = getSearchParams(request);
  const metric = (params.get("metric") ?? "xp") as LeaderboardMetric;
  const limit = parseIntParam(params.get("limit"), 50, 1, 100);
  const offset = parseIntParam(params.get("offset"), 0, 0);

  // Validate metric
  if (!["xp", "streak", "level"].includes(metric)) {
    return ApiErrors.badRequest("Invalid metric. Use: xp, streak, or level");
  }

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

  // Get total member count for pagination info
  const { count: totalParticipants, error: countError } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (countError) {
    return ApiErrors.serverError(countError.message);
  }

  if (!totalParticipants || totalParticipants === 0) {
    return successResponse({
      entries: [],
      my_rank: null,
      total_participants: 0,
    });
  }

  // Determine the ordering column for user_profiles
  const orderColumn =
    metric === "streak"
      ? "current_streak"
      : metric === "level"
      ? "level"
      : "xp_total";

  // Calculate user's rank first
  let myRank: number | null = null;
  let myValue: number | null = null;

  // Fetch all member user_ids (needed for the IN filter)
  // First get all member user_ids (needed for the IN filter)
  const { data: allMembers, error: membersError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (membersError) {
    return ApiErrors.serverError(membersError.message);
  }

  const memberUserIds = allMembers?.map((m) => m.user_id) ?? [];

  // Get user's profile for rank calculation
  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("xp_total, level, current_streak")
    .eq("user_id", user.id)
    .single();

  if (myProfile && orderColumn) {
    myValue =
      metric === "streak"
        ? myProfile.current_streak
        : metric === "level"
        ? myProfile.level
        : myProfile.xp_total;

    // Count members with higher values
    const { count: usersAhead } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .in("user_id", memberUserIds)
      .gt(orderColumn, myValue);
    myRank = (usersAhead ?? 0) + 1;
  }

  // Fetch paginated profiles sorted by metric at database level
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, username, xp_total, level, current_streak, created_at")
    .in("user_id", memberUserIds)
    .order(orderColumn!, { ascending: false })
    .order("created_at", { ascending: true }) // Tie-breaker for stable rankings
    .range(offset, offset + limit - 1);

  if (profilesError) {
    return ApiErrors.serverError(profilesError.message);
  }

  // Build entries
  const entries: LeaderboardEntry[] = (profiles ?? []).map((p, index) => {
    let value: number;
    switch (metric) {
      case "streak":
        value = p.current_streak;
        break;
      case "level":
        value = p.level;
        break;
      default:
        value = p.xp_total;
    }

    return {
      rank: offset + index + 1,
      user_id: p.user_id,
      display_name: p.display_name,
      username: p.username,
      value,
      level: p.level,
      current_streak: p.current_streak,
      is_current_user: p.user_id === user.id,
    };
  });

  return successResponse({
    entries,
    my_rank: myRank,
    total_participants: totalParticipants,
  });
});
