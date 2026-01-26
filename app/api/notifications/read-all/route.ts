// =============================================================================
// NOTIFICATIONS READ ALL API ROUTE
// Marks all notifications as read.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// POST /api/notifications/read-all
// -----------------------------------------------------------------------------

/**
 * POST /api/notifications/read-all
 *
 * Marks all unread notifications as read.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} count - Number of notifications marked as read
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase }) => {
  // Get count of unread notifications first
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  // Mark all as read
  const { error: updateError } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({
    message: "All notifications marked as read",
    count: unreadCount ?? 0,
  });
});
