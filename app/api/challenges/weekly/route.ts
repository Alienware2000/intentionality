// =============================================================================
// WEEKLY CHALLENGE API
// GET: Fetch this week's challenge for the user.
// =============================================================================

import { withAuth, successResponse, getSearchParams } from "@/app/lib/auth-middleware";
import { getThisWeeksChallenge, generateWeeklyChallenge, getWeekStartDate } from "@/app/lib/challenges";

export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const weekStart = params.get("week_start") || getWeekStartDate();

  // Get or generate challenge for the week
  const challenge = weekStart === getWeekStartDate()
    ? await getThisWeeksChallenge(supabase, user.id)
    : await generateWeeklyChallenge(supabase, user.id, weekStart);

  if (!challenge) {
    return successResponse({ challenge: null, weekStart });
  }

  // Calculate progress percentage
  const progress = challenge.template
    ? Math.min(
        (challenge.progress / challenge.template.target_value) * 100,
        100
      )
    : 0;

  return successResponse({
    challenge,
    weekStart,
    progressPercent: progress,
  });
});
