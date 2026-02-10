// =============================================================================
// GROUPS LEAVE API ROUTE
// Leave a group. Owners must transfer ownership or delete the group first.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";

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
  const groupId = getParamFromUrl(request, "groups");

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
  // Add proper type guards before casting to prevent runtime errors
  const groupData = membership.group as unknown;
  let group: { id: string; name: string } | null = null;

  if (groupData) {
    // Type helper for the expected shape
    type GroupShape = { id: string; name: string };

    if (Array.isArray(groupData) && groupData.length > 0) {
      const firstItem = groupData[0] as Record<string, unknown>;
      if (
        typeof firstItem === "object" &&
        firstItem !== null &&
        typeof firstItem.id === "string" &&
        typeof firstItem.name === "string"
      ) {
        group = { id: firstItem.id, name: firstItem.name };
      }
    } else if (
      typeof groupData === "object" &&
      !Array.isArray(groupData)
    ) {
      const item = groupData as Record<string, unknown>;
      if (
        typeof item.id === "string" &&
        typeof item.name === "string"
      ) {
        group = { id: item.id, name: item.name } as GroupShape;
      }
    }
  }

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
