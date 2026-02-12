// =============================================================================
// USER INVITATIONS API ROUTE
// Lists pending group invitations for the current user.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { GroupInvitationWithDetails } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/invitations
// -----------------------------------------------------------------------------

/**
 * GET /api/invitations
 *
 * List all pending group invitations for the current user.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {GroupInvitationWithDetails[]} invitations - Array of pending invitations
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase }) => {
  // Fetch pending invitations for this user
  const { data: invitations, error: invitationsError } = await supabase
    .from("group_invitations")
    .select("*")
    .eq("invited_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (invitationsError) {
    return ApiErrors.serverError(invitationsError.message);
  }

  if (!invitations || invitations.length === 0) {
    return successResponse({ invitations: [] });
  }

  // Get group details
  const groupIds = invitations.map((inv) => inv.group_id);
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, description, member_count")
    .in("id", groupIds);

  const groupMap = new Map(groups?.map((g) => [g.id, g]) ?? []);

  // Get inviter profiles
  const inviterIds = invitations.map((inv) => inv.invited_by);
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name")
    .in("user_id", inviterIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  // Build response with all details
  const invitationsWithDetails: GroupInvitationWithDetails[] = invitations
    .filter((inv) => {
      // Filter out expired invitations
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        return false;
      }
      return true;
    })
    .map((inv) => {
      const group = groupMap.get(inv.group_id);
      const inviter = profileMap.get(inv.invited_by);
      return {
        ...inv,
        group_name: group?.name ?? "Unknown Group",
        group_description: group?.description ?? null,
        group_member_count: group?.member_count ?? 0,
        inviter_display_name: inviter?.display_name ?? null,
      };
    });

  return successResponse({ invitations: invitationsWithDetails });
});
