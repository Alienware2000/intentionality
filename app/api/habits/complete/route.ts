// =============================================================================
// HABIT COMPLETE API ROUTE
// Toggles the completion status of a habit for a specific date.
// Awards XP when completing, deducts when uncompleting.
// Integrates with gamification v2 for achievements, challenges, and bonuses.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getLevelFromXpV2, getLocalDateString } from "@/app/lib/gamification";
import { awardXp } from "@/app/lib/gamification-actions";
import { addDaysISO } from "@/app/lib/date-utils";
import type { ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/habits/complete */
type CompleteHabitBody = {
  habitId?: string;
  date?: string;
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get the previous day's date string from a given date.
 */
function getYesterdayFromDate(dateStr: string): string {
  return addDaysISO(dateStr as ISODateString, -1);
}

/**
 * Recalculate the streak for a habit based on completions.
 */
async function recalculateStreak(
  supabase: SupabaseClient,
  habitId: string,
  fromDate: string
): Promise<number> {
  const { data: completions } = await supabase
    .from("habit_completions")
    .select("completed_date")
    .eq("habit_id", habitId)
    .order("completed_date", { ascending: false });

  if (!completions || completions.length === 0) {
    return 0;
  }

  let streak = 1;
  let currentDate = fromDate;

  for (let i = 1; i < completions.length; i++) {
    const expectedPrevDate = getYesterdayFromDate(currentDate);
    if (completions[i].completed_date === expectedPrevDate) {
      streak++;
      currentDate = completions[i].completed_date;
    } else {
      break;
    }
  }

  return streak;
}

// -----------------------------------------------------------------------------
// POST /api/habits/complete
// -----------------------------------------------------------------------------

/**
 * POST /api/habits/complete
 *
 * Toggles habit completion for a specific date.
 * When completing: awards XP with bonuses, updates streaks, checks achievements.
 * When uncompleting: removes completion, deducts XP.
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CompleteHabitBody>(request);
  const { habitId, date } = body ?? {};

  if (!habitId || !date) {
    return ApiErrors.badRequest("Missing habitId or date");
  }

  // Fetch habit (RLS ensures ownership)
  const { data: habit, error: habitError } = await supabase
    .from("habits")
    .select("*")
    .eq("id", habitId)
    .single();

  if (habitError || !habit) {
    return ApiErrors.notFound("Habit not found");
  }

  // Check if already completed today
  const { data: existingCompletion } = await supabase
    .from("habit_completions")
    .select("id, xp_awarded")
    .eq("habit_id", habitId)
    .eq("completed_date", date)
    .single();

  const isCompleting = !existingCompletion;

  if (isCompleting) {
    // --- COMPLETING HABIT ---

    // Calculate habit streak
    let newStreak = 1;
    if (habit.last_completed_date) {
      const yesterday = getYesterdayFromDate(date);
      if (habit.last_completed_date === yesterday) {
        newStreak = habit.current_streak + 1;
      }
    }
    const newLongestStreak = Math.max(newStreak, habit.longest_streak);

    // Insert completion record
    const { error: insertError } = await supabase
      .from("habit_completions")
      .insert({
        habit_id: habitId,
        completed_date: date,
        xp_awarded: habit.xp_value,
      });

    if (insertError) {
      return ApiErrors.serverError(insertError.message);
    }

    // Update habit streak
    await supabase
      .from("habits")
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_completed_date: date,
      })
      .eq("id", habitId);

    // Use gamification v2 system to award XP
    const result = await awardXp({
      supabase,
      userId: user.id,
      baseXp: habit.xp_value,
      actionType: "habit",
    });

    return successResponse({
      xpGained: result.xpBreakdown.totalXp,
      xpBreakdown: result.xpBreakdown,
      leveledUp: result.leveledUp,
      newStreak,
      newLevel: result.leveledUp ? result.newLevel : undefined,
      newXpTotal: result.newXpTotal,
      globalStreak: result.newStreak,
      streakMilestone: result.streakMilestone,
      achievementsUnlocked: result.achievementsUnlocked,
      challengesCompleted: result.challengesCompleted,
      bonusXp: result.bonusXp,
    });
  } else {
    // --- UNCOMPLETING HABIT ---

    const xpToDeduct = existingCompletion.xp_awarded;

    // Delete completion record
    await supabase
      .from("habit_completions")
      .delete()
      .eq("id", existingCompletion.id);

    // Handle streak recalculation if this was the last completion
    let newStreak = habit.current_streak;
    if (habit.last_completed_date === date) {
      const { data: prevCompletion } = await supabase
        .from("habit_completions")
        .select("completed_date")
        .eq("habit_id", habitId)
        .order("completed_date", { ascending: false })
        .limit(1)
        .single();

      if (prevCompletion) {
        newStreak = await recalculateStreak(
          supabase,
          habitId,
          prevCompletion.completed_date
        );
        await supabase
          .from("habits")
          .update({
            current_streak: newStreak,
            last_completed_date: prevCompletion.completed_date,
          })
          .eq("id", habitId);
      } else {
        newStreak = 0;
        await supabase
          .from("habits")
          .update({
            current_streak: 0,
            last_completed_date: null,
          })
          .eq("id", habitId);
      }
    }

    // Deduct XP from profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("xp_total, level, lifetime_habits_completed")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newXpTotal = Math.max(0, profile.xp_total - xpToDeduct);
      const newLevel = getLevelFromXpV2(newXpTotal);

      await supabase
        .from("user_profiles")
        .update({
          xp_total: newXpTotal,
          level: newLevel,
          lifetime_habits_completed: Math.max(0, (profile.lifetime_habits_completed ?? 0) - 1),
        })
        .eq("user_id", user.id);

      // Update activity log
      const today = getLocalDateString();
      const { data: activityLog } = await supabase
        .from("user_activity_log")
        .select("*")
        .eq("user_id", user.id)
        .eq("activity_date", today)
        .single();

      if (activityLog) {
        await supabase
          .from("user_activity_log")
          .update({
            xp_earned: Math.max(0, activityLog.xp_earned - xpToDeduct),
            habits_completed: Math.max(0, activityLog.habits_completed - 1),
          })
          .eq("id", activityLog.id);
      }

      const levelDecreased = newLevel < profile.level;
      return successResponse({
        xpLost: xpToDeduct,
        newStreak,
        newXpTotal,
        newLevel: levelDecreased ? newLevel : undefined,
        levelDecreased,
      });
    }

    return successResponse({ newStreak, newXpTotal: 0 });
  }
});
