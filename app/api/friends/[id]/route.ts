// =============================================================================
// FRIENDS [ID] API ROUTE
// Handles individual friendship operations: accept, reject, remove.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { FriendshipStatus } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for PATCH /api/friends/[id] */
type UpdateFriendshipBody = {
  action?: "accept" | "reject";
};

// -----------------------------------------------------------------------------
// PATCH /api/friends/[id]
// -----------------------------------------------------------------------------

/**
 * PATCH /api/friends/[id]
 *
 * Accept or reject a friend request.
 *
 * @authentication Required
 *
 * @param {string} id - Friendship ID from URL
 * @body {string} action - "accept" or "reject"
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Friendship} [friendship] - Updated friendship (on accept)
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Invalid action
 * @throws {404} Friendship not found
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  // Extract friendship ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const friendshipId = pathParts[pathParts.length - 1];

  if (!friendshipId) {
    return ApiErrors.badRequest("Friendship ID is required");
  }

  const body = await parseJsonBody<UpdateFriendshipBody>(request);
  const action = body?.action;

  if (!action || !["accept", "reject"].includes(action)) {
    return ApiErrors.badRequest("action must be 'accept' or 'reject'");
  }

  // Fetch the friendship
  const { data: friendship, error: fetchError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .single();

  if (fetchError || !friendship) {
    return ApiErrors.notFound("Friendship not found");
  }

  // Only the recipient (friend_id) can accept/reject
  if (friendship.friend_id !== user.id) {
    return ApiErrors.badRequest("Only the recipient can respond to friend requests");
  }

  // Can only respond to pending requests
  if (friendship.status !== "pending") {
    return ApiErrors.badRequest("This request has already been responded to");
  }

  if (action === "accept") {
    // Accept the friend request
    const { data: updated, error: updateError } = await supabase
      .from("friendships")
      .update({
        status: "accepted" as FriendshipStatus,
        responded_at: new Date().toISOString(),
      })
      .eq("id", friendshipId)
      .select()
      .single();

    if (updateError) {
      return ApiErrors.serverError(updateError.message);
    }

    return successResponse({
      friendship: updated,
      message: "Friend request accepted",
    });
  } else {
    // Reject = delete the friendship record
    const { error: deleteError } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (deleteError) {
      return ApiErrors.serverError(deleteError.message);
    }

    return successResponse({
      message: "Friend request rejected",
    });
  }
});

// -----------------------------------------------------------------------------
// DELETE /api/friends/[id]
// -----------------------------------------------------------------------------

/**
 * DELETE /api/friends/[id]
 *
 * Remove a friend or cancel a pending request.
 *
 * @authentication Required
 *
 * @param {string} id - Friendship ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {404} Friendship not found
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase, request }) => {
  // Extract friendship ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const friendshipId = pathParts[pathParts.length - 1];

  if (!friendshipId) {
    return ApiErrors.badRequest("Friendship ID is required");
  }

  // Fetch the friendship to verify ownership
  const { data: friendship, error: fetchError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", friendshipId)
    .single();

  if (fetchError || !friendship) {
    return ApiErrors.notFound("Friendship not found");
  }

  // Either party can remove the friendship
  if (friendship.user_id !== user.id && friendship.friend_id !== user.id) {
    return ApiErrors.notFound("Friendship not found");
  }

  // Delete the friendship
  const { error: deleteError } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  const message =
    friendship.status === "pending"
      ? "Friend request cancelled"
      : "Friend removed";

  return successResponse({ message });
});
