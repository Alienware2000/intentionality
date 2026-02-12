// =============================================================================
// TASK TOGGLE API ROUTE
// Toggles the completed status of a task.
// Awards XP when completing, deducts when uncompleting.
//
// XP TRANSPARENCY:
// - xpGained = flat 15 XP for all tasks (anti-XP-farming)
// - challengeXp = XP from any challenges completed (celebrated separately)
// - achievementXp = XP from any achievements unlocked (celebrated separately)
// - last_xp_awarded stores base XP for accurate deduction
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLevelFromXpV2, getLocalDateString } from "@/app/lib/gamification";
import { awardXp } from "@/app/lib/gamification-actions";
import { markOnboardingStepComplete } from "@/app/lib/onboarding";

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
 * When completing: awards flat 15 XP (anti-XP-farming), checks challenges/achievements.
 * When uncompleting: deducts exactly the base XP that was awarded.
 *
 * XP Transparency:
 * - xpGained: Flat 15 XP for all tasks (priorities no longer affect XP)
 * - challengeXp: Separate XP from any completed challenges
 * - achievementXp: Separate XP from any unlocked achievements
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
    .select("id, completed, xp_value, priority, last_xp_awarded")
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

  const xpAmount = existing.xp_value ?? 15;
  // Track high priority for challenge/achievement checks (not for XP bonus)
  const isHighPriority = existing.priority === "high";

  if (isCompleting) {
    // Use gamification v2 system to award XP (flat XP, priority only for challenges)
    const result = await awardXp({
      supabase,
      userId: user.id,
      baseXp: xpAmount,
      actionType: "task",
      isHighPriority, // Used for challenge tracking, not XP calculation
      completionHour,
    });

    // Store the actual XP awarded for accurate deduction when uncompleting
    await supabase
      .from("tasks")
      .update({ last_xp_awarded: result.actionTotalXp })
      .eq("id", taskId);

    // Mark onboarding step complete (fire-and-forget)
    markOnboardingStepComplete(supabase, user.id, "complete_task").catch(() => {});

    // XP TRANSPARENCY: Return separate XP values for clear celebration
    return NextResponse.json({
      ok: true,
      // Base task XP (no hidden multipliers) - for main "+X XP" animation
      xpGained: result.actionTotalXp,
      // Challenge XP (celebrated with toast) - from any completed challenges
      challengeXp: result.bonusXp.challengeXp ?? 0,
      // Achievement XP (celebrated with modal) - from any unlocked achievements
      achievementXp: result.bonusXp.achievementXp ?? 0,
      // Legacy fields for compatibility
      xpBreakdown: result.xpBreakdown,
      leveledUp: result.leveledUp,
      newLevel: result.leveledUp ? result.newLevel : undefined,
      newStreak: result.newStreak,
      newXpTotal: result.newXpTotal,
      achievementsUnlocked: result.achievementsUnlocked,
      challengesCompleted: result.challengesCompleted,
    });
  } else {
    // Deduct XP when unchecking
    // Use stored XP if available, fallback to base for backwards compatibility
    const xpToDeduct = existing.last_xp_awarded ?? xpAmount;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("xp_total, level, lifetime_tasks_completed, lifetime_high_priority_completed")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newXpTotal = Math.max(0, profile.xp_total - xpToDeduct);
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

      // Clear stored XP when uncompleting
      await supabase
        .from("tasks")
        .update({ last_xp_awarded: null })
        .eq("id", taskId);

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
            tasks_completed: Math.max(0, activityLog.tasks_completed - 1),
          })
          .eq("id", activityLog.id);
      }

      const levelDecreased = newLevel < profile.level;
      return NextResponse.json({
        ok: true,
        xpLost: xpToDeduct,
        newXpTotal,
        newLevel: levelDecreased ? newLevel : undefined,
        levelDecreased,
      });
    }

    return NextResponse.json({ ok: true });
  }
});
