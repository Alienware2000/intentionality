// =============================================================================
// DAILY CHALLENGES API
// GET: Fetch today's daily challenges for the user.
//
// NOTE: Daily sweep bonus has been removed as part of XP transparency redesign.
// XP is awarded when individual challenges complete (visible to user).
// =============================================================================

import { withAuth, successResponse, getSearchParams } from "@/app/lib/auth-middleware";
import { getTodaysChallenges, generateDailyChallenges } from "@/app/lib/challenges";
import { getLocalDateString } from "@/app/lib/gamification";

export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const date = params.get("date") || getLocalDateString();

  // Get or generate challenges for the date
  const challenges = date === getLocalDateString()
    ? await getTodaysChallenges(supabase, user.id)
    : await generateDailyChallenges(supabase, user.id, date);

  // Calculate completion status
  const completedCount = challenges.filter((c) => c.completed).length;
  const allCompleted = challenges.length === 3 && completedCount === 3;

  // Calculate total XP earned/available
  const xpEarned = challenges.reduce((sum, c) => sum + (c.xp_awarded || 0), 0);
  const xpAvailable = challenges.reduce(
    (sum, c) => sum + (c.template?.xp_reward || 0),
    0
  );

  return successResponse({
    challenges,
    date,
    summary: {
      total: challenges.length,
      completed: completedCount,
      allCompleted,
      xpEarned,
      xpAvailable,
    },
  });
});
