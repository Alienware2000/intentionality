// =============================================================================
// GLOBAL LEADERBOARD API ROUTE
// Fetches global rankings for all users.
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
// GET /api/leaderboard/global
// -----------------------------------------------------------------------------

/**
 * GET /api/leaderboard/global
 *
 * Fetches global leaderboard rankings for all users.
 *
 * @authentication Required
 *
 * @query {string} [metric="xp"] - Ranking metric: xp, streak, level
 * @query {string} [period="alltime"] - Time period: alltime, weekly, monthly
 * @query {number} [limit=50] - Max results (max 100)
 * @query {number} [offset=0] - Pagination offset
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} leaderboard_type - "global"
 * @returns {string} metric - The metric used for ranking
 * @returns {LeaderboardEntry[]} entries - Ranked users
 * @returns {number|null} my_rank - Current user's rank
 * @returns {number|null} my_value - Current user's value for the metric
 * @returns {number} total_participants - Total users on leaderboard
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const metric = (params.get("metric") ?? "xp") as LeaderboardMetric;
  // Note: period parameter is accepted but not yet implemented - always returns alltime
  // const period = params.get("period") ?? "alltime";
  const limit = parseIntParam(params.get("limit"), 50, 1, 100);
  const offset = parseIntParam(params.get("offset"), 0, 0);

  // Validate metric
  if (!["xp", "streak", "level"].includes(metric)) {
    return ApiErrors.badRequest("Invalid metric. Use: xp, streak, or level");
  }

  // Determine the ordering column
  const orderColumn = metric === "streak" ? "current_streak" : metric === "level" ? "level" : "xp_total";

  // Get total count of all users on the leaderboard
  // Note: All users are shown by default. Privacy opt-out can be added later
  // via a separate RLS policy that allows reading the opt-out status.
  const { count: totalParticipants, error: countError } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true });

  if (countError) {
    return ApiErrors.serverError(countError.message);
  }

  // Find current user's rank
  let myRank: number | null = null;
  let myValue: number | null = null;

  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("xp_total, level, current_streak, created_at")
    .eq("user_id", user.id)
    .single();

  if (myProfile) {
    myValue =
      metric === "streak"
        ? myProfile.current_streak
        : metric === "level"
        ? myProfile.level
        : myProfile.xp_total;

    // Count users with higher values to determine rank
    // For ties, users who joined earlier rank higher
    const { count: usersAhead } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gt(orderColumn, myValue);

    myRank = (usersAhead ?? 0) + 1;
  }

  // Fetch all users with pagination
  const { data: paginatedProfiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, username, xp_total, level, current_streak, created_at")
    .order(orderColumn, { ascending: false })
    .order("created_at", { ascending: true }) // Tie-breaker for stable rankings
    .range(offset, offset + limit - 1);

  if (profilesError) {
    return ApiErrors.serverError(profilesError.message);
  }

  // Build ranked entries
  const entries: LeaderboardEntry[] = (paginatedProfiles ?? []).map((p, index) => {
    const rank = offset + index + 1;
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
      rank,
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
    leaderboard_type: "global",
    metric,
    period_start: null,
    entries,
    my_rank: myRank,
    my_value: myValue,
    total_participants: totalParticipants,
  });
});
