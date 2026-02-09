// =============================================================================
// FRIENDS NUDGE API ROUTE
// Send encouragement nudges to friends (rate-limited: 1 per friend per day).
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { SOCIAL_LIMITS } from "@/app/lib/constants";
import type { NudgeType } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/friends/nudge */
type SendNudgeBody = {
  to_user_id?: string;
  message?: string;
  nudge_type?: NudgeType;
};

// -----------------------------------------------------------------------------
// POST /api/friends/nudge
// -----------------------------------------------------------------------------

/**
 * POST /api/friends/nudge
 *
 * Send an encouragement nudge to a friend.
 * Rate limited to 1 nudge per friend per day.
 *
 * @authentication Required
 *
 * @body {string} to_user_id - UUID of the friend to nudge (required)
 * @body {string} [message] - Optional custom message
 * @body {NudgeType} [nudge_type="encouragement"] - Type of nudge
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Nudge} nudge - The created nudge
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing to_user_id, not friends, or rate limited
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<SendNudgeBody>(request);
  const {
    to_user_id,
    message,
    nudge_type = "encouragement",
  } = body ?? {};

  if (!to_user_id) {
    return ApiErrors.badRequest("to_user_id is required");
  }

  // Can't nudge yourself
  if (to_user_id === user.id) {
    return ApiErrors.badRequest("Cannot nudge yourself");
  }

  // Validate message length
  if (message && message.length > SOCIAL_LIMITS.NUDGE_MESSAGE_MAX_LENGTH) {
    return ApiErrors.badRequest(
      `message must be ${SOCIAL_LIMITS.NUDGE_MESSAGE_MAX_LENGTH} characters or less`
    );
  }

  // Check if either user has blocked the other
  const { data: isBlocked } = await supabase.rpc("users_blocked", {
    user1: user.id,
    user2: to_user_id,
  });

  if (isBlocked) {
    return ApiErrors.badRequest("Cannot nudge this user");
  }

  // Verify they are friends
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${to_user_id}),and(user_id.eq.${to_user_id},friend_id.eq.${user.id})`
    )
    .single();

  if (!friendship) {
    return ApiErrors.badRequest("You can only nudge friends");
  }

  // Create the nudge (rate limit is enforced by unique index on database)
  const { data: nudge, error: createError } = await supabase
    .from("nudges")
    .insert({
      from_user_id: user.id,
      to_user_id,
      message: message?.trim() || null,
      nudge_type,
    })
    .select()
    .single();

  if (createError) {
    // Check if rate limited (unique constraint violation)
    if (createError.code === "23505") {
      return ApiErrors.badRequest("You can only nudge this friend once per day");
    }
    return ApiErrors.serverError(createError.message);
  }

  return successResponse({
    nudge,
    message: "Nudge sent successfully!",
  });
});
