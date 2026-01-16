// =============================================================================
// HABIT COMPLETE API ROUTE
// Toggles the completion status of a habit for a specific date.
// Awards XP when completing, deducts when uncompleting.
// Updates per-habit streak.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getLevelFromXp, getLocalDateString } from "@/app/lib/gamification";

/**
 * POST /api/habits/complete
 *
 * Toggles habit completion for a specific date.
 *
 * Request body:
 * - habitId: string (required)
 * - date: string (required) - YYYY-MM-DD format
 *
 * Returns:
 * - ok: boolean
 * - xpGained?: number (when completing)
 * - xpLost?: number (when uncompleting)
 * - newStreak: number (the habit's new streak)
 * - newLevel?: number (if user leveled up)
 * - newXpTotal: number
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { habitId, date } = body as { habitId?: string; date?: string };

    if (!habitId || !date) {
      return NextResponse.json(
        { ok: false, error: "Missing habitId or date" },
        { status: 400 }
      );
    }

    // Fetch habit (RLS ensures ownership)
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("*")
      .eq("id", habitId)
      .single();

    if (habitError || !habit) {
      return NextResponse.json(
        { ok: false, error: "Habit not found" },
        { status: 404 }
      );
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
      // Calculate habit streak
      let newStreak = 1;
      if (habit.last_completed_date) {
        const yesterday = getYesterdayFromDate(date);
        if (habit.last_completed_date === yesterday) {
          newStreak = habit.current_streak + 1;
        }
      }
      const newLongestStreak = Math.max(newStreak, habit.longest_streak);

      // Insert completion
      const { error: insertError } = await supabase
        .from("habit_completions")
        .insert({
          habit_id: habitId,
          completed_date: date,
          xp_awarded: habit.xp_value,
        });

      if (insertError) {
        return NextResponse.json(
          { ok: false, error: insertError.message },
          { status: 500 }
        );
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

          if (profile.last_active_date === yesterdayStr) {
            globalStreak = profile.current_streak + 1;
          } else {
            globalStreak = 1;
          }

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
      // Uncompleting - delete completion and deduct XP
      const xpToDeduct = existingCompletion.xp_awarded;

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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * Get the previous day's date string from a given date.
 */
function getYesterdayFromDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/**
 * Recalculate the streak for a habit based on completions.
 * Counts consecutive days backwards from the given date.
 */
async function recalculateStreak(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
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
