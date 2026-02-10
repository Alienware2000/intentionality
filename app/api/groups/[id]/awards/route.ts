// =============================================================================
// GROUPS [ID] AWARDS API ROUTE
// Returns the last week's awards (podium) for a group.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";
import type { WeeklyAwards } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// XP Bonuses for Podium
// -----------------------------------------------------------------------------

const XP_BONUSES = {
  first: 25,
  second: 15,
  third: 10,
};

// -----------------------------------------------------------------------------
// GET /api/groups/[id]/awards
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]/awards
 *
 * Get the last week's awards (podium) for a group.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {WeeklyAwards | null} awards - Last week's awards or null if no history
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

  // Fetch the most recent weekly history
  const { data: history, error: historyError } = await supabase
    .from("group_weekly_history")
    .select("*")
    .eq("group_id", groupId)
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  if (historyError && historyError.code !== "PGRST116") {
    return ApiErrors.serverError(historyError.message);
  }

  if (!history) {
    return successResponse({ awards: null });
  }

  // Collect user IDs for display names
  const userIds: string[] = [];
  if (history.first_place_user_id) userIds.push(history.first_place_user_id);
  if (history.second_place_user_id) userIds.push(history.second_place_user_id);
  if (history.third_place_user_id) userIds.push(history.third_place_user_id);

  // Fetch display names
  let nameMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) ?? []);
  }

  // Build awards response
  const awards: WeeklyAwards = {
    week_start: history.week_start,
    week_end: history.week_end,
    first_place: history.first_place_user_id
      ? {
          user_id: history.first_place_user_id,
          display_name: nameMap.get(history.first_place_user_id) ?? null,
          xp: history.first_place_xp,
          xp_bonus: XP_BONUSES.first,
        }
      : null,
    second_place: history.second_place_user_id
      ? {
          user_id: history.second_place_user_id,
          display_name: nameMap.get(history.second_place_user_id) ?? null,
          xp: history.second_place_xp ?? 0,
          xp_bonus: XP_BONUSES.second,
        }
      : null,
    third_place: history.third_place_user_id
      ? {
          user_id: history.third_place_user_id,
          display_name: nameMap.get(history.third_place_user_id) ?? null,
          xp: history.third_place_xp ?? 0,
          xp_bonus: XP_BONUSES.third,
        }
      : null,
    total_group_xp: history.total_group_xp,
  };

  return successResponse({ awards });
});
