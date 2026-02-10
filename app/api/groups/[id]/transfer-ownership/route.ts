// =============================================================================
// GROUP OWNERSHIP TRANSFER API ROUTE
// Allows group owners to transfer ownership to another member.
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

type TransferOwnershipBody = {
  new_owner_id: string;
};

// -----------------------------------------------------------------------------
// POST /api/groups/[id]/transfer-ownership
// -----------------------------------------------------------------------------

/**
 * POST /api/groups/[id]/transfer-ownership
 *
 * Transfer group ownership to another member.
 * Only the current owner can transfer ownership.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @body {string} new_owner_id - User ID of the new owner (must be a member)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Invalid new owner ID
 * @throws {403} Not the group owner
 * @throws {404} Group or new owner not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  const body = await parseJsonBody<TransferOwnershipBody>(request);
  const newOwnerId = body?.new_owner_id;

  if (!newOwnerId) {
    return ApiErrors.badRequest("new_owner_id is required");
  }

  if (newOwnerId === user.id) {
    return ApiErrors.badRequest("Cannot transfer ownership to yourself");
  }

  // Verify the group exists and current user is the owner
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("id, name, owner_id")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return ApiErrors.notFound("Group not found");
  }

  if (group.owner_id !== user.id) {
    // Use notFound to prevent information disclosure about group ownership
    return ApiErrors.notFound("Group not found");
  }

  // Verify the new owner is a member of the group
  const { data: newOwnerMembership, error: memberError } = await supabase
    .from("group_members")
    .select("id, role, user_id")
    .eq("group_id", groupId)
    .eq("user_id", newOwnerId)
    .single();

  if (memberError || !newOwnerMembership) {
    return ApiErrors.notFound("New owner must be a member of the group");
  }

  // Perform the ownership transfer with comprehensive rollback:
  // 1. Update the groups table to set the new owner
  // 2. Update the new owner's role to "owner"
  // 3. Update the current owner's role to "admin"
  //
  // If any step fails, we attempt to rollback previous steps to maintain consistency.

  const { error: updateGroupError } = await supabase
    .from("groups")
    .update({ owner_id: newOwnerId })
    .eq("id", groupId);

  if (updateGroupError) {
    return ApiErrors.serverError(updateGroupError.message);
  }

  // Update new owner's membership to owner role
  const { error: newOwnerRoleError } = await supabase
    .from("group_members")
    .update({ role: "owner" })
    .eq("id", newOwnerMembership.id);

  if (newOwnerRoleError) {
    // Rollback: restore original group owner
    const { error: rollbackError } = await supabase
      .from("groups")
      .update({ owner_id: user.id })
      .eq("id", groupId);

    if (rollbackError) {
      console.error("Critical: Failed to rollback group owner change:", rollbackError.message);
    }
    return ApiErrors.serverError(newOwnerRoleError.message);
  }

  // Update current owner's membership to admin role
  const { error: oldOwnerRoleError } = await supabase
    .from("group_members")
    .update({ role: "admin" })
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (oldOwnerRoleError) {
    // This is less critical - the transfer was functionally successful
    // but the old owner may have an incorrect role. Log and continue.
    // A full rollback here could leave things in a worse state if it also fails.
    console.error(
      "[transfer-ownership] Warning: Transfer succeeded but failed to update old owner role:",
      oldOwnerRoleError.message
    );
  }

  // Record activity for ownership transfer
  const { error: activityError } = await supabase.from("activity_feed").insert({
    user_id: user.id,
    activity_type: "transferred_ownership",
    metadata: { group_id: groupId, group_name: group.name, new_owner_id: newOwnerId },
    message: `Transferred ownership of "${group.name}"`,
    reference_type: "group",
    reference_id: groupId,
  });

  if (activityError) {
    console.error("Failed to record transfer activity:", activityError.message);
  }

  return successResponse({
    message: "Ownership transferred successfully",
  });
});
