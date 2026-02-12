// =============================================================================
// GROUP INVITE API ROUTE
// Sends a direct invitation to a user to join a group.
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

type InviteUserBody = {
  user_id: string;
};

// -----------------------------------------------------------------------------
// POST /api/groups/[id]/invite
// -----------------------------------------------------------------------------

/**
 * POST /api/groups/[id]/invite
 *
 * Send a direct invitation to a user to join the group.
 * Only owners and admins can invite users.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @body {string} user_id - User ID to invite
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Object} invitation - The created invitation
 *
 * @throws {401} Not authenticated
 * @throws {400} Invalid user ID or user already member/invited
 * @throws {403} Not owner or admin
 * @throws {404} Group or user not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  const body = await parseJsonBody<InviteUserBody>(request);
  const invitedUserId = body?.user_id;

  if (!invitedUserId) {
    return ApiErrors.badRequest("user_id is required");
  }

  if (invitedUserId === user.id) {
    return ApiErrors.badRequest("Cannot invite yourself");
  }

  // Verify the group exists and get details
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, member_count, max_members")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return ApiErrors.notFound("Group not found");
  }

  // Check if group is full
  if (group.member_count >= group.max_members) {
    return ApiErrors.badRequest("Group is full");
  }

  // Verify the current user is an owner or admin of the group
  const { data: myMembership, error: membershipError } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !myMembership) {
    return ApiErrors.notFound("Group not found");
  }

  if (myMembership.role !== "owner" && myMembership.role !== "admin") {
    // Return notFound to prevent information disclosure about group ownership
    return ApiErrors.notFound("Group not found");
  }

  // Verify the invited user exists
  const { data: invitedUser, error: userError } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .eq("user_id", invitedUserId)
    .single();

  if (userError || !invitedUser) {
    return ApiErrors.notFound("User not found");
  }

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", invitedUserId)
    .single();

  if (existingMembership) {
    return ApiErrors.badRequest("User is already a member of this group");
  }

  // Check for existing pending invitation
  const { data: existingInvitation } = await supabase
    .from("group_invitations")
    .select("id, status")
    .eq("group_id", groupId)
    .eq("invited_user_id", invitedUserId)
    .single();

  if (existingInvitation) {
    if (existingInvitation.status === "pending") {
      return ApiErrors.badRequest("User already has a pending invitation");
    }
    // If declined/expired, delete the old invitation and create a new one
    await supabase
      .from("group_invitations")
      .delete()
      .eq("id", existingInvitation.id);
  }

  // Create the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("group_invitations")
    .insert({
      group_id: groupId,
      invited_user_id: invitedUserId,
      invited_by: user.id,
      status: "pending",
    })
    .select()
    .single();

  if (inviteError) {
    console.error("Failed to create invitation:", inviteError.message);
    return ApiErrors.serverError(inviteError.message);
  }

  return successResponse({
    invitation,
    message: `Invitation sent to ${invitedUser.display_name || "user"}`,
  });
});
