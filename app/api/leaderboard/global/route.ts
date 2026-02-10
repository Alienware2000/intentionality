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

  // Get user IDs that have explicitly opted OUT of the global leaderboard
  // Design: Users appear by default, only hide those who explicitly set show_on_global_leaderboard: false
  const { data: optedOutUsers, error: privacyError } = await supabase
    .from("user_privacy_settings")
    .select("user_id")
    .eq("show_on_global_leaderboard", false);

  if (privacyError) {
    return ApiErrors.serverError(privacyError.message);
  }

  const optedOutUserIds = (optedOutUsers ?? []).map((u) => u.user_id);

  // Get total count of users (excluding opted-out)
  let countQuery = supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true });

  if (optedOutUserIds.length > 0) {
    countQuery = countQuery.not("user_id", "in", `(${optedOutUserIds.join(",")})`);
  }

  const { count: totalParticipants, error: countError } = await countQuery;

  if (countError) {
    return ApiErrors.serverError(countError.message);
  }

  // Find current user's rank (only if they haven't opted out)
  let myRank: number | null = null;
  let myValue: number | null = null;

  const { data: myProfile } = await supabase
    .from("user_profiles")
    .select("xp_total, level, current_streak, created_at")
    .eq("user_id", user.id)
    .single();

  // Check if current user has opted out of global leaderboard
  const userOptedOut = optedOutUserIds.includes(user.id);

  if (myProfile && !userOptedOut) {
    myValue =
      metric === "streak"
        ? myProfile.current_streak
        : metric === "level"
        ? myProfile.level
        : myProfile.xp_total;

    // Count users (excluding opted-out) with higher values to determine rank
    let rankQuery = supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gt(orderColumn, myValue);

    if (optedOutUserIds.length > 0) {
      rankQuery = rankQuery.not("user_id", "in", `(${optedOutUserIds.join(",")})`);
    }

    const { count: usersAhead } = await rankQuery;

    myRank = (usersAhead ?? 0) + 1;
  }

  // Fetch all users with pagination, excluding opted-out users
  let profilesQuery = supabase
    .from("user_profiles")
    .select("user_id, display_name, username, xp_total, level, current_streak, created_at")
    .order(orderColumn, { ascending: false })
    .order("created_at", { ascending: true }) // Tie-breaker for stable rankings
    .range(offset, offset + limit - 1);

  if (optedOutUserIds.length > 0) {
    profilesQuery = profilesQuery.not("user_id", "in", `(${optedOutUserIds.join(",")})`);
  }

  const { data: paginatedProfiles, error: profilesError } = await profilesQuery;

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
