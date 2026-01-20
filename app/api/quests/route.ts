// =============================================================================
// QUESTS API ROUTE
// Handles CRUD operations for quests (high-level goals).
// RLS policies enforce that users can only access their own quests.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getLevelFromXpV2 } from "@/app/lib/gamification";
import { markOnboardingStepComplete } from "@/app/lib/onboarding";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/quests */
type CreateQuestBody = {
  title?: string;
};

/** Request body for PATCH /api/quests */
type UpdateQuestBody = {
  questId?: string;
  title?: string;
};

/** Request body for DELETE /api/quests */
type DeleteQuestBody = {
  questId?: string;
};

// -----------------------------------------------------------------------------
// GET /api/quests
// -----------------------------------------------------------------------------

/**
 * GET /api/quests
 *
 * Fetches all quests for the authenticated user.
 * If the user has no quests, creates a default "General Tasks" quest.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Quest[]} quests - Array of user's quests
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase }) => {
  // Fetch user's quests (RLS automatically filters by user_id)
  // Try to exclude onboarding quests and archived quests by default
  // If the columns don't exist (migration not run), fall back to basic query
  let quests;
  let fetchError;

  // First try with new columns
  const result = await supabase
    .from("quests")
    .select("*")
    .neq("quest_type", "onboarding")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  // If the query failed due to missing columns, try without them
  if (result.error && (result.error.message?.includes("quest_type") || result.error.message?.includes("archived_at") || result.error.code === "42703")) {
    // Fallback to basic query without new columns
    const fallbackResult = await supabase
      .from("quests")
      .select("*")
      .order("created_at", { ascending: true });
    quests = fallbackResult.data;
    fetchError = fallbackResult.error;
  } else {
    quests = result.data;
    fetchError = result.error;
  }

  if (fetchError) {
    return ApiErrors.serverError(fetchError.message);
  }

  // Create default quest if user has none
  if (!quests || quests.length === 0) {
    // Try with quest_type column, fall back without it
    const { data: newQuest, error: createError } = await supabase
      .from("quests")
      .insert({ title: "General Tasks", user_id: user.id })
      .select()
      .single();

    if (createError) {
      return ApiErrors.serverError(createError.message);
    }

    return successResponse({ quests: [newQuest] });
  }

  return successResponse({ quests });
});

// -----------------------------------------------------------------------------
// POST /api/quests
// -----------------------------------------------------------------------------

/**
 * POST /api/quests
 *
 * Creates a new quest for the authenticated user.
 *
 * @authentication Required
 *
 * @body {string} title - The quest title (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Quest} quest - The created quest
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing title
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<CreateQuestBody>(request);
  const title = body?.title;

  if (!title || !title.trim()) {
    return ApiErrors.badRequest("Missing title");
  }

  // Create the quest (RLS enforces user ownership)
  // Try with quest_type column first, fall back without it if migration not run
  let quest;
  let createError;

  const result = await supabase
    .from("quests")
    .insert({ title: title.trim(), user_id: user.id, quest_type: "user" })
    .select()
    .single();

  if (result.error && (result.error.message?.includes("quest_type") || result.error.code === "42703")) {
    // Fallback without quest_type column
    const fallbackResult = await supabase
      .from("quests")
      .insert({ title: title.trim(), user_id: user.id })
      .select()
      .single();
    quest = fallbackResult.data;
    createError = fallbackResult.error;
  } else {
    quest = result.data;
    createError = result.error;
  }

  if (createError) {
    return ApiErrors.serverError(createError.message);
  }

  // Mark onboarding step complete (fire-and-forget)
  markOnboardingStepComplete(supabase, user.id, "create_quest").catch(() => {});

  return successResponse({ quest });
});

// -----------------------------------------------------------------------------
// PATCH /api/quests
// -----------------------------------------------------------------------------

/**
 * PATCH /api/quests
 *
 * Updates a quest's title.
 *
 * @authentication Required
 *
 * @body {string} questId - UUID of the quest (required)
 * @body {string} title - New title (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Quest} quest - The updated quest
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing questId or title
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<UpdateQuestBody>(request);
  const { questId, title } = body ?? {};

  if (!questId) {
    return ApiErrors.badRequest("Missing questId");
  }

  if (!title || !title.trim()) {
    return ApiErrors.badRequest("Missing title");
  }

  const { data: quest, error: updateError } = await supabase
    .from("quests")
    .update({ title: title.trim() })
    .eq("id", questId)
    .select()
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ quest });
});

// -----------------------------------------------------------------------------
// DELETE /api/quests
// -----------------------------------------------------------------------------

/**
 * DELETE /api/quests
 *
 * Deletes a quest and all its tasks (via cascade).
 * Will fail if this is the user's only quest.
 * XP from completed tasks is revoked from user profile.
 *
 * @authentication Required
 *
 * @body {string} questId - UUID of the quest to delete (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} xpDeducted - Total XP deducted
 * @returns {number} [newXpTotal] - New XP total after deduction
 * @returns {number} [newLevel] - New level after deduction
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing questId or cannot delete only quest
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<DeleteQuestBody>(request);
  const questId = body?.questId;

  if (!questId) {
    return ApiErrors.badRequest("Missing questId");
  }

  // Check if this is the user's only quest
  const { count, error: countError } = await supabase
    .from("quests")
    .select("*", { count: "exact", head: true });

  if (countError) {
    return ApiErrors.serverError(countError.message);
  }

  if (count !== null && count <= 1) {
    return ApiErrors.badRequest("Cannot delete your only quest");
  }

  // Sum XP from completed tasks in this quest (to deduct later)
  const { data: completedTasks } = await supabase
    .from("tasks")
    .select("xp_value")
    .eq("quest_id", questId)
    .eq("completed", true);

  const xpToDeduct =
    completedTasks?.reduce((sum, t) => sum + (t.xp_value ?? 10), 0) ?? 0;

  // Delete the quest (tasks cascade due to FK constraint)
  const { error: deleteError } = await supabase
    .from("quests")
    .delete()
    .eq("id", questId);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  // Deduct XP from completed tasks
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
