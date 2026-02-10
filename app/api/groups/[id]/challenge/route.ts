// =============================================================================
// GROUPS [ID] CHALLENGE API ROUTE
// Returns the current week's challenge for a group.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";
import { getWeekStartUTC } from "@/app/lib/date-utils";
import type { GroupChallenge } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/groups/[id]/challenge
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]/challenge
 *
 * Get the current week's challenge for a group.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {GroupChallenge | null} challenge - Current challenge or null
 * @returns {number} progress_percentage - 0-100 progress percentage
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

  const weekStart = getWeekStartUTC();

  // Fetch current challenge
  const { data: challenge, error: challengeError } = await supabase
    .from("group_challenges")
    .select("*")
    .eq("group_id", groupId)
    .eq("week_start", weekStart)
    .single();

  if (challengeError && challengeError.code !== "PGRST116") {
    // PGRST116 = no rows returned
    return ApiErrors.serverError(challengeError.message);
  }

  // Calculate progress percentage
  let progressPercentage = 0;
  if (challenge) {
    progressPercentage = Math.min(
      100,
      Math.round((challenge.current_progress / challenge.target_value) * 100)
    );
  }

  return successResponse({
    challenge: challenge as GroupChallenge | null,
    progress_percentage: progressPercentage,
  });
});
