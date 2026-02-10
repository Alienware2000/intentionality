// =============================================================================
// GROUPS [ID] STATUS API ROUTE
// Update member's "currently working on" status.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
  parseJsonBody,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type StatusBody = {
  current_activity: string | null;
};

// -----------------------------------------------------------------------------
// PATCH /api/groups/[id]/status
// -----------------------------------------------------------------------------

/**
 * PATCH /api/groups/[id]/status
 *
 * Update the user's "currently working on" status in a group.
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 * @body {string | null} current_activity - Activity description or null to clear
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string | null} current_activity - Updated activity
 *
 * @throws {400} Invalid request
 * @throws {401} Not authenticated
 * @throws {403} Not a member
 * @throws {404} Group not found
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  const body = await parseJsonBody<StatusBody>(request);

  if (body === null || body.current_activity === undefined) {
    return ApiErrors.badRequest("current_activity is required");
  }

  // Validate and sanitize activity
  // Issue #10: Add XSS protection by stripping HTML-like content
  let activity = body.current_activity?.trim() || null;
  if (activity) {
    if (activity.length > 100) {
      return ApiErrors.badRequest("current_activity must be 100 characters or less");
    }
    // Basic sanitization: remove HTML tags and script-like content
    activity = activity
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers like onclick=
      .trim();

    // If sanitization left it empty, set to null
    if (!activity) {
      activity = null;
    }
  }

  // Check if user is a member and update
  const { data: membership, error: updateError } = await supabase
    .from("group_members")
    .update({
      current_activity: activity,
      current_activity_updated_at: new Date().toISOString(),
    })
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError || !membership) {
    if (updateError?.code === "PGRST116") {
      return ApiErrors.notFound("Group not found");
    }
    return ApiErrors.serverError(updateError?.message || "Failed to update status");
  }

  return successResponse({ current_activity: membership.current_activity });
});
