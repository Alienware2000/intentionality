// =============================================================================
// TASKS API ROUTE
// Handles CRUD operations for tasks (individual action items).
// RLS policies enforce that users can only access tasks in their own quests.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getLevelFromXpV2, XP_VALUES } from "@/app/lib/gamification";
import type { Priority } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/tasks */
type CreateTaskBody = {
  title?: string;
  due_date?: string;
  quest_id?: string;
  priority?: Priority;
  scheduled_time?: string | null;
  default_work_duration?: number | null;  // Minutes (1-180) for focus sessions
};

/** Request body for PATCH /api/tasks */
type UpdateTaskBody = {
  taskId?: string;
  title?: string;
  due_date?: string;
  priority?: Priority;
  scheduled_time?: string | null;
  default_work_duration?: number | null;  // Minutes (1-180) for focus sessions
};

/** Request body for DELETE /api/tasks */
type DeleteTaskBody = {
  taskId?: string;
};

// -----------------------------------------------------------------------------
// GET /api/tasks
// -----------------------------------------------------------------------------

/**
 * GET /api/tasks?date=YYYY-MM-DD
 *
 * Fetches all tasks for a specific date for the authenticated user.
 * Includes the associated quest data.
 *
 * @authentication Required
 *
 * @query {string} date - Date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Task[]} tasks - Array of tasks for the date
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

  // Fetch tasks for the date (RLS filters by quest ownership)
  // Filter out soft-deleted tasks
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("*, quest:quests(*)")
    .eq("due_date", date)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    return ApiErrors.serverError(fetchError.message);
  }

  return successResponse({ tasks: tasks ?? [] });
});

// -----------------------------------------------------------------------------
// POST /api/tasks
// -----------------------------------------------------------------------------

/**
 * POST /api/tasks
 *
 * Creates a new task in the specified quest.
 *
 * @authentication Required
 *
 * @body {string} title - The task title (required)
 * @body {string} due_date - Date in YYYY-MM-DD format (required)
 * @body {string} quest_id - UUID of the quest (required)
 * @body {Priority} [priority="medium"] - Task priority
 * @body {string|null} [scheduled_time] - Time in HH:MM format
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Task} task - The created task with quest data
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing required fields
 * @throws {404} Quest not found (prevents info disclosure about other users' quests)
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<CreateTaskBody>(request);
  const {
    title,
    due_date,
    quest_id,
    priority = "medium",
    scheduled_time,
    default_work_duration,
  } = body ?? {};

  if (!title || !due_date || !quest_id) {
    return ApiErrors.badRequest("Missing title, due_date, or quest_id");
  }

  // Validate default_work_duration range if provided
  if (default_work_duration !== undefined && default_work_duration !== null) {
    if (default_work_duration < 1 || default_work_duration > 180) {
      return ApiErrors.badRequest("default_work_duration must be between 1 and 180 minutes");
    }
  }

  // Calculate XP value based on priority
  const xp_value = XP_VALUES[priority] ?? XP_VALUES.medium;

  // Verify quest ownership (RLS also enforces, but we check for better error)
  // Note: Using 404 instead of 403 to prevent information disclosure
  const { data: quest, error: questError } = await supabase
    .from("quests")
    .select("id")
    .eq("id", quest_id)
    .single();

  if (questError || !quest) {
    return ApiErrors.notFound("Quest not found");
  }

  // Create the task
  const { data: task, error: createError } = await supabase
    .from("tasks")
    .insert({
      title: title.trim(),
      due_date,
      quest_id,
      priority,
      xp_value,
      completed: false,
      scheduled_time: scheduled_time || null,
      default_work_duration: default_work_duration ?? null,
    })
    .select("*, quest:quests(*)")
    .single();

  if (createError) {
    return ApiErrors.serverError(createError.message);
  }

  return successResponse({ task });
});

// -----------------------------------------------------------------------------
// PATCH /api/tasks
// -----------------------------------------------------------------------------

/**
 * PATCH /api/tasks
 *
 * Updates a task's title, due_date, priority, scheduled_time, or default_work_duration.
 * At least one field to update is required.
 * If priority changes, xp_value is recalculated.
 *
 * @authentication Required
 *
 * @body {string} taskId - UUID of the task (required)
 * @body {string} [title] - New title
 * @body {string} [due_date] - New date (YYYY-MM-DD)
 * @body {Priority} [priority] - New priority
 * @body {string|null} [scheduled_time] - New time (HH:MM) or null
 * @body {number|null} [default_work_duration] - Focus duration (1-180 minutes) or null
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Task} task - The updated task with quest data
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing taskId or no fields to update
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<UpdateTaskBody>(request);
  const { taskId, title, due_date, priority, scheduled_time, default_work_duration } = body ?? {};

  if (!taskId) {
    return ApiErrors.badRequest("Missing taskId");
  }

  if (!title && !due_date && !priority && scheduled_time === undefined && default_work_duration === undefined) {
    return ApiErrors.badRequest("No fields to update");
  }

  // Validate default_work_duration range if provided (null is valid to clear)
  if (default_work_duration !== undefined && default_work_duration !== null) {
    if (default_work_duration < 1 || default_work_duration > 180) {
      return ApiErrors.badRequest("default_work_duration must be between 1 and 180 minutes");
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (title) updates.title = title.trim();
  if (due_date) updates.due_date = due_date;
  if (priority) {
    updates.priority = priority;
    updates.xp_value = XP_VALUES[priority];
  }
  if (scheduled_time !== undefined) {
    updates.scheduled_time = scheduled_time || null;
  }
  if (default_work_duration !== undefined) {
    updates.default_work_duration = default_work_duration;
  }

  const { data: task, error: updateError } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select("*, quest:quests(*)")
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ task });
});

// -----------------------------------------------------------------------------
// DELETE /api/tasks
// -----------------------------------------------------------------------------

/**
 * DELETE /api/tasks
 *
 * Soft deletes a task by setting deleted_at timestamp.
 * If the task was completed, XP is deducted from user profile.
 * Task can be restored later via POST /api/tasks/restore.
 *
 * @authentication Required
 *
 * @body {string} taskId - UUID of the task to delete (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} [newXpTotal] - New XP total after deduction
 * @returns {number} [newLevel] - New level after deduction
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing taskId
 * @throws {404} Task not found
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<DeleteTaskBody>(request);
  const taskId = body?.taskId;

  if (!taskId) {
    return ApiErrors.badRequest("Missing taskId");
  }

  // Fetch task to check if it was completed (only active tasks)
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("completed, xp_value")
    .eq("id", taskId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !task) {
    return ApiErrors.notFound("Task not found");
  }

  // Soft delete the task by setting deleted_at
  const { error: deleteError } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  // If task was completed, deduct XP
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
      newXpTotal = Math.max(0, profile.xp_total - xpAmount);
      newLevel = getLevelFromXpV2(newXpTotal);

      await supabase
        .from("user_profiles")
        .update({ xp_total: newXpTotal, level: newLevel })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true, newXpTotal, newLevel });
});
