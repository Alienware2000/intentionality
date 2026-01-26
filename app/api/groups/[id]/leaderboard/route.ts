// =============================================================================
// GROUP LEADERBOARD API ROUTE
// Fetches leaderboard rankings for a specific group.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getTitleForLevel } from "@/app/lib/gamification";
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

  // Fetch all members with their weekly_xp
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("user_id, weekly_xp")
    .eq("group_id", groupId);

  if (membersError) {
    return ApiErrors.serverError(membersError.message);
  }

  const memberUserIds = members?.map((m) => m.user_id) ?? [];
  const weeklyXpMap = new Map(members?.map((m) => [m.user_id, m.weekly_xp]) ?? []);

  if (memberUserIds.length === 0) {
    return successResponse({
      entries: [],
      my_rank: null,
      total_participants: 0,
    });
  }

  // Fetch profiles for all members
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, xp_total, level, current_streak")
    .in("user_id", memberUserIds);

  if (profilesError) {
    return ApiErrors.serverError(profilesError.message);
  }

  // Build and sort entries by the selected metric
  type ProfileEntry = {
    user_id: string;
    display_name: string | null;
    xp_total: number;
    level: number;
    current_streak: number;
    title: string;
    weekly_xp: number;
  };

  const profileEntries: ProfileEntry[] = (profiles ?? []).map((p) => ({
    ...p,
    title: getTitleForLevel(p.level),
    weekly_xp: weeklyXpMap.get(p.user_id) ?? 0,
  }));

  // Sort by metric
  profileEntries.sort((a, b) => {
    switch (metric) {
      case "xp":
        return b.xp_total - a.xp_total;
      case "streak":
        return b.current_streak - a.current_streak;
      case "level":
        return b.level - a.level;
      case "weekly_xp":
        return b.weekly_xp - a.weekly_xp;
      default:
        return b.xp_total - a.xp_total;
    }
  });

  // Build ranked entries
  let myRank: number | null = null;
  const entries: LeaderboardEntry[] = profileEntries.map((p, index) => {
    const rank = index + 1;
    const isCurrentUser = p.user_id === user.id;

    if (isCurrentUser) {
      myRank = rank;
    }

    let value: number;
    switch (metric) {
      case "xp":
        value = p.xp_total;
        break;
      case "streak":
        value = p.current_streak;
        break;
      case "level":
        value = p.level;
        break;
      case "weekly_xp":
        value = p.weekly_xp;
        break;
      default:
        value = p.xp_total;
    }

    return {
      rank,
      user_id: p.user_id,
      display_name: p.display_name,
      value,
      level: p.level,
      current_streak: p.current_streak,
      is_current_user: isCurrentUser,
    };
  });

  return successResponse({
    entries,
    my_rank: myRank,
    total_participants: entries.length,
  });
});
