// =============================================================================
// NOTIFICATIONS API ROUTE
// Handles fetching and managing social notifications.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  parseIntParam,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { NotificationWithSender } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/notifications
// -----------------------------------------------------------------------------

/**
 * GET /api/notifications
 *
 * Fetches notifications for the current user.
 *
 * @authentication Required
 *
 * @query {number} [limit=50] - Max results
 * @query {boolean} [unread_only=false] - Only return unread notifications
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {NotificationWithSender[]} notifications - Notifications with sender info
 * @returns {number} unread_count - Total unread notifications
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const limit = parseIntParam(params.get("limit"), 50, 1, 100);
  const unreadOnly = params.get("unread_only") === "true";

  // Build query
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data: notifications, error: notificationsError } = await query;

  if (notificationsError) {
    return ApiErrors.serverError(notificationsError.message);
  }

  // Get sender profiles
  const senderIds = [
    ...new Set(
      notifications
        ?.filter((n) => n.from_user_id)
        .map((n) => n.from_user_id) ?? []
    ),
  ];

  let senderProfiles: Map<string, { display_name: string | null; level: number }> = new Map();

  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, level")
      .in("user_id", senderIds);

    senderProfiles = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
  }

  // Build notifications with sender info
  const notificationsWithSender: NotificationWithSender[] = (notifications ?? []).map((n) => {
    const sender = n.from_user_id ? senderProfiles.get(n.from_user_id) : null;
    return {
      ...n,
      from_display_name: sender?.display_name ?? null,
      from_level: sender?.level ?? null,
    };
  });

  // Get total unread count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return successResponse({
    notifications: notificationsWithSender,
    unread_count: unreadCount ?? 0,
  });
});
