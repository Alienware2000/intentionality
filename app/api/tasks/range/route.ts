// =============================================================================
// TASK RANGE API ROUTE
// Fetches tasks within a date range for the week view.
// RLS ensures users can only see their own tasks.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// GET /api/tasks/range
// -----------------------------------------------------------------------------

/**
 * GET /api/tasks/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Fetches all tasks within the specified date range.
 * Includes the associated quest data.
 *
 * @authentication Required
 *
 * @query {string} start - Start date in YYYY-MM-DD format (required)
 * @query {string} end - End date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Task[]} tasks - Array of tasks in the date range
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing start or end query param
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ supabase, request }) => {
  // Parse query params
  const params = getSearchParams(request);
  const start = params.get("start");
  const end = params.get("end");

  if (!start || !end) {
    return ApiErrors.badRequest("Missing start or end query param");
  }

  // Fetch tasks in the date range (RLS filters by quest ownership)
  // Filter out soft-deleted tasks
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("*, quest:quests(*)")
    .gte("due_date", start)
    .lte("due_date", end)
    .is("deleted_at", null)
    .order("due_date", { ascending: true });

  if (fetchError) {
    return ApiErrors.serverError(fetchError.message);
  }

  return successResponse({ tasks: tasks ?? [] });
});
