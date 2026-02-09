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
import type { LeaderboardEntry, LeaderboardMetric } from "@/app/lib/types";

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
 * @query {string} [metric="xp"] - Ranking metric: xp, streak, level, weekly_xp
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
  const groupId = getGroupIdFromUrl(request);

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  const params = getSearchParams(request);
  const metric = (params.get("metric") ?? "xp") as LeaderboardMetric | "weekly_xp";
  const limit = parseIntParam(params.get("limit"), 50, 1, 100);
  const offset = parseIntParam(params.get("offset"), 0, 0);

  // Validate metric
  if (!["xp", "streak", "level", "weekly_xp"].includes(metric)) {
    return ApiErrors.badRequest("Invalid metric. Use: xp, streak, level, or weekly_xp");
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
      : metric === "weekly_xp"
      ? null // weekly_xp is in group_members, not user_profiles
      : "xp_total";

  // Calculate user's rank first
  let myRank: number | null = null;
  let myValue: number | null = null;

  // For weekly_xp metric, use database-level sorting on group_members
  if (metric === "weekly_xp") {
    // Get user's weekly_xp for rank calculation
    const { data: myMembership } = await supabase
      .from("group_members")
      .select("weekly_xp")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    if (myMembership) {
      myValue = myMembership.weekly_xp;
      const { count: usersAhead } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId)
        .gt("weekly_xp", myValue);
      myRank = (usersAhead ?? 0) + 1;
    }

    // Fetch all members for this group with their weekly_xp
    const { data: allMembers, error: membersError } = await supabase
      .from("group_members")
      .select("user_id, weekly_xp")
      .eq("group_id", groupId);

    if (membersError) {
      return ApiErrors.serverError(membersError.message);
    }

    const memberUserIds = allMembers?.map((m) => m.user_id) ?? [];
    const weeklyXpMap = new Map(allMembers?.map((m) => [m.user_id, m.weekly_xp]) ?? []);

    // Fetch profiles with created_at for consistent tie-breaking
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, username, xp_total, level, current_streak, created_at")
      .in("user_id", memberUserIds);

    if (profilesError) {
      return ApiErrors.serverError(profilesError.message);
    }

    // Sort in application layer: by weekly_xp desc, then created_at asc for tie-breaking
    const sortedProfiles = (profiles ?? [])
      .map((p) => ({
        ...p,
        weekly_xp: weeklyXpMap.get(p.user_id) ?? 0,
      }))
      .sort((a, b) => {
        // Primary: weekly_xp descending
        if (b.weekly_xp !== a.weekly_xp) return b.weekly_xp - a.weekly_xp;
        // Tie-breaker: created_at ascending (older accounts rank higher)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    // Apply pagination
    const paginatedProfiles = sortedProfiles.slice(offset, offset + limit);

    // Build entries preserving the sorted order
    const paginatedEntries = paginatedProfiles.map((p, index) => ({
      rank: offset + index + 1,
      user_id: p.user_id,
      display_name: p.display_name ?? null,
      username: p.username ?? null,
      value: p.weekly_xp,
      level: p.level ?? 1,
      current_streak: p.current_streak ?? 0,
      is_current_user: p.user_id === user.id,
    }));

    return successResponse({
      entries: paginatedEntries,
      my_rank: myRank,
      total_participants: totalParticipants,
    });
  }

  // For xp, level, streak metrics - use database-level sorting on user_profiles
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
