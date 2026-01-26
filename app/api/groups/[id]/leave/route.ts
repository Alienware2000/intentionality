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

  // Check membership and role
  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .select("id, role")
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

  // Delete the membership
  const { error: deleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("id", membership.id);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  return successResponse({ message: "Left the group successfully" });
});
