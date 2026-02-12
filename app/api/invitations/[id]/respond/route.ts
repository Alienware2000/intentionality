// =============================================================================
// INVITATION RESPOND API ROUTE
// Accept or decline a group invitation.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type RespondBody = {
  action: "accept" | "decline";
};

// -----------------------------------------------------------------------------
// POST /api/invitations/[id]/respond
// -----------------------------------------------------------------------------

/**
 * POST /api/invitations/[id]/respond
 *
 * Accept or decline a group invitation.
 *
 * @authentication Required
 *
 * @param {string} id - Invitation ID from URL
 * @body {string} action - "accept" or "decline"
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 * @returns {Object} [membership] - Group membership if accepted
 *
 * @throws {401} Not authenticated
 * @throws {400} Invalid action
 * @throws {403} Not the invited user
 * @throws {404} Invitation not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const invitationId = getParamFromUrl(request, "invitations");

  if (!invitationId) {
    return ApiErrors.badRequest("Invitation ID is required");
  }

  const body = await parseJsonBody<RespondBody>(request);
  const action = body?.action;

  if (!action || (action !== "accept" && action !== "decline")) {
    return ApiErrors.badRequest("action must be 'accept' or 'decline'");
  }

  // Fetch the invitation
  const { data: invitation, error: invitationError } = await supabase
    .from("group_invitations")
    .select("*, groups(id, name, member_count, max_members)")
    .eq("id", invitationId)
    .single();

  if (invitationError || !invitation) {
    return ApiErrors.notFound("Invitation not found");
  }

  // Verify this invitation is for the current user
  if (invitation.invited_user_id !== user.id) {
    return ApiErrors.notFound("Invitation not found");
  }

  // Check if invitation is still pending
  if (invitation.status !== "pending") {
    return ApiErrors.badRequest(`Invitation has already been ${invitation.status}`);
  }

  // Check if invitation has expired
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    // Update to expired status
    await supabase
      .from("group_invitations")
      .update({ status: "expired" })
      .eq("id", invitationId);
    return ApiErrors.badRequest("Invitation has expired");
  }

  const group = invitation.groups as { id: string; name: string; member_count: number; max_members: number };

  if (action === "decline") {
    // Update invitation status to declined
    const { error: updateError } = await supabase
      .from("group_invitations")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      return ApiErrors.serverError(updateError.message);
    }

    return successResponse({ message: "Invitation declined" });
  }

  // Handle accept
  // Check if group is full
  if (group.member_count >= group.max_members) {
    return ApiErrors.badRequest("Group is now full");
  }

  // Check if user is already a member (race condition protection)
  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", invitation.group_id)
    .eq("user_id", user.id)
    .single();

  if (existingMembership) {
    // Already a member, just mark invitation as accepted
    await supabase
      .from("group_invitations")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    return successResponse({
      message: "You are already a member of this group",
      membership: existingMembership,
    });
  }

  // Create group membership
  const { data: membership, error: membershipError } = await supabase
    .from("group_members")
    .insert({
      group_id: invitation.group_id,
      user_id: user.id,
      role: "member",
    })
    .select()
    .single();

  if (membershipError) {
    console.error("Failed to create membership:", membershipError.message);
    return ApiErrors.serverError(membershipError.message);
  }

  // Update invitation status to accepted
  const { error: updateError } = await supabase
    .from("group_invitations")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (updateError) {
    console.error("Failed to update invitation status:", updateError.message);
    // Don't fail - membership was created successfully
  }

  // Record activity
  const { error: activityError } = await supabase.from("activity_feed").insert({
    user_id: user.id,
    activity_type: "joined_group",
    metadata: { group_id: invitation.group_id, group_name: group.name, via: "invitation" },
    message: `Joined "${group.name}" via invitation`,
    reference_type: "group",
    reference_id: invitation.group_id,
  });

  if (activityError) {
    console.error("Failed to record activity:", activityError.message);
  }

  return successResponse({
    message: `You joined "${group.name}"`,
    membership,
    group: {
      id: group.id,
      name: group.name,
    },
  });
});
