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
 * Uses a SECURITY DEFINER function to bypass RLS for invite code lookup.
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
export const POST = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<JoinGroupBody>(request);
  const inviteCode = body?.invite_code?.trim();

  if (!inviteCode) {
    return ApiErrors.badRequest("invite_code is required");
  }

  // Use RPC function to join group - handles RLS bypass for invite code lookup
  const { data, error } = await supabase.rpc("join_group_by_invite_code", {
    p_invite_code: inviteCode,
  });

  if (error) {
    console.error("[Groups Join] RPC error:", error);
    return ApiErrors.serverError(error.message);
  }

  // Handle application-level errors from the function
  if (!data?.ok) {
    const errorMsg = data?.error || "Failed to join group";
    // Distinguish between not found and bad request errors
    if (errorMsg === "Invalid invite code") {
      return ApiErrors.notFound(errorMsg);
    }
    return ApiErrors.badRequest(errorMsg);
  }

  return successResponse({
    group: data.group,
    membership: { id: data.membership_id },
    message: `Successfully joined "${data.group.name}"!`,
  });
});
