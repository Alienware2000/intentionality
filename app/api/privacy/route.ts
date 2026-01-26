// =============================================================================
// PRIVACY SETTINGS API ROUTE
// Manages user privacy settings for social features.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
  parseJsonBody,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type PrivacySettings = {
  show_on_global_leaderboard: boolean;
  allow_friend_requests: boolean;
  show_xp: boolean;
  show_level: boolean;
  show_streak: boolean;
  show_achievements: boolean;
};

// -----------------------------------------------------------------------------
// GET /api/privacy
// -----------------------------------------------------------------------------

/**
 * GET /api/privacy
 *
 * Fetches the current user's privacy settings.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {PrivacySettings} settings - User's privacy settings
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase }) => {
  // Try to get existing settings
  const { data: settings, error } = await supabase
    .from("user_privacy_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If no settings exist, create defaults
  if (error?.code === "PGRST116") {
    const defaultSettings: PrivacySettings = {
      show_on_global_leaderboard: true,
      allow_friend_requests: true,
      show_xp: true,
      show_level: true,
      show_streak: true,
      show_achievements: true,
    };

    const { data: created, error: createError } = await supabase
      .from("user_privacy_settings")
      .insert({
        user_id: user.id,
        ...defaultSettings,
      })
      .select()
      .single();

    if (createError) {
      return ApiErrors.serverError(createError.message);
    }

    return successResponse({ settings: created });
  }

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ settings });
});

// -----------------------------------------------------------------------------
// PATCH /api/privacy
// -----------------------------------------------------------------------------

/**
 * PATCH /api/privacy
 *
 * Updates the current user's privacy settings.
 *
 * @authentication Required
 *
 * @body {boolean} [show_on_global_leaderboard] - Appear on global leaderboard
 * @body {boolean} [allow_friend_requests] - Allow friend requests
 * @body {boolean} [show_xp] - Show XP to friends
 * @body {boolean} [show_level] - Show level to friends
 * @body {boolean} [show_streak] - Show streak to friends
 * @body {boolean} [show_achievements] - Show achievements to friends
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {PrivacySettings} settings - Updated privacy settings
 *
 * @throws {401} Not authenticated
 * @throws {400} Invalid request body
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<Partial<PrivacySettings>>(request);

  if (!body) {
    return ApiErrors.badRequest("Request body is required");
  }

  // Validate fields
  const allowedFields = [
    "show_on_global_leaderboard",
    "allow_friend_requests",
    "show_xp",
    "show_level",
    "show_streak",
    "show_achievements",
  ];

  const updates: Record<string, boolean> = {};
  for (const field of allowedFields) {
    if (field in body) {
      const value = body[field as keyof PrivacySettings];
      if (typeof value !== "boolean") {
        return ApiErrors.badRequest(`${field} must be a boolean`);
      }
      updates[field] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return ApiErrors.badRequest("No valid fields to update");
  }

  // Upsert settings (create if not exists, update if exists)
  const { data: settings, error } = await supabase
    .from("user_privacy_settings")
    .upsert(
      {
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ settings });
});
