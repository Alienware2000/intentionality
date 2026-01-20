// =============================================================================
// DAILY REVIEW API ROUTE
// Handles fetching, creating, and updating daily reflections.
// Awards XP for completing daily reviews.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { PLANNING_XP, getLocalDateString, getLevelFromXpV2 } from "@/app/lib/gamification";
import { markOnboardingStepComplete } from "@/app/lib/onboarding";
import type { DailyReflection } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type CreateReviewBody = {
  date: string;
  wins?: string[];
  challenges?: string[];
  tomorrow_priorities?: string[];
  mood?: number;
  energy?: number;
  notes?: string;
};

type UpdateReviewBody = Partial<CreateReviewBody>;

// -----------------------------------------------------------------------------
// GET /api/daily-review
// -----------------------------------------------------------------------------

/**
 * GET /api/daily-review?date=YYYY-MM-DD
 *
 * Fetches the daily reflection for a specific date.
 * Returns null if no reflection exists for that date.
 *
 * @authentication Required
 * @query {string} date - Date in YYYY-MM-DD format (defaults to today)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {DailyReflection|null} reflection - The reflection or null
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const date = params.get("date") ?? getLocalDateString();

  const { data: reflection, error } = await supabase
    .from("daily_reflections")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .single();

  // No reflection for this date is not an error
  if (error?.code === "PGRST116") {
    return successResponse({ reflection: null });
  }

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ reflection });
});

// -----------------------------------------------------------------------------
// POST /api/daily-review
// -----------------------------------------------------------------------------

/**
 * POST /api/daily-review
 *
 * Creates a new daily reflection and awards XP.
 * If a reflection already exists for the date, returns it without modification.
 *
 * @authentication Required
 *
 * @body {string} date - Date for the reflection
 * @body {string[]} [wins] - What went well
 * @body {string[]} [challenges] - What was difficult
 * @body {string[]} [tomorrow_priorities] - Top priorities for tomorrow
 * @body {number} [mood] - Mood score 1-5
 * @body {number} [energy] - Energy score 1-5
 * @body {string} [notes] - Additional notes
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {DailyReflection} reflection - Created reflection
 * @returns {number} [xpGained] - XP earned (only for new reflections)
 * @returns {boolean} isNew - Whether this is a new reflection
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateReviewBody>(request);

  if (!body?.date) {
    return ApiErrors.badRequest("date is required");
  }

  // Validate mood/energy if provided
  if (body.mood !== undefined && (body.mood < 1 || body.mood > 5)) {
    return ApiErrors.badRequest("mood must be between 1 and 5");
  }
  if (body.energy !== undefined && (body.energy < 1 || body.energy > 5)) {
    return ApiErrors.badRequest("energy must be between 1 and 5");
  }

  // Check if reflection already exists
  const { data: existing } = await supabase
    .from("daily_reflections")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", body.date)
    .single();

  if (existing) {
    return successResponse({
      reflection: existing as DailyReflection,
      isNew: false,
    });
  }

  // Create new reflection with XP
  const xpToAward = PLANNING_XP.daily_review;

  const { data: reflection, error } = await supabase
    .from("daily_reflections")
    .insert({
      user_id: user.id,
      date: body.date,
      wins: body.wins ?? [],
      challenges: body.challenges ?? [],
      tomorrow_priorities: body.tomorrow_priorities ?? [],
      mood: body.mood ?? null,
      energy: body.energy ?? null,
      notes: body.notes ?? null,
      xp_awarded: xpToAward,
    })
    .select()
    .single();

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  // Award XP to user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("xp_total, level")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    const newXpTotal = profile.xp_total + xpToAward;
    const newLevel = getLevelFromXpV2(newXpTotal);

    await supabase
      .from("user_profiles")
      .update({ xp_total: newXpTotal, level: newLevel })
      .eq("user_id", user.id);

    // Mark onboarding step complete (fire-and-forget)
    markOnboardingStepComplete(supabase, user.id, "daily_review").catch(() => {});

    return successResponse({
      reflection,
      xpGained: xpToAward,
      newLevel: newLevel > profile.level ? newLevel : undefined,
      isNew: true,
    });
  }

  // Mark onboarding step complete (fire-and-forget)
  markOnboardingStepComplete(supabase, user.id, "daily_review").catch(() => {});

  return successResponse({
    reflection,
    xpGained: xpToAward,
    isNew: true,
  });
});

// -----------------------------------------------------------------------------
// PATCH /api/daily-review
// -----------------------------------------------------------------------------

/**
 * PATCH /api/daily-review
 *
 * Updates an existing daily reflection.
 * Does not award additional XP.
 *
 * @authentication Required
 *
 * @body {string} date - Date of the reflection to update
 * @body {string[]} [wins] - Updated wins
 * @body {string[]} [challenges] - Updated challenges
 * @body {string[]} [tomorrow_priorities] - Updated priorities
 * @body {number} [mood] - Updated mood
 * @body {number} [energy] - Updated energy
 * @body {string} [notes] - Updated notes
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {DailyReflection} reflection - Updated reflection
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<UpdateReviewBody>(request);

  if (!body?.date) {
    return ApiErrors.badRequest("date is required");
  }

  // Validate mood/energy if provided
  if (body.mood !== undefined && (body.mood < 1 || body.mood > 5)) {
    return ApiErrors.badRequest("mood must be between 1 and 5");
  }
  if (body.energy !== undefined && (body.energy < 1 || body.energy > 5)) {
    return ApiErrors.badRequest("energy must be between 1 and 5");
  }

  // Build updates
  const updates: Record<string, unknown> = {};
  if (body.wins !== undefined) updates.wins = body.wins;
  if (body.challenges !== undefined) updates.challenges = body.challenges;
  if (body.tomorrow_priorities !== undefined) updates.tomorrow_priorities = body.tomorrow_priorities;
  if (body.mood !== undefined) updates.mood = body.mood;
  if (body.energy !== undefined) updates.energy = body.energy;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return ApiErrors.badRequest("No updates provided");
  }

  const { data: reflection, error } = await supabase
    .from("daily_reflections")
    .update(updates)
    .eq("user_id", user.id)
    .eq("date", body.date)
    .select()
    .single();

  if (error?.code === "PGRST116") {
    return ApiErrors.notFound("Reflection not found for this date");
  }

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ reflection });
});
