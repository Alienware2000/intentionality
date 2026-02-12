// =============================================================================
// FOCUS SESSION COMPLETE API ROUTE
// Completes an active focus session and awards XP.
//
// XP TRANSPARENCY:
// - xpGained = pro-rated focus XP based on actual work time (anti-XP-farming)
// - challengeXp = XP from any challenges completed (celebrated separately)
// - achievementXp = XP from any achievements unlocked (celebrated separately)
//
// ANTI-XP-FARMING:
// - XP is calculated server-side from started_at timestamp (anti-tampering)
// - Users must complete at least 50% of planned session to earn XP
// - XP is pro-rated based on actual time worked, not planned duration
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getProRatedFocusXp, MIN_FOCUS_COMPLETION_RATIO } from "@/app/lib/gamification";
import { awardXp } from "@/app/lib/gamification-actions";
import { markOnboardingStepComplete } from "@/app/lib/onboarding";

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

  // ANTI-XP-FARMING: Calculate actual elapsed time server-side from timestamps
  const startedAt = new Date(session.started_at).getTime();
  const completedAt = Date.now();
  const elapsedMs = completedAt - startedAt;
  // Cap at planned duration (can't earn more than planned)
  const actualMinutes = Math.min(elapsedMs / 60000, session.work_duration);

  // Calculate pro-rated XP based on actual time worked
  const baseXp = getProRatedFocusXp(actualMinutes, session.work_duration);
  const completionRatio = actualMinutes / session.work_duration;
  const isLongSession = actualMinutes >= 60;

  // Update the session status with actual work time
  const { error: updateError } = await supabase
    .from("focus_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      xp_awarded: baseXp,
      actual_work_minutes: Math.round(actualMinutes),
    })
    .eq("id", sessionId);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  // Use gamification v2 system to award XP (skip if below threshold)
  const result = await awardXp({
    supabase,
    userId: user.id,
    baseXp,
    actionType: "focus",
    focusMinutes: Math.round(actualMinutes),
    isLongFocusSession: isLongSession,
  });

  // Also update focus-specific stats in profile (use actual minutes worked)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("total_focus_minutes, focus_sessions_completed")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        total_focus_minutes: (profile.total_focus_minutes ?? 0) + Math.round(actualMinutes),
        focus_sessions_completed: (profile.focus_sessions_completed ?? 0) + 1,
      })
      .eq("user_id", user.id);
  }

  // Mark onboarding step complete (fire-and-forget)
  markOnboardingStepComplete(supabase, user.id, "focus_session").catch(() => {});

  // XP TRANSPARENCY: Return separate XP values for clear celebration
  return successResponse({
    // Pro-rated focus XP based on actual work time
    xpGained: result.actionTotalXp,
    // Challenge XP (celebrated with toast)
    challengeXp: result.bonusXp.challengeXp ?? 0,
    // Achievement XP (celebrated with modal)
    achievementXp: result.bonusXp.achievementXp ?? 0,
    // Legacy/additional fields
    xpBreakdown: result.xpBreakdown,
    newLevel: result.leveledUp ? result.newLevel : undefined,
    newXpTotal: result.newXpTotal,
    // Focus session details
    plannedMinutes: session.work_duration,
    actualMinutes: Math.round(actualMinutes),
    completionRatio: Math.round(completionRatio * 100),
    belowThreshold: completionRatio < MIN_FOCUS_COMPLETION_RATIO,
    newStreak: result.newStreak,
    achievementsUnlocked: result.achievementsUnlocked,
    challengesCompleted: result.challengesCompleted,
  });
});
