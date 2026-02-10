// =============================================================================
// GROUPS [ID] NUDGE API ROUTE
// Send encouragement nudge to at-risk group member.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
  parseJsonBody,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";
import { getLocalDateString } from "@/app/lib/gamification";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type NudgeBody = {
  to_user_id: string;
  message?: string;
};

// -----------------------------------------------------------------------------
// POST /api/groups/[id]/nudge
// -----------------------------------------------------------------------------

/**
 * POST /api/groups/[id]/nudge
 *
 * Send an encouragement nudge to an at-risk group member.
 * Rate limited: 1 nudge per sender per recipient per day.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @body {string} to_user_id - ID of user to nudge
 * @body {string} [message] - Optional encouragement message
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 *
 * @throws {400} Invalid request
 * @throws {401} Not authenticated
 * @throws {403} Not a member or already nudged today
 * @throws {404} Group or target user not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  const body = await parseJsonBody<NudgeBody>(request);

  if (!body?.to_user_id) {
    return ApiErrors.badRequest("to_user_id is required");
  }

  if (body.to_user_id === user.id) {
    return ApiErrors.badRequest("Cannot nudge yourself");
  }

  // Validate message length if provided
  if (body.message && body.message.length > 500) {
    return ApiErrors.badRequest("Message too long (max 500 characters)");
  }

  // Check if sender is a member
  const { data: senderMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!senderMembership) {
    return ApiErrors.notFound("Group not found");
  }

  // Check if recipient is a member
  const { data: recipientMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", body.to_user_id)
    .single();

  if (!recipientMembership) {
    return ApiErrors.notFound("User not found in group");
  }

  // Check rate limit: 1 nudge per sender per recipient per day
  // Issue #12: Use consistent date utility instead of raw UTC
  const today = getLocalDateString();
  const todayStart = `${today}T00:00:00`;
  const { data: existingNudge } = await supabase
    .from("nudges")
    .select("id")
    .eq("from_user_id", user.id)
    .eq("to_user_id", body.to_user_id)
    .gte("created_at", todayStart)
    .limit(1);

  if (existingNudge && existingNudge.length > 0) {
    return ApiErrors.badRequest("You've already nudged this person today");
  }

  // Create the nudge
  const { error: nudgeError } = await supabase.from("nudges").insert({
    from_user_id: user.id,
    to_user_id: body.to_user_id,
    message: body.message || "Keep going, you've got this!",
    nudge_type: "streak_reminder",
  });

  if (nudgeError) {
    return ApiErrors.serverError(nudgeError.message);
  }

  // Update streak status to track nudge
  // Issue #11: Use atomic RPC for increment to avoid race condition
  // Try the atomic RPC first, fall back to regular update if function doesn't exist
  const { error: rpcError } = await supabase.rpc("increment_nudge_count", {
    p_group_id: groupId,
    p_user_id: body.to_user_id,
  });

  // If RPC failed (function may not exist yet), fall back to regular update
  if (rpcError) {
    // First try to get current count
    const { data: streakStatus } = await supabase
      .from("group_member_streak_status")
      .select("nudge_count_today")
      .eq("group_id", groupId)
      .eq("user_id", body.to_user_id)
      .single();

    // Then update with incremented count
    await supabase
      .from("group_member_streak_status")
      .update({
        last_nudged_at: new Date().toISOString(),
        nudge_count_today: (streakStatus?.nudge_count_today ?? 0) + 1,
      })
      .eq("group_id", groupId)
      .eq("user_id", body.to_user_id);
  }

  return successResponse({ message: "Nudge sent successfully" });
});
