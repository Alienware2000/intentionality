// =============================================================================
// TASK RESTORE API ROUTE
// Restores a soft-deleted task by clearing the deleted_at timestamp.
// RLS ensures users can only restore their own tasks.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLevelFromXpV2 } from "@/app/lib/gamification";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/tasks/restore */
type RestoreTaskBody = {
  taskId?: string;
};

// -----------------------------------------------------------------------------
// POST /api/tasks/restore
// -----------------------------------------------------------------------------

/**
 * POST /api/tasks/restore
 *
 * Restores a soft-deleted task by clearing the deleted_at timestamp.
 * If the task was completed before deletion, XP is re-awarded.
 *
 * @authentication Required
 *
 * @body {string} taskId - UUID of the task to restore (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Task} task - The restored task
 * @returns {number} [newXpTotal] - New XP total after restoration
 * @returns {number} [newLevel] - New level after restoration
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing taskId
 * @throws {404} Task not found or not deleted
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<RestoreTaskBody>(request);
  const taskId = body?.taskId;

  if (!taskId) {
    return ApiErrors.badRequest("Missing taskId");
  }

  // Fetch the deleted task (must have deleted_at set)
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*, quest:quests(*)")
    .eq("id", taskId)
    .not("deleted_at", "is", null)
    .single();

  if (fetchError || !task) {
    return ApiErrors.notFound("Deleted task not found");
  }

  // Restore the task by clearing deleted_at
  const { data: restoredTask, error: updateError } = await supabase
    .from("tasks")
    .update({ deleted_at: null })
    .eq("id", taskId)
    .select("*, quest:quests(*)")
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  // If task was completed, re-award XP
  let newXpTotal: number | undefined;
  let newLevel: number | undefined;

  if (task.completed) {
    const xpAmount = task.xp_value ?? 10;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("xp_total, level")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const updatedXp = profile.xp_total + xpAmount;
      const updatedLevel = getLevelFromXpV2(updatedXp);
      newXpTotal = updatedXp;
      newLevel = updatedLevel;

      await supabase
        .from("user_profiles")
        .update({ xp_total: updatedXp, level: updatedLevel })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true, task: restoredTask, newXpTotal, newLevel });
});
