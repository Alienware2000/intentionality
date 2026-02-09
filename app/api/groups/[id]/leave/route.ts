// =============================================================================
// GROUPS LEAVE API ROUTE
// Leave a group. Owners must transfer ownership or delete the group first.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Helper: Extract group ID from request URL
// -----------------------------------------------------------------------------

function getGroupIdFromUrl(request: Request): string | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  // URL is /api/groups/[id]/leave
  const groupsIndex = pathParts.findIndex((p) => p === "groups");
  if (groupsIndex >= 0 && pathParts.length > groupsIndex + 1) {
    return pathParts[groupsIndex + 1];
  }
  return null;
}

// -----------------------------------------------------------------------------
// DELETE /api/groups/[id]/leave
// -----------------------------------------------------------------------------

/**
 * DELETE /api/groups/[id]/leave
 *
 * Leave a group. Owners cannot leave (must delete or transfer ownership).
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Owner cannot leave
 * @throws {404} Not a member
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const groupId = getGroupIdFromUrl(request);

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  // Check membership and role, also get group name for activity log
  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .select("id, role, group:groups(id, name)")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return ApiErrors.notFound("You are not a member of this group");
  }

  // Owners cannot leave - they must delete or transfer ownership
  if (membership.role === "owner") {
    return ApiErrors.badRequest(
      "Owners cannot leave. Please delete the group or transfer ownership first."
    );
  }

  // Get group info before leaving
  // Note: Supabase returns joined relations as arrays even for single items
  const groupData = membership.group as unknown;
  const group = Array.isArray(groupData) ? groupData[0] : groupData as { id: string; name: string } | null;

  // Delete the membership
  const { error: deleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("id", membership.id);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  // Record activity for leaving group
  if (group) {
    const { error: activityError } = await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: "left_group",
      metadata: { group_id: group.id, group_name: group.name },
      message: `Left the group "${group.name}"`,
      reference_type: "group",
      reference_id: group.id,
    });

    if (activityError) {
      console.error("Failed to record leave activity:", activityError.message);
    }
  }

  return successResponse({ message: "Left the group successfully" });
});
