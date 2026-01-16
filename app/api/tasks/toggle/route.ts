// =============================================================================
// TASK TOGGLE API ROUTE
// Toggles the completed status of a task.
// Awards XP when completing, deducts when uncompleting.
// RLS ensures users can only toggle their own tasks.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLevelFromXp, getLocalDateString } from "@/app/lib/gamification";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/tasks/toggle */
type ToggleTaskBody = {
  taskId?: string;
};

// -----------------------------------------------------------------------------
// POST /api/tasks/toggle
// -----------------------------------------------------------------------------

/**
 * POST /api/tasks/toggle
 *
 * Toggles the completed status of a task.
 * When completing a task, awards XP and updates streak.
 * When uncompleting, deducts XP.
 *
 * @authentication Required
 *
 * @body {string} taskId - UUID of the task to toggle (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} [xpGained] - XP gained (when completing)
 * @returns {number} [xpLost] - XP lost (when uncompleting)
 * @returns {number} [newLevel] - New level (if leveled up)
 * @returns {number} [newStreak] - Current streak (when completing)
 * @returns {number} newXpTotal - Total XP after toggle
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing taskId
 * @throws {404} Task not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<ToggleTaskBody>(request);
  const taskId = body?.taskId;

  if (!taskId) {
    return ApiErrors.badRequest("Missing taskId");
  }

  // Fetch the current task state (RLS will return null if not owned by user)
  // Only allow toggling non-deleted tasks
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("id, completed, xp_value, priority")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !existing) {
    // Don't reveal whether task exists but belongs to someone else
    return ApiErrors.notFound("Task not found");
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
    return ApiErrors.serverError(updateError.message);
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

    // Calculate streak
    let newStreak = profile.current_streak;
    let newLongestStreak = profile.longest_streak;

    if (profile.last_active_date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      // Increment streak if active yesterday, otherwise reset to 1
      newStreak =
        profile.last_active_date === yesterdayStr
          ? profile.current_streak + 1
          : 1;

      // Update longest streak if new record
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
});
