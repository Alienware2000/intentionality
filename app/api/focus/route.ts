// =============================================================================
// FOCUS SESSION API ROUTE
// Handles listing and creating focus sessions (Pomodoro timer).
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/focus */
type CreateFocusSessionBody = {
  work_duration?: number;
  break_duration?: number;
  task_id?: string;
  title?: string;
};

// -----------------------------------------------------------------------------
// GET /api/focus
// -----------------------------------------------------------------------------

/**
 * GET /api/focus?status=active&limit=20
 *
 * Fetches focus sessions for the user.
 * Includes associated task data if linked.
 *
 * @authentication Required
 *
 * @query {string} [status] - Filter by status: "active", "completed", "abandoned"
 * @query {string} [limit="20"] - Maximum number of sessions to return
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {FocusSession[]} sessions - Array of focus sessions
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const status = params.get("status");
  const limit = parseInt(params.get("limit") || "20", 10);

  let query = supabase
    .from("focus_sessions")
    .select("*, task:tasks(id, title, priority)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: sessions, error: sessionsError } = await query;

  if (sessionsError) {
    return ApiErrors.serverError(sessionsError.message);
  }

  return successResponse({ sessions: sessions ?? [] });
});

// -----------------------------------------------------------------------------
// POST /api/focus
// -----------------------------------------------------------------------------

/**
 * POST /api/focus
 *
 * Starts a new focus session (Pomodoro timer).
 * Only one active session allowed per user.
 *
 * @authentication Required
 *
 * @body {number} [work_duration=25] - Work duration in minutes (1-180)
 * @body {number} [break_duration=5] - Break duration in minutes (0-60)
 * @body {string} [task_id] - UUID of associated task
 * @body {string} [title] - Session title
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {FocusSession} session - The created session
 *
 * @throws {401} Not authenticated
 * @throws {400} Invalid durations or active session exists
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateFocusSessionBody>(request);
  const {
    work_duration = 25,
    break_duration = 5,
    task_id,
    title,
  } = body ?? {};

  // Validate durations
  if (work_duration < 1 || work_duration > 180) {
    return ApiErrors.badRequest(
      "Work duration must be between 1 and 180 minutes"
    );
  }

  if (break_duration < 0 || break_duration > 60) {
    return ApiErrors.badRequest(
      "Break duration must be between 0 and 60 minutes"
    );
  }

  // Check for existing active session
  const { data: existingActive } = await supabase
    .from("focus_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (existingActive) {
    return ApiErrors.badRequest("You already have an active focus session");
  }

  // Create the session
  const { data: session, error: createError } = await supabase
    .from("focus_sessions")
    .insert({
      user_id: user.id,
      work_duration,
      break_duration,
      task_id: task_id || null,
      title: title?.trim() || null,
      status: "active",
    })
    .select()
    .single();

  if (createError) {
    return ApiErrors.serverError(createError.message);
  }

  return successResponse({ session });
});
