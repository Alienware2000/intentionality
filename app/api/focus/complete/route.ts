// =============================================================================
// FOCUS SESSION COMPLETE API ROUTE
// Completes an active focus session and awards XP.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import {
  getFocusXp,
  getLevelFromXp,
  getLocalDateString,
} from "@/app/lib/gamification";

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
 * Updates user profile with XP, level, streak, and focus statistics.
 *
 * @authentication Required
 *
 * @body {string} sessionId - UUID of the focus session (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} xpGained - XP awarded for the session
 * @returns {number} [newLevel] - New level (if leveled up)
 * @returns {number} newXpTotal - Total XP after completion
 * @returns {number} focusMinutesAdded - Minutes added to total
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

  // Calculate XP based on work duration
  const xpGained = getFocusXp(session.work_duration);

  // Update the session
  const { error: updateError } = await supabase
    .from("focus_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      xp_awarded: xpGained,
    })
    .eq("id", sessionId);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  // Update user profile with XP and focus stats
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    const newXpTotal = profile.xp_total + xpGained;
    const newLevel = getLevelFromXp(newXpTotal);
    const leveledUp = newLevel > profile.level;

    // Update streak
    const today = getLocalDateString();
    let globalStreak = profile.current_streak;
    let globalLongestStreak = profile.longest_streak;

    if (profile.last_active_date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      globalStreak =
        profile.last_active_date === yesterdayStr
          ? profile.current_streak + 1
          : 1;

      if (globalStreak > globalLongestStreak) {
        globalLongestStreak = globalStreak;
      }
    }

    await supabase
      .from("user_profiles")
      .update({
        xp_total: newXpTotal,
        level: newLevel,
        current_streak: globalStreak,
        longest_streak: globalLongestStreak,
        last_active_date: today,
        total_focus_minutes: profile.total_focus_minutes + session.work_duration,
        focus_sessions_completed: profile.focus_sessions_completed + 1,
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      xpGained,
      newLevel: leveledUp ? newLevel : undefined,
      newXpTotal,
      focusMinutesAdded: session.work_duration,
    });
  }

  return NextResponse.json({
    ok: true,
    xpGained,
    newXpTotal: 0,
    focusMinutesAdded: session.work_duration,
  });
});
