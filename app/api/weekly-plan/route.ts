// =============================================================================
// WEEKLY PLAN API ROUTE
// Handles fetching weekly plans (read-only).
// XP is awarded through /api/tasks/bulk when creating tasks via Plan Week modal.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getLocalDateString } from "@/app/lib/gamification";
import { getMonday } from "@/app/lib/date-utils";
import type { ISODateString } from "@/app/lib/types";

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
    ? getMonday(weekStartParam as ISODateString)
    : getMonday(getLocalDateString() as ISODateString);

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
