// =============================================================================
// GLOBAL LEADERBOARD API ROUTE
// Fetches global rankings for all users.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { LeaderboardEntry, LeaderboardType, LeaderboardMetric } from "@/app/lib/types";

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
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "50")));
  const offset = Math.max(0, parseInt(params.get("offset") ?? "0"));

  // Validate metric
  if (!["xp", "streak", "level"].includes(metric)) {
    return ApiErrors.badRequest("Invalid metric. Use: xp, streak, or level");
  }

  // Determine the ordering column
  const orderColumn = metric === "streak" ? "current_streak" : metric === "level" ? "level" : "xp_total";

  // Fetch ALL user profiles, ordered by the metric
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, xp_total, level, current_streak")
    .order(orderColumn, { ascending: false });

  if (profilesError) {
    return ApiErrors.serverError(profilesError.message);
  }

  const allProfiles = profiles ?? [];
  const totalParticipants = allProfiles.length;

  // Find current user's rank
  let myRank: number | null = null;
  let myValue: number | null = null;

  const myIndex = allProfiles.findIndex((p) => p.user_id === user.id);
  if (myIndex >= 0) {
    myRank = myIndex + 1;
    const myProfile = allProfiles[myIndex];
    myValue =
      metric === "streak"
        ? myProfile.current_streak
        : metric === "level"
        ? myProfile.level
        : myProfile.xp_total;
  }

  // Paginate the results
  const paginatedProfiles = allProfiles.slice(offset, offset + limit);

  // Build ranked entries
  const entries: LeaderboardEntry[] = paginatedProfiles.map((p, index) => {
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
      value,
      level: p.level,
      current_streak: p.current_streak,
      is_current_user: p.user_id === user.id,
    };
  });

  return successResponse({
    leaderboard_type: "global" as LeaderboardType,
    metric,
    period_start: null,
    entries,
    my_rank: myRank,
    my_value: myValue,
    total_participants: totalParticipants,
  });
});
