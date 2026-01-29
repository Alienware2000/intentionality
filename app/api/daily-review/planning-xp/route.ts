// =============================================================================
// DAILY REVIEW PLANNING XP API ROUTE
// Awards XP for completing the planning step of the daily review.
// Requires 3+ tasks to be created for tomorrow.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { PLANNING_XP, getLevelFromXpV2 } from "@/app/lib/gamification";
import type { UserProfileV2 } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type PlanningXPBody = {
  date: string;
  tasks_created: number;
};

// -----------------------------------------------------------------------------
// POST /api/daily-review/planning-xp
// -----------------------------------------------------------------------------

/**
 * POST /api/daily-review/planning-xp
 *
 * Awards XP for completing the planning step of the daily review.
 * Requires a reflection to exist for the date and 3+ tasks to be created.
 *
 * @authentication Required
 *
 * @body {string} date - Date of the reflection (YYYY-MM-DD)
 * @body {number} tasks_created - Number of tasks created for tomorrow
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} [xpGained] - XP earned (only for new awards)
 * @returns {boolean} alreadyAwarded - Whether XP was already claimed
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<PlanningXPBody>(request);

  if (!body?.date) {
    return ApiErrors.badRequest("date is required");
  }

  if (typeof body.tasks_created !== "number" || body.tasks_created < 3) {
    return ApiErrors.badRequest("At least 3 tasks required for planning XP");
  }

  // Check if reflection exists
  const { data: reflection, error: reflectionError } = await supabase
    .from("daily_reflections")
    .select("id, planning_completed, planning_xp_awarded")
    .eq("user_id", user.id)
    .eq("date", body.date)
    .single();

  if (reflectionError?.code === "PGRST116") {
    return ApiErrors.badRequest("No reflection found for this date. Complete the review first.");
  }

  if (reflectionError) {
    return ApiErrors.serverError(reflectionError.message);
  }

  // Check if planning XP was already awarded
  if (reflection.planning_completed || (reflection.planning_xp_awarded ?? 0) > 0) {
    return successResponse({
      alreadyAwarded: true,
      xpGained: 0,
    });
  }

  // Award planning XP
  const xpToAward = PLANNING_XP.daily_planning;

  // Update reflection to mark planning as completed
  const { error: updateError } = await supabase
    .from("daily_reflections")
    .update({
      planning_completed: true,
      planning_xp_awarded: xpToAward,
    })
    .eq("id", reflection.id);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  // Update user profile with XP
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    const typedProfile = profile as UserProfileV2;
    const newXpTotal = typedProfile.xp_total + xpToAward;
    const newLevel = getLevelFromXpV2(newXpTotal);

    await supabase
      .from("user_profiles")
      .update({
        xp_total: newXpTotal,
        level: newLevel,
      })
      .eq("user_id", user.id);

    return successResponse({
      xpGained: xpToAward,
      alreadyAwarded: false,
      newLevel: newLevel > typedProfile.level ? newLevel : undefined,
    });
  }

  return successResponse({
    xpGained: xpToAward,
    alreadyAwarded: false,
  });
});
