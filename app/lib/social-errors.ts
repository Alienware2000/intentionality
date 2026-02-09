// =============================================================================
// SOCIAL ERRORS UTILITY
// Standardized error handling for social features.
// =============================================================================

/**
 * Extracts a user-friendly error message from various error types.
 *
 * @param error - The error to extract a message from
 * @param fallback - Default message if extraction fails
 * @returns A string message suitable for display to users
 *
 * @example
 * try {
 *   await sendFriendRequest(userId);
 * } catch (error) {
 *   showToast({ message: handleSocialError(error, "Failed to send request"), type: "error" });
 * }
 */
export function handleSocialError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

/**
 * Common social feature error messages.
 * Use these for consistency across the app.
 */
export const SOCIAL_ERROR_MESSAGES = {
  FRIEND_REQUEST_FAILED: "Failed to send friend request",
  FRIEND_ACCEPT_FAILED: "Failed to accept friend request",
  FRIEND_REJECT_FAILED: "Failed to decline friend request",
  FRIEND_REMOVE_FAILED: "Failed to remove friend",
  BLOCK_FAILED: "Failed to block user",
  UNBLOCK_FAILED: "Failed to unblock user",
  NUDGE_FAILED: "Failed to send nudge",
  SEARCH_FAILED: "Search failed",
  GROUP_CREATE_FAILED: "Failed to create group",
  GROUP_JOIN_FAILED: "Failed to join group",
  GROUP_LEAVE_FAILED: "Failed to leave group",
  PROFILE_UPDATE_FAILED: "Failed to update profile",
  NETWORK_ERROR: "Network error. Please try again.",
} as const;
