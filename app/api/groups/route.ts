// =============================================================================
// GROUPS API ROUTE
// Handles listing and creating accountability groups.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { SOCIAL_LIMITS, GROUP_LIMITS } from "@/app/lib/constants";
import type { GroupWithMembership, GroupMemberRole } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/groups */
type CreateGroupBody = {
  name?: string;
  description?: string;
  max_members?: number;
  is_public?: boolean;
};

// -----------------------------------------------------------------------------
// GET /api/groups
// -----------------------------------------------------------------------------

/**
 * GET /api/groups
 *
 * Fetches all groups the current user is a member of.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {GroupWithMembership[]} groups - Array of groups with user's membership info
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase }) => {
  // Fetch user's group memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from("group_members")
    .select(`
      id,
      group_id,
      role,
      weekly_xp,
      joined_at,
      groups (
        id,
        name,
        description,
        owner_id,
        invite_code,
        max_members,
        is_public,
        member_count,
        total_xp,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (membershipsError) {
    return ApiErrors.serverError(membershipsError.message);
  }

  // Transform to GroupWithMembership
  type GroupData = {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    invite_code: string;
    max_members: number;
    is_public: boolean;
    member_count: number;
    total_xp: number;
    created_at: string;
    updated_at: string;
  };

  const groups: GroupWithMembership[] = (memberships ?? [])
    .filter((m): m is typeof m & { groups: GroupData } => m.groups !== null && m.groups !== undefined)
    .map((m) => {
      // Supabase returns single object for many-to-one joins
      const group = m.groups;
      return {
        ...group,
        my_role: m.role as GroupMemberRole,
        my_weekly_xp: m.weekly_xp,
        joined_at: m.joined_at,
      };
    });

  return successResponse({ groups });
});

// -----------------------------------------------------------------------------
// POST /api/groups
// -----------------------------------------------------------------------------

/**
 * POST /api/groups
 *
 * Creates a new accountability group.
 * The creator automatically becomes the owner.
 *
 * @authentication Required
 *
 * @body {string} name - Group name (required)
 * @body {string} [description] - Group description
 * @body {number} [max_members=20] - Maximum members (2-50)
 * @body {boolean} [is_public=false] - Whether group is publicly discoverable
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Group} group - The created group
 * @returns {GroupMember} membership - Creator's membership record
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing name
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateGroupBody>(request);
  const {
    name,
    description,
    max_members = 20,
    is_public = false,
  } = body ?? {};

  if (!name || !name.trim()) {
    return ApiErrors.badRequest("name is required");
  }

  const trimmedName = name.trim();
  const trimmedDescription = description?.trim() || null;

  // Validate input lengths
  if (trimmedName.length > SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH) {
    return ApiErrors.badRequest(
      `name must be ${SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH} characters or less`
    );
  }

  if (trimmedDescription && trimmedDescription.length > SOCIAL_LIMITS.GROUP_DESCRIPTION_MAX_LENGTH) {
    return ApiErrors.badRequest(
      `description must be ${SOCIAL_LIMITS.GROUP_DESCRIPTION_MAX_LENGTH} characters or less`
    );
  }

  // Validate max_members
  const clampedMaxMembers = Math.min(GROUP_LIMITS.MAX_MEMBERS, Math.max(GROUP_LIMITS.MIN_MEMBERS, max_members));

  // Create the group
  const { data: group, error: createError } = await supabase
    .from("groups")
    .insert({
      name: trimmedName,
      description: trimmedDescription,
      owner_id: user.id,
      max_members: clampedMaxMembers,
      is_public,
      member_count: 1, // Creator is the first member
    })
    .select()
    .single();

  if (createError) {
    return ApiErrors.serverError(createError.message);
  }

  // Add creator as owner member
  const { data: membership, error: memberError } = await supabase
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: user.id,
      role: "owner",
    })
    .select()
    .single();

  if (memberError) {
    // Cleanup: delete the group if membership creation failed
    await supabase.from("groups").delete().eq("id", group.id);
    return ApiErrors.serverError(memberError.message);
  }

  return successResponse({
    group,
    membership,
    message: "Group created successfully",
  });
});
