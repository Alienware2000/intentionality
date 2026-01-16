// =============================================================================
// TODAY'S TASKS API ROUTE
// Fetches tasks due today plus overdue incomplete tasks.
// RLS ensures users can only see their own tasks.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// GET /api/tasks/for-today
// -----------------------------------------------------------------------------

/**
 * GET /api/tasks/for-today?date=YYYY-MM-DD
 *
 * Fetches tasks that should appear on today's view:
 * - All tasks due on the specified date
 * - All overdue tasks that are not completed
 *
 * @authentication Required
 *
 * @query {string} date - Today's date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Task[]} tasks - Array of tasks for today + overdue
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing date query param
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ supabase, request }) => {
  // Parse query params
  const params = getSearchParams(request);
  const date = params.get("date");

  if (!date) {
    return ApiErrors.badRequest("Missing date query param");
  }

  // Fetch tasks using PostgREST OR syntax:
  // - due_date = date (all tasks due today)
  // - OR (due_date < date AND completed = false) (overdue incomplete tasks)
  // Filter out soft-deleted tasks
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("*, quest:quests(*)")
    .is("deleted_at", null)
    .or(`due_date.eq.${date},and(due_date.lt.${date},completed.eq.false)`)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (fetchError) {
    return ApiErrors.serverError(fetchError.message);
  }

  return successResponse({ tasks: tasks ?? [] });
});
