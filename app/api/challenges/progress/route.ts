// =============================================================================
// CHALLENGE PROGRESS API
// POST: Update challenge progress based on user action.
// Called internally by toggle routes when actions are completed.
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
  DAILY_SWEEP_BONUS,
} from "@/app/lib/challenges";
import { getLocalDateString, calculateXpWithBonuses } from "@/app/lib/gamification";
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

  // Calculate bonus XP if daily sweep achieved
  let sweepXpAwarded = 0;
  if (dailySweep) {
    // Get user's streak for multiplier
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("current_streak, permanent_xp_bonus")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const xpBreakdown = calculateXpWithBonuses(
        DAILY_SWEEP_BONUS,
        profile.current_streak,
        profile.permanent_xp_bonus || 1.0
      );
      sweepXpAwarded = xpBreakdown.totalXp;

      // Award sweep bonus XP
      await supabase.rpc("increment_xp", {
        user_id: user.id,
        amount: sweepXpAwarded,
      });
    }
  }

  // Calculate total XP from completed challenges
  const dailyXp = dailyCompleted.reduce(
    (sum, c) => sum + (c.xp_awarded || 0),
    0
  );
  const weeklyXp = weeklyCompleted?.xp_awarded || 0;

  return successResponse({
    dailyChallengesCompleted: dailyCompleted,
    weeklyChallengeCompleted: weeklyCompleted,
    dailySweep,
    xpAwarded: {
      daily: dailyXp,
      weekly: weeklyXp,
      sweep: sweepXpAwarded,
      total: dailyXp + weeklyXp + sweepXpAwarded,
    },
  });
});
