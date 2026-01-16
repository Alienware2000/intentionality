// =============================================================================
// FOCUS SESSION ABANDON API ROUTE
// Abandons an active focus session without awarding XP.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/focus/abandon */
type AbandonFocusSessionBody = {
  sessionId?: string;
};

// -----------------------------------------------------------------------------
// POST /api/focus/abandon
// -----------------------------------------------------------------------------

/**
 * POST /api/focus/abandon
 *
 * Abandons the active focus session without awarding XP.
 * Use when user wants to cancel a session before completion.
 *
 * @authentication Required
 *
 * @body {string} sessionId - UUID of the focus session (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing sessionId or session not active
 * @throws {404} Focus session not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<AbandonFocusSessionBody>(request);
  const sessionId = body?.sessionId;

  if (!sessionId) {
    return ApiErrors.badRequest("Missing sessionId");
  }

  // Fetch the session
  const { data: session, error: sessionError } = await supabase
    .from("focus_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return ApiErrors.notFound("Focus session not found");
  }

  if (session.status !== "active") {
    return ApiErrors.badRequest("Session is not active");
  }

  // Update the session to abandoned
  const { error: updateError } = await supabase
    .from("focus_sessions")
    .update({
      status: "abandoned",
      completed_at: new Date().toISOString(),
      xp_awarded: 0,
    })
    .eq("id", sessionId);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return NextResponse.json({ ok: true });
});
