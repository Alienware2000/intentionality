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

  // Update the notification (RLS ensures user can only update their own)
  const { data: updated, error: updateError } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null) // Only update if not already read
    .select("id")
    .maybeSingle();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  // If no row was updated, notification was either not found or already read
  if (!updated) {
    return successResponse({ message: "Notification was already read or not found" });
  }

  return successResponse({ message: "Notification marked as read" });
});
