// =============================================================================
// WEEKLY PLAN API ROUTE
// Handles fetching, creating, and updating weekly plans.
// Awards XP for completing weekly planning sessions.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { PLANNING_XP, getLocalDateString, getLevelFromXpV2 } from "@/app/lib/gamification";
import type { WeeklyPlan, ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type CreatePlanBody = {
  week_start: ISODateString;
  goals?: string[];
  focus_areas?: string[];
  review_notes?: string;
};

type UpdatePlanBody = Partial<CreatePlanBody>;

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get the Monday of the week for a given date.
 */
function getWeekMonday(dateStr: ISODateString): ISODateString {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}` as ISODateString;
}

// -----------------------------------------------------------------------------
// GET /api/weekly-plan
// -----------------------------------------------------------------------------

/**
 * GET /api/weekly-plan?week_start=YYYY-MM-DD
 *
 * Fetches the weekly plan for a specific week.
 * If week_start is not provided, defaults to current week.
 *
 * @authentication Required
 * @query {string} [week_start] - Monday of the week in YYYY-MM-DD format
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {WeeklyPlan|null} plan - The plan or null
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const weekStartParam = params.get("week_start");
  const weekStart = weekStartParam
    ? getWeekMonday(weekStartParam as ISODateString)
    : getWeekMonday(getLocalDateString() as ISODateString);

  const { data: plan, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  // No plan for this week is not an error
  if (error?.code === "PGRST116") {
    return successResponse({ plan: null, weekStart });
  }

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ plan, weekStart });
});

// -----------------------------------------------------------------------------
// POST /api/weekly-plan
// -----------------------------------------------------------------------------

/**
 * POST /api/weekly-plan
 *
 * Creates a new weekly plan and awards XP.
 * If a plan already exists for the week, returns it without modification.
 *
 * @authentication Required
 *
 * @body {string} week_start - Monday of the week
 * @body {string[]} [goals] - Weekly goals (3-5 recommended)
 * @body {string[]} [focus_areas] - Focus areas for the week
 * @body {string} [review_notes] - End of week reflection
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {WeeklyPlan} plan - Created plan
 * @returns {number} [xpGained] - XP earned (only for new plans)
 * @returns {boolean} isNew - Whether this is a new plan
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreatePlanBody>(request);

  if (!body?.week_start) {
    return ApiErrors.badRequest("week_start is required");
  }

  // Normalize to Monday
  const weekStart = getWeekMonday(body.week_start);

  // Check if plan already exists
  const { data: existing } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  if (existing) {
    return successResponse({
      plan: existing as WeeklyPlan,
      isNew: false,
    });
  }

  // Create new plan with XP
  const xpToAward = PLANNING_XP.weekly_planning;

  const { data: plan, error } = await supabase
    .from("weekly_plans")
    .insert({
      user_id: user.id,
      week_start: weekStart,
      goals: body.goals ?? [],
      focus_areas: body.focus_areas ?? [],
      review_notes: body.review_notes ?? null,
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

    return NextResponse.json({
      ok: true,
      plan,
      xpGained: xpToAward,
      newLevel: newLevel > profile.level ? newLevel : undefined,
      isNew: true,
    });
  }

  return NextResponse.json({
    ok: true,
    plan,
    xpGained: xpToAward,
    isNew: true,
  });
});

// -----------------------------------------------------------------------------
// PATCH /api/weekly-plan
// -----------------------------------------------------------------------------

/**
 * PATCH /api/weekly-plan
 *
 * Updates an existing weekly plan.
 * Does not award additional XP.
 *
 * @authentication Required
 *
 * @body {string} week_start - Monday of the week to update
 * @body {string[]} [goals] - Updated goals
 * @body {string[]} [focus_areas] - Updated focus areas
 * @body {string} [review_notes] - Updated review notes
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {WeeklyPlan} plan - Updated plan
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<UpdatePlanBody>(request);

  if (!body?.week_start) {
    return ApiErrors.badRequest("week_start is required");
  }

  const weekStart = getWeekMonday(body.week_start);

  // Build updates
  const updates: Record<string, unknown> = {};
  if (body.goals !== undefined) updates.goals = body.goals;
  if (body.focus_areas !== undefined) updates.focus_areas = body.focus_areas;
  if (body.review_notes !== undefined) updates.review_notes = body.review_notes;

  if (Object.keys(updates).length === 0) {
    return ApiErrors.badRequest("No updates provided");
  }

  const { data: plan, error } = await supabase
    .from("weekly_plans")
    .update(updates)
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .select()
    .single();

  if (error?.code === "PGRST116") {
    return ApiErrors.notFound("Plan not found for this week");
  }

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ plan });
});
