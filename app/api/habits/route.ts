// =============================================================================
// HABITS API ROUTE
// Handles CRUD operations for daily habits.
// RLS policies enforce that users can only access their own habits.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { XP_VALUES, getLevelFromXpV2 } from "@/app/lib/gamification";
import { markOnboardingStepComplete } from "@/app/lib/onboarding";
import type { Priority } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/habits */
type CreateHabitBody = {
  title?: string;
  priority?: Priority;
};

/** Request body for PATCH /api/habits */
type UpdateHabitBody = {
  habitId?: string;
  title?: string;
  priority?: Priority;
};

/** Request body for DELETE /api/habits */
type DeleteHabitBody = {
  habitId?: string;
};

// -----------------------------------------------------------------------------
// GET /api/habits
// -----------------------------------------------------------------------------

/**
 * GET /api/habits?date=YYYY-MM-DD
 *
 * Fetches all habits for the user with today's completion status.
 *
 * @authentication Required
 *
 * @query {string} date - Date to check completion status (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {HabitWithStatus[]} habits - Array of habits with completedToday
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing date query param
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ supabase, request }) => {
  const params = getSearchParams(request);
  const date = params.get("date");

  if (!date) {
    return ApiErrors.badRequest("Missing date query param");
  }

  // Fetch all habits
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .order("created_at", { ascending: true });

  if (habitsError) {
    return ApiErrors.serverError(habitsError.message);
  }

  // Fetch today's completions
  const { data: completions } = await supabase
    .from("habit_completions")
    .select("habit_id")
    .eq("completed_date", date);

  const completedIds = new Set(completions?.map((c) => c.habit_id) ?? []);

  // Add completedToday status to each habit
  const habitsWithStatus = (habits ?? []).map((h) => ({
    ...h,
    completedToday: completedIds.has(h.id),
  }));

  return successResponse({ habits: habitsWithStatus });
});

// -----------------------------------------------------------------------------
// POST /api/habits
// -----------------------------------------------------------------------------

/**
 * POST /api/habits
 *
 * Creates a new habit.
 *
 * @authentication Required
 *
 * @body {string} title - Habit title (required)
 * @body {Priority} [priority="medium"] - Habit priority
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Habit} habit - The created habit
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing title
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateHabitBody>(request);
  const { title, priority = "medium" } = body ?? {};

  if (!title || !title.trim()) {
    return ApiErrors.badRequest("Missing title");
  }

  // Calculate XP value based on priority
  const xp_value = XP_VALUES[priority] ?? XP_VALUES.medium;

  const { data: habit, error: createError } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      title: title.trim(),
      priority,
      xp_value,
    })
    .select()
    .single();

  if (createError) {
    return ApiErrors.serverError(createError.message);
  }

  // Mark onboarding step complete (fire-and-forget)
  markOnboardingStepComplete(supabase, user.id, "create_habit").catch(() => {});

  return successResponse({ habit });
});

// -----------------------------------------------------------------------------
// PATCH /api/habits
// -----------------------------------------------------------------------------

/**
 * PATCH /api/habits
 *
 * Updates a habit's title or priority.
 * If priority changes, xp_value is recalculated.
 *
 * @authentication Required
 *
 * @body {string} habitId - UUID of the habit (required)
 * @body {string} [title] - New title
 * @body {Priority} [priority] - New priority
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Habit} habit - The updated habit
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing habitId or no fields to update
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<UpdateHabitBody>(request);
  const { habitId, title, priority } = body ?? {};

  if (!habitId) {
    return ApiErrors.badRequest("Missing habitId");
  }

  if (!title && !priority) {
    return ApiErrors.badRequest("No fields to update");
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (title) updates.title = title.trim();
  if (priority) {
    updates.priority = priority;
    updates.xp_value = XP_VALUES[priority];
  }

  const { data: habit, error: updateError } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", habitId)
    .select()
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ habit });
});

// -----------------------------------------------------------------------------
// DELETE /api/habits
// -----------------------------------------------------------------------------

/**
 * DELETE /api/habits
 *
 * Deletes a habit and all its completions.
 * XP from completed days is deducted from user profile.
 *
 * @authentication Required
 *
 * @body {string} habitId - UUID of the habit to delete (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} xpDeducted - Total XP deducted
 * @returns {number} [newXpTotal] - New XP total after deduction
 * @returns {number} [newLevel] - New level after deduction
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing habitId
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<DeleteHabitBody>(request);
  const habitId = body?.habitId;

  if (!habitId) {
    return ApiErrors.badRequest("Missing habitId");
  }

  // Sum XP from all completions for this habit
  const { data: completions } = await supabase
    .from("habit_completions")
    .select("xp_awarded")
    .eq("habit_id", habitId);

  const xpToDeduct =
    completions?.reduce((sum, c) => sum + (c.xp_awarded ?? 0), 0) ?? 0;

  // Delete the habit (completions cascade)
  const { error: deleteError } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  // Deduct XP from user profile
  let newXpTotal: number | undefined;
  let newLevel: number | undefined;

  if (xpToDeduct > 0) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("xp_total")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      newXpTotal = Math.max(0, profile.xp_total - xpToDeduct);
      newLevel = getLevelFromXpV2(newXpTotal);

      await supabase
        .from("user_profiles")
        .update({ xp_total: newXpTotal, level: newLevel })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({
    ok: true,
    xpDeducted: xpToDeduct,
    newXpTotal,
    newLevel,
  });
});
