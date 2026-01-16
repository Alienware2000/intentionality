// =============================================================================
// SCHEDULE BLOCK COMPLETIONS API ROUTE
// Fetches completions for schedule blocks on a given date.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// GET /api/schedule/completions
// -----------------------------------------------------------------------------

/**
 * GET /api/schedule/completions?date=YYYY-MM-DD
 *
 * Fetches all schedule block completions for the user on a specific date.
 * First retrieves user's block IDs, then fetches completions for those blocks.
 *
 * @authentication Required
 *
 * @query {string} date - Date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {ScheduleBlockCompletion[]} completions - Array of completions
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing date parameter
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const date = params.get("date");

  if (!date) {
    return ApiErrors.badRequest("Missing date parameter");
  }

  // First get user's schedule block IDs
  const { data: blocks, error: blocksError } = await supabase
    .from("schedule_blocks")
    .select("id")
    .eq("user_id", user.id);

  if (blocksError) {
    return ApiErrors.serverError(blocksError.message);
  }

  const blockIds = blocks?.map((b) => b.id) ?? [];

  if (blockIds.length === 0) {
    return successResponse({ completions: [] });
  }

  // Fetch completions for those blocks on the given date
  const { data: completions, error: completionsError } = await supabase
    .from("schedule_block_completions")
    .select("*")
    .in("block_id", blockIds)
    .eq("completed_date", date);

  if (completionsError) {
    return ApiErrors.serverError(completionsError.message);
  }

  return successResponse({ completions: completions ?? [] });
});
