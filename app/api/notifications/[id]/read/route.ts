// =============================================================================
// NOTIFICATION READ API ROUTE
// Marks a single notification as read.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";

// -----------------------------------------------------------------------------
// PATCH /api/notifications/[id]/read
// -----------------------------------------------------------------------------

/**
 * PATCH /api/notifications/[id]/read
 *
 * Marks a notification as read.
 *
 * @authentication Required
 *
 * @param {string} id - Notification ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {404} Notification not found
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const notificationId = getParamFromUrl(request, "notifications");

  if (!notificationId) {
    return ApiErrors.badRequest("Notification ID is required");
  }

  // First check if notification exists and belongs to user
  const { data: existing, error: fetchError } = await supabase
    .from("notifications")
    .select("id, read_at")
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return ApiErrors.serverError(fetchError.message);
  }

  if (!existing) {
    return ApiErrors.notFound("Notification not found");
  }

  // Check if already read
  if (existing.read_at) {
    return successResponse({ message: "Notification was already read", already_read: true });
  }

  // Update the notification
  const { error: updateError } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ message: "Notification marked as read", already_read: false });
});
