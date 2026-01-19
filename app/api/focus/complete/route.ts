// =============================================================================
// FOCUS SESSION COMPLETE API ROUTE
// Completes an active focus session and awards XP.
// Integrates with gamification v2 for achievements, challenges, and bonuses.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getFocusTotalXp } from "@/app/lib/gamification";
import { awardXp } from "@/app/lib/gamification-actions";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/focus/complete */
type CompleteFocusSessionBody = {
  sessionId?: string;
};

// -----------------------------------------------------------------------------
// POST /api/focus/complete
// -----------------------------------------------------------------------------

/**
 * POST /api/focus/complete
 *
 * Completes the active focus session and awards XP.
 * Uses gamification v2 system for streak bonuses, achievements, and challenges.
 *
 * @authentication Required
 *
 * @body {string} sessionId - UUID of the focus session (required)
 *
 * @returns {Object} Response object with gamification data
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing sessionId or session not active
 * @throws {404} Focus session not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CompleteFocusSessionBody>(request);
  const sessionId = body?.sessionId;

  if (!sessionId) {
    return ApiErrors.badRequest("Missing sessionId");
  }

  // Fetch the session
  const { data: session, error: sessionError } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return ApiErrors.notFound("Focus session not found");
  }

  if (session.status !== "active") {
    return ApiErrors.badRequest("Session is not active");
  }

  // Validate session duration (max 8 hours)
  const MAX_SESSION_DURATION = 480;
  if (session.work_duration <= 0 || session.work_duration > MAX_SESSION_DURATION) {
    return ApiErrors.badRequest("Invalid session duration");
  }

  // Calculate base XP based on work duration (includes milestone bonus)
  const baseXp = getFocusTotalXp(session.work_duration);
  const isLongSession = session.work_duration >= 60;

  // Update the session status
  const { error: updateError } = await supabase
    .from("focus_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      xp_awarded: baseXp,
    })
    .eq("id", sessionId);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  // Use gamification v2 system to award XP
  const result = await awardXp({
    supabase,
    userId: user.id,
    baseXp,
    actionType: "focus",
    focusMinutes: session.work_duration,
    isLongFocusSession: isLongSession,
  });

  // Also update focus-specific stats in profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("total_focus_minutes, focus_sessions_completed")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        total_focus_minutes: (profile.total_focus_minutes ?? 0) + session.work_duration,
        focus_sessions_completed: (profile.focus_sessions_completed ?? 0) + 1,
      })
      .eq("user_id", user.id);
  }

  return successResponse({
    xpGained: result.xpBreakdown.totalXp,
    xpBreakdown: result.xpBreakdown,
    newLevel: result.leveledUp ? result.newLevel : undefined,
    newXpTotal: result.newXpTotal,
    focusMinutesAdded: session.work_duration,
    newStreak: result.newStreak,
    streakMilestone: result.streakMilestone,
    achievementsUnlocked: result.achievementsUnlocked,
    challengesCompleted: result.challengesCompleted,
    bonusXp: result.bonusXp,
  });
});
