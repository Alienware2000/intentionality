// =============================================================================
// GROUP INVITATIONS LIST API ROUTE
// Lists pending invitations for a group (owner/admin view).
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";

// -----------------------------------------------------------------------------
// GET /api/groups/[id]/invitations
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]/invitations
 *
 * List all pending invitations for a group.
 * Only owners and admins can view this list.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Object[]} invitations - Array of pending invitations with user details
 *
 * @throws {401} Not authenticated
 * @throws {403} Not owner or admin
 * @throws {404} Group not found
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
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

  // Fetch pending invitations
  const { data: invitations, error: invitationsError } = await supabase
    .from("group_invitations")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (invitationsError) {
    return ApiErrors.serverError(invitationsError.message);
  }

  // Get user profiles for invited users
  const invitedUserIds = invitations?.map((inv) => inv.invited_user_id) ?? [];

  if (invitedUserIds.length === 0) {
    return successResponse({ invitations: [] });
  }

  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, level")
    .in("user_id", invitedUserIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  // Build response with user details
  const invitationsWithUsers = (invitations ?? []).map((inv) => {
    const profile = profileMap.get(inv.invited_user_id);
    return {
      ...inv,
      invited_user_display_name: profile?.display_name ?? null,
      invited_user_level: profile?.level ?? 1,
    };
  });

  return successResponse({ invitations: invitationsWithUsers });
});
