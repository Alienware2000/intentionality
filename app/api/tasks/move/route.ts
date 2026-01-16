// =============================================================================
// TASK MOVE API ROUTE
// Moves a task to a different due date.
// RLS ensures users can only move their own tasks.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/tasks/move */
type MoveTaskBody = {
  taskId?: string;
  dueDate?: string;
};

// -----------------------------------------------------------------------------
// POST /api/tasks/move
// -----------------------------------------------------------------------------

/**
 * POST /api/tasks/move
 *
 * Updates the due date of a task.
 *
 * @authentication Required
 *
 * @body {string} taskId - UUID of the task to move (required)
 * @body {string} dueDate - New date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Task} task - The updated task
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing taskId or dueDate
 * @throws {404} Task not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<MoveTaskBody>(request);
  const { taskId, dueDate } = body ?? {};

  if (!taskId || !dueDate) {
    return ApiErrors.badRequest("Missing taskId or dueDate");
  }

  // Verify task exists and belongs to user (RLS enforces this)
  // Only allow moving non-deleted tasks
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !existing) {
    return ApiErrors.notFound("Task not found");
  }

  // Update the due date
  const { data: updated, error: updateError } = await supabase
    .from("tasks")
    .update({ due_date: dueDate })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ task: updated });
});
