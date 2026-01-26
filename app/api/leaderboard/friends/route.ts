// =============================================================================
// FRIENDS LEADERBOARD API ROUTE
// Fetches leaderboard rankings among friends.
// This is often more motivating than global leaderboards.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { LeaderboardEntry, LeaderboardMetric } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/leaderboard/friends
// -----------------------------------------------------------------------------

/**
 * GET /api/leaderboard/friends
 *
 * Fetches leaderboard rankings among friends (including self).
 * Friends leaderboards are often more motivating than global ones.
 *
 * @authentication Required
 *
 * @query {string} [metric="xp"] - Ranking metric: xp, streak, level
 * @query {number} [limit=50] - Max results
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} leaderboard_type - "friends"
 * @returns {string} metric - The metric used for ranking
 * @returns {LeaderboardEntry[]} entries - Ranked friends (including self)
 * @returns {number|null} my_rank - Current user's rank
 * @returns {number|null} my_value - Current user's value
 * @returns {number} total_participants - Total friends + self
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const metric = (params.get("metric") ?? "xp") as LeaderboardMetric;
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "50")));

  // Validate metric
  if (!["xp", "streak", "level"].includes(metric)) {
    return ApiErrors.badRequest("Invalid metric. Use: xp, streak, or level");
  }

  // Get all accepted friends
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (friendshipsError) {
    return ApiErrors.serverError(friendshipsError.message);
  }

  // Build list of friend user IDs + self
  const friendIds = new Set<string>([user.id]); // Include self
  friendships?.forEach((f) => {
    if (f.user_id === user.id) {
      friendIds.add(f.friend_id);
    } else {
      friendIds.add(f.user_id);
    }
  });

  const userIds = Array.from(friendIds);

  // Determine the ordering column
  const orderColumn =
    metric === "streak" ? "current_streak" : metric === "level" ? "level" : "xp_total";

  // Fetch profiles for all friends + self
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, xp_total, level, current_streak")
    .in("user_id", userIds)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (profilesError) {
    return ApiErrors.serverError(profilesError.message);
  }

  const allProfiles = profiles ?? [];
  const totalParticipants = allProfiles.length;

  // Build ranked entries and find user's rank
  let myRank: number | null = null;
  let myValue: number | null = null;

  const entries: LeaderboardEntry[] = allProfiles.map((p, index) => {
    const rank = index + 1;
    const isCurrentUser = p.user_id === user.id;

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

    if (isCurrentUser) {
      myRank = rank;
      myValue = value;
    }

    return {
      rank,
      user_id: p.user_id,
      display_name: p.display_name,
      value,
      level: p.level,
      current_streak: p.current_streak,
      is_current_user: isCurrentUser,
      is_friend: !isCurrentUser, // All non-self entries are friends
    };
  });

  // Calculate "X away from friend Y" hints for motivation
  // (This could be enhanced to show relative positioning)

  return successResponse({
    leaderboard_type: "friends",
    metric,
    period_start: null,
    entries,
    my_rank: myRank,
    my_value: myValue,
    total_participants: totalParticipants,
  });
});
