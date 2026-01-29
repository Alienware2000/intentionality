// =============================================================================
// CHALLENGE PROGRESS API
// POST: Update challenge progress based on user action.
// Called internally by toggle routes when actions are completed.
//
// NOTE: Daily sweep bonus has been removed as part of XP transparency redesign.
// Challenge XP is awarded when individual challenges complete, not as a hidden sweep bonus.
// =============================================================================

import {
  withAuth,
  successResponse,
  ApiErrors,
  parseJsonBody,
} from "@/app/lib/auth-middleware";
import {
  updateDailyChallengeProgress,
  updateWeeklyChallengeProgress,
  checkAllHabitsChallenge,
} from "@/app/lib/challenges";
import { getLocalDateString } from "@/app/lib/gamification";
import { getWeekStartDate } from "@/app/lib/challenges";

type ProgressBody = {
  actionType: "tasks" | "focus" | "habits" | "high_priority";
  incrementValue: number;
  date?: string;
};

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<ProgressBody>(request);

  if (!body?.actionType || typeof body.incrementValue !== "number") {
    return ApiErrors.badRequest("actionType and incrementValue are required");
  }

  const date = body.date || getLocalDateString();
  const weekStart = getWeekStartDate(new Date(date));

  // Update daily challenge progress
  const { completed: dailyCompleted, dailySweep } = await updateDailyChallengeProgress(
    supabase,
    user.id,
    body.actionType,
    body.incrementValue,
    date
  );

  // Check for "complete all habits" challenge if relevant
  let allHabitsChallenge = null;
  if (body.actionType === "habits") {
    allHabitsChallenge = await checkAllHabitsChallenge(supabase, user.id, date);
    if (allHabitsChallenge) {
      dailyCompleted.push(allHabitsChallenge);
    }
  }

  // Map action type to weekly challenge type
  const weeklyActionType = body.actionType === "high_priority" ? "tasks" : body.actionType;

  // Update weekly challenge progress
  const weeklyCompleted = await updateWeeklyChallengeProgress(
    supabase,
    user.id,
    weeklyActionType,
    body.incrementValue,
    weekStart
  );

  // Calculate total XP from completed challenges
  // NOTE: Sweep bonus removed - XP comes from individual challenge completions only
  const dailyXp = dailyCompleted.reduce(
    (sum, c) => sum + (c.xp_awarded || 0),
    0
  );
  const weeklyXp = weeklyCompleted?.xp_awarded || 0;

  return successResponse({
    dailyChallengesCompleted: dailyCompleted,
    weeklyChallengeCompleted: weeklyCompleted,
    dailySweep, // Still track for UI purposes, but no bonus XP
    xpAwarded: {
      daily: dailyXp,
      weekly: weeklyXp,
      total: dailyXp + weeklyXp,
    },
  });
});
