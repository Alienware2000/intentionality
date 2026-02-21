// =============================================================================
// TASK BATCH MOVE API ROUTE
// Moves multiple tasks to a new due date in a single database round-trip.
// Used for bulk actions like "Move all overdue to today".
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

/** Request body for POST /api/tasks/move-batch */
type MoveBatchBody = {
  taskIds?: string[];
  dueDate?: string;
};

// -----------------------------------------------------------------------------
// POST /api/tasks/move-batch
// -----------------------------------------------------------------------------

/**
 * POST /api/tasks/move-batch
 *
 * Updates the due date of multiple tasks in a single operation.
 *
 * @authentication Required
 *
 * @body {string[]} taskIds - Array of task UUIDs to move (required, max 50)
 * @body {string} dueDate - New date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} count - Number of tasks updated
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing taskIds or dueDate, or too many tasks
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<MoveBatchBody>(request);
  const { taskIds, dueDate } = body ?? {};

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0 || !dueDate) {
    return ApiErrors.badRequest("Missing taskIds array or dueDate");
  }

  if (taskIds.length > 50) {
    return ApiErrors.badRequest("Maximum 50 tasks per batch");
  }

  // Update all tasks in a single round-trip (RLS ensures user ownership)
  const { data, error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate })
    .in("id", taskIds)
    .is("deleted_at", null)
    .select("id");

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ count: data?.length ?? 0 });
});
