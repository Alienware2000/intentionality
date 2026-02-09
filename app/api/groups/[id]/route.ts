// =============================================================================
// GROUPS [ID] API ROUTE
// Handles individual group operations: view details, update, delete.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";
import { getTitleForLevel } from "@/app/lib/gamification";
import { SOCIAL_LIMITS, GROUP_LIMITS } from "@/app/lib/constants";
import type { GroupMemberWithProfile } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for PATCH /api/groups/[id] */
type UpdateGroupBody = {
  name?: string;
  description?: string;
  max_members?: number;
  is_public?: boolean;
};

// -----------------------------------------------------------------------------
// GET /api/groups/[id]
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]
 *
 * Get detailed information about a group including all members.
 * Only members can view group details (unless public).
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Group} group - Group details
 * @returns {GroupMemberWithProfile[]} members - Array of members with profiles
 * @returns {GroupMember} my_membership - Current user's membership (or null)
 *
 * @throws {401} Not authenticated
 * @throws {404} Group not found
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  // Fetch the group
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return ApiErrors.notFound("Group not found");
  }

  // Check if user is a member (or group is public)
  const { data: myMembership } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!myMembership && !group.is_public) {
    return ApiErrors.notFound("Group not found");
  }

  // Fetch all members with profiles
  const { data: membersData, error: membersError } = await supabase
    .from("group_members")
    .select(`
      id,
      group_id,
      user_id,
      role,
      weekly_xp,
      joined_at
    `)
    .eq("group_id", groupId)
    .order("weekly_xp", { ascending: false });

  if (membersError) {
    return ApiErrors.serverError(membersError.message);
  }

  // Fetch profiles for all members
  const memberUserIds = membersData?.map((m) => m.user_id) ?? [];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, xp_total, level, current_streak")
    .in("user_id", memberUserIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  // Build members with profiles
  const members: GroupMemberWithProfile[] = (membersData ?? []).map((m) => {
    const profile = profileMap.get(m.user_id);
    const level = profile?.level ?? 1;
    return {
      ...m,
      display_name: profile?.display_name ?? null,
      xp_total: profile?.xp_total ?? 0,
      level,
      current_streak: profile?.current_streak ?? 0,
      title: getTitleForLevel(level),
    };
  });

  return successResponse({
    group,
    members,
    my_membership: myMembership || null,
  });
});

// -----------------------------------------------------------------------------
// PATCH /api/groups/[id]
// -----------------------------------------------------------------------------

/**
 * PATCH /api/groups/[id]
 *
 * Update group settings. Only owners can update.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @body {string} [name] - New group name
 * @body {string} [description] - New description
 * @body {number} [max_members] - New max members (2-50)
 * @body {boolean} [is_public] - New public status
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Group} group - Updated group
 *
 * @throws {401} Not authenticated
 * @throws {403} Not owner
 * @throws {404} Group not found
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  // Verify user is owner
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return ApiErrors.notFound("Group not found");
  }

  if (group.owner_id !== user.id) {
    // Return notFound to avoid leaking group existence to non-owners
    return ApiErrors.notFound("Group not found");
  }

  const body = await parseJsonBody<UpdateGroupBody>(request);
  const { name, description, max_members, is_public } = body ?? {};

  if (!name && description === undefined && max_members === undefined && is_public === undefined) {
    return ApiErrors.badRequest("No fields to update");
  }

  // Validate name length if provided
  const trimmedName = name?.trim();
  if (trimmedName !== undefined && trimmedName.length > SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH) {
    return ApiErrors.badRequest(
      `name must be ${SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH} characters or less`
    );
  }

  // Validate description length if provided
  const trimmedDescription = description?.trim();
  if (trimmedDescription && trimmedDescription.length > SOCIAL_LIMITS.GROUP_DESCRIPTION_MAX_LENGTH) {
    return ApiErrors.badRequest(
      `description must be ${SOCIAL_LIMITS.GROUP_DESCRIPTION_MAX_LENGTH} characters or less`
    );
  }

  // Validate max_members if provided - cannot reduce below current member count
  if (max_members !== undefined) {
    if (max_members < group.member_count) {
      return ApiErrors.badRequest(
        `Cannot reduce max_members below current member count (${group.member_count})`
      );
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (trimmedName) updates.name = trimmedName;
  if (description !== undefined) updates.description = trimmedDescription || null;
  if (max_members !== undefined) {
    updates.max_members = Math.min(GROUP_LIMITS.MAX_MEMBERS, Math.max(GROUP_LIMITS.MIN_MEMBERS, max_members));
  }
  if (is_public !== undefined) updates.is_public = is_public;

  const { data: updated, error: updateError } = await supabase
    .from("groups")
    .update(updates)
    .eq("id", groupId)
    .select()
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ group: updated });
});

// -----------------------------------------------------------------------------
// DELETE /api/groups/[id]
// -----------------------------------------------------------------------------

/**
 * DELETE /api/groups/[id]
 *
 * Delete a group. Only owners can delete.
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
 * @throws {403} Not owner
 * @throws {404} Group not found
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  // Verify user is owner and get group details for activity log
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("owner_id, name")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return ApiErrors.notFound("Group not found");
  }

  if (group.owner_id !== user.id) {
    // Return notFound to avoid leaking group existence to non-owners
    return ApiErrors.notFound("Group not found");
  }

  // Record activity for the owner before deleting
  const { error: activityError } = await supabase.from("activity_feed").insert({
    user_id: user.id,
    activity_type: "group_deleted",
    metadata: { group_id: groupId, group_name: group.name },
    message: `Deleted the group "${group.name}"`,
    reference_type: "group",
    reference_id: groupId,
  });

  if (activityError) {
    console.error("Failed to record delete activity:", activityError.message);
  }

  // Delete the group (members cascade)
  const { error: deleteError } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  return successResponse({ message: "Group deleted successfully" });
});
