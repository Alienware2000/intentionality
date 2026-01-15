// =============================================================================
// TASK TOGGLE API ROUTE
// Toggles the completed status of a task.
// Awards XP when completing a task.
// RLS ensures users can only toggle their own tasks.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getLevelFromXp, getLocalDateString } from "@/app/lib/gamification";

/**
 * POST /api/tasks/toggle
 *
 * Toggles the completed status of a task.
 * When completing a task, awards XP and updates streak.
 *
 * Request body:
 * - taskId: string (required) - UUID of the task to toggle
 *
 * Returns:
 * - ok: boolean
 * - xpGained?: number (when completing task)
 * - newLevel?: number (if leveled up)
 *
 * RLS ensures the task belongs to a quest owned by the user.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // Verify authentication
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

  // Parse request body
  const { taskId } = (await req.json()) as { taskId?: string };

  if (!taskId) {
    return NextResponse.json(
      { ok: false, error: "Missing taskId" },
      { status: 400 }
    );
  }

  // Fetch the current task state (RLS will return null if not owned by user)
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("id, completed, xp_value, priority")
    .eq("id", taskId)
    .single();

  if (fetchError || !existing) {
    // Don't reveal whether task exists but belongs to someone else
    return NextResponse.json(
      { ok: false, error: "Task not found" },
      { status: 404 }
    );
  }

  const isCompleting = !existing.completed;
  const now = new Date().toISOString();
  const today = getLocalDateString();

  // Toggle the completed status
  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      completed: isCompleting,
      completed_at: isCompleting ? now : null,
    })
    .eq("id", taskId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  // Fetch current profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ ok: true });
  }

  const xpAmount = existing.xp_value ?? 10;

  if (isCompleting) {
    // Award XP and update streak
    const newXpTotal = profile.xp_total + xpAmount;
    const newLevel = getLevelFromXp(newXpTotal);
    const leveledUp = newLevel > profile.level;

    // Check streak
    let newStreak = profile.current_streak;
    let newLongestStreak = profile.longest_streak;

    if (profile.last_active_date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      if (profile.last_active_date === yesterdayStr) {
        newStreak = profile.current_streak + 1;
      } else {
        newStreak = 1;
      }

      if (newStreak > newLongestStreak) {
        newLongestStreak = newStreak;
      }
    }

    await supabase
      .from("user_profiles")
      .update({
        xp_total: newXpTotal,
        level: newLevel,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_active_date: today,
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      xpGained: xpAmount,
      newLevel: leveledUp ? newLevel : undefined,
      newStreak,
      newXpTotal,
    });
  } else {
    // Deduct XP when unchecking
    const newXpTotal = Math.max(0, profile.xp_total - xpAmount);
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
      xpLost: xpAmount,
      newXpTotal,
      newLevel,
    });
  }
}
