// =============================================================================
// GROUPS JOIN API ROUTE
// Join a group using an invite code.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/groups/join */
type JoinGroupBody = {
  invite_code?: string;
};

// -----------------------------------------------------------------------------
// POST /api/groups/join
// -----------------------------------------------------------------------------

/**
 * POST /api/groups/join
 *
 * Join a group using its invite code.
 *
 * @authentication Required
 *
 * @body {string} invite_code - 8-character invite code (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Group} group - The group joined
 * @returns {GroupMember} membership - The created membership
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing invite_code, already member, or group full
 * @throws {404} Invalid invite code
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<JoinGroupBody>(request);
  const inviteCode = body?.invite_code?.trim().toUpperCase();

  if (!inviteCode) {
    return ApiErrors.badRequest("invite_code is required");
  }

  // Find the group by invite code
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("invite_code", inviteCode)
    .single();

  if (groupError || !group) {
    return ApiErrors.notFound("Invalid invite code");
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .single();

  if (existingMembership) {
    return ApiErrors.badRequest("You are already a member of this group");
  }

  // Create membership with a check for group capacity
  // Note: The member_count check here is a soft limit. The database trigger
  // or constraint should enforce the hard limit to prevent race conditions.
  // We check here for better UX (immediate feedback).
  if (group.member_count >= group.max_members) {
    return ApiErrors.badRequest("This group is full");
  }

  // Create membership - database constraints handle true race conditions
  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: "member",
    })
    .select()
    .single();

  if (memberError) {
    // Handle unique constraint (already a member - race condition on duplicate join)
    if (memberError.code === "23505") {
      return ApiErrors.badRequest("You are already a member of this group");
    }
    // Handle group full constraint violation (if database constraint exists)
    if (memberError.message?.toLowerCase().includes("full") ||
        memberError.message?.toLowerCase().includes("capacity")) {
      return ApiErrors.badRequest("This group is full");
    }
    return ApiErrors.serverError(memberError.message);
  }

  // Record activity for joining group
  const { error: activityError } = await supabase.from("activity_feed").insert({
    user_id: user.id,
    activity_type: "joined_group",
    metadata: { group_id: group.id, group_name: group.name },
    message: `Joined the group "${group.name}"`,
    reference_type: "group",
    reference_id: group.id,
  });

  // Log activity insert errors but don't fail the join
  if (activityError) {
    console.error("Failed to record join activity:", activityError.message);
  }

  return successResponse({
    group,
    membership,
    message: `Successfully joined "${group.name}"!`,
  });
});
