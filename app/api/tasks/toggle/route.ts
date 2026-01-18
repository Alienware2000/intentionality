// =============================================================================
// TASK TOGGLE API ROUTE
// Toggles the completed status of a task.
// Awards XP when completing, deducts when uncompleting.
// Integrates with gamification v2 for achievements, challenges, and bonuses.
// RLS ensures users can only toggle their own tasks.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLevelFromXpV2, getLocalDateString } from "@/app/lib/gamification";
import { awardXp } from "@/app/lib/gamification-actions";

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
 * When completing: awards XP with streak multipliers, updates stats, checks achievements.
 * When uncompleting: deducts XP.
 *
 * @authentication Required
 *
 * @body {string} taskId - UUID of the task to toggle (required)
 *
 * @returns {Object} Response object with gamification data
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
  const completionHour = new Date().getHours();

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

  const xpAmount = existing.xp_value ?? 10;
  const isHighPriority = existing.priority === "high";

  if (isCompleting) {
    // Use gamification v2 system to award XP
    const result = await awardXp({
      supabase,
      userId: user.id,
      baseXp: xpAmount,
      actionType: "task",
      isHighPriority,
      completionHour,
    });

    return NextResponse.json({
      ok: true,
      xpGained: result.xpBreakdown.totalXp,
      xpBreakdown: result.xpBreakdown,
      leveledUp: result.leveledUp,
      newLevel: result.leveledUp ? result.newLevel : undefined,
      newStreak: result.newStreak,
      newXpTotal: result.newXpTotal,
      streakMilestone: result.streakMilestone,
      achievementsUnlocked: result.achievementsUnlocked,
      challengesCompleted: result.challengesCompleted,
      bonusXp: result.bonusXp,
    });
  } else {
    // Deduct XP when unchecking
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("xp_total, level, lifetime_tasks_completed, lifetime_high_priority_completed")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newXpTotal = Math.max(0, profile.xp_total - xpAmount);
      const newLevel = getLevelFromXpV2(newXpTotal);

      // Decrement lifetime stats
      const updates: Record<string, number> = {
        xp_total: newXpTotal,
        level: newLevel,
        lifetime_tasks_completed: Math.max(0, (profile.lifetime_tasks_completed ?? 0) - 1),
      };

      if (isHighPriority) {
        updates.lifetime_high_priority_completed = Math.max(
          0,
          (profile.lifetime_high_priority_completed ?? 0) - 1
        );
      }

      await supabase
        .from("user_profiles")
        .update(updates)
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
            xp_earned: Math.max(0, activityLog.xp_earned - xpAmount),
            tasks_completed: Math.max(0, activityLog.tasks_completed - 1),
          })
          .eq("id", activityLog.id);
      }

      const levelDecreased = newLevel < profile.level;
      return NextResponse.json({
        ok: true,
        xpLost: xpAmount,
        newXpTotal,
        newLevel: levelDecreased ? newLevel : undefined,
        levelDecreased,
      });
    }

    return NextResponse.json({ ok: true });
  }
});
