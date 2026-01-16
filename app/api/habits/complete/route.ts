// =============================================================================
// HABIT COMPLETE API ROUTE
// Toggles the completion status of a habit for a specific date.
// Awards XP when completing, deducts when uncompleting.
// Updates per-habit streak.
// =============================================================================

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLevelFromXp, getLocalDateString } from "@/app/lib/gamification";

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
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Previous day in YYYY-MM-DD format
 */
function getYesterdayFromDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/**
 * Recalculate the streak for a habit based on completions.
 * Counts consecutive days backwards from the given date.
 *
 * @param supabase - Supabase client
 * @param habitId - UUID of the habit
 * @param fromDate - Date to calculate streak from
 * @returns Number of consecutive days
 */
async function recalculateStreak(
  supabase: SupabaseClient,
  habitId: string,
  fromDate: string
): Promise<number> {
  // Fetch all completions ordered by date descending
  const { data: completions } = await supabase
    .from("habit_completions")
    .select("completed_date")
    .eq("habit_id", habitId)
    .order("completed_date", { ascending: false });

  if (!completions || completions.length === 0) {
    return 0;
  }

  // Count consecutive days
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
 * When completing: inserts completion record, updates habit streak, awards XP.
 * When uncompleting: removes completion, recalculates streak, deducts XP.
 *
 * @authentication Required
 *
 * @body {string} habitId - UUID of the habit (required)
 * @body {string} date - Date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} [xpGained] - XP gained (when completing)
 * @returns {number} [xpLost] - XP lost (when uncompleting)
 * @returns {number} newStreak - The habit's new streak
 * @returns {number} [newLevel] - New level (if leveled up)
 * @returns {number} newXpTotal - Total XP after toggle
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing habitId or date
 * @throws {404} Habit not found
 * @throws {500} Database error
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

    // Award XP to user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newXpTotal = profile.xp_total + habit.xp_value;
      const newLevel = getLevelFromXp(newXpTotal);
      const leveledUp = newLevel > profile.level;

      // Also update global streak
      const today = getLocalDateString();
      let globalStreak = profile.current_streak;
      let globalLongestStreak = profile.longest_streak;

      if (profile.last_active_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        globalStreak =
          profile.last_active_date === yesterdayStr
            ? profile.current_streak + 1
            : 1;

        if (globalStreak > globalLongestStreak) {
          globalLongestStreak = globalStreak;
        }
      }

      await supabase
        .from("user_profiles")
        .update({
          xp_total: newXpTotal,
          level: newLevel,
          current_streak: globalStreak,
          longest_streak: globalLongestStreak,
          last_active_date: today,
        })
        .eq("user_id", user.id);

      return NextResponse.json({
        ok: true,
        xpGained: habit.xp_value,
        newStreak,
        newLevel: leveledUp ? newLevel : undefined,
        newXpTotal,
      });
    }

    return NextResponse.json({ ok: true, newStreak, newXpTotal: 0 });
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
      // Find previous completion to restore last_completed_date
      const { data: prevCompletion } = await supabase
        .from("habit_completions")
        .select("completed_date")
        .eq("habit_id", habitId)
        .order("completed_date", { ascending: false })
        .limit(1)
        .single();

      if (prevCompletion) {
        // Recalculate streak from previous completion
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
        // No completions left
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
      .select("xp_total, level")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newXpTotal = Math.max(0, profile.xp_total - xpToDeduct);
      const newLevel = getLevelFromXp(newXpTotal);

      await supabase
        .from("user_profiles")
        .update({
          xp_total: newXpTotal,
          level: newLevel,
        })
        .eq("user_id", user.id);

      return NextResponse.json({
        ok: true,
        xpLost: xpToDeduct,
        newStreak,
        newXpTotal,
        newLevel,
      });
    }

    return NextResponse.json({ ok: true, newStreak, newXpTotal: 0 });
  }
});
