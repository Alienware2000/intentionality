// =============================================================================
// FRIENDS BLOCK API ROUTE
// Block a user to prevent them from sending friend requests or viewing profile.
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

/** Request body for POST /api/friends/block */
type BlockUserBody = {
  user_id?: string;
};

// -----------------------------------------------------------------------------
// POST /api/friends/block
// -----------------------------------------------------------------------------

/**
 * POST /api/friends/block
 *
 * Block a user. This:
 * - Removes any existing friendship
 * - Prevents them from sending friend requests
 * - Hides your profile from them
 *
 * @authentication Required
 *
 * @body {string} user_id - UUID of the user to block (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing user_id or invalid request
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<BlockUserBody>(request);
  const targetUserId = body?.user_id;

  if (!targetUserId) {
    return ApiErrors.badRequest("user_id is required");
  }

  // Can't block yourself
  if (targetUserId === user.id) {
    return ApiErrors.badRequest("Cannot block yourself");
  }

  // Check for existing friendship in either direction
  const { data: existingFriendships } = await supabase
    .from("friendships")
    .select("id, user_id, friend_id")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`
    );

  if (existingFriendships && existingFriendships.length > 0) {
    // Delete existing friendships first
    const ids = existingFriendships.map((f) => f.id);
    await supabase.from("friendships").delete().in("id", ids);
  }

  // Create a blocked friendship record (user_id = blocker, friend_id = blocked)
  const { error: blockError } = await supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: targetUserId,
    status: "blocked",
    requested_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
  });

  if (blockError) {
    // Handle case where block already exists
    if (blockError.code === "23505") {
      return successResponse({ message: "User is already blocked" });
    }
    return ApiErrors.serverError(blockError.message);
  }

  return successResponse({ message: "User blocked successfully" });
});

// -----------------------------------------------------------------------------
// DELETE /api/friends/block
// -----------------------------------------------------------------------------

/**
 * DELETE /api/friends/block
 *
 * Unblock a user.
 *
 * @authentication Required
 *
 * @body {string} user_id - UUID of the user to unblock (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing user_id
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<BlockUserBody>(request);
  const targetUserId = body?.user_id;

  if (!targetUserId) {
    return ApiErrors.badRequest("user_id is required");
  }

  // Delete the block record
  const { error: deleteError } = await supabase
    .from("friendships")
    .delete()
    .eq("user_id", user.id)
    .eq("friend_id", targetUserId)
    .eq("status", "blocked");

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  return successResponse({ message: "User unblocked successfully" });
});
