// =============================================================================
// USER PROFILE API ROUTE
// Handles gamification profile operations.
// Auto-creates profile if it doesn't exist.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getLocalDateString, getLevelFromXpV2 } from "@/app/lib/gamification";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/**
 * Request body for PATCH /api/profile
 */
type ProfileUpdateBody = {
  /** XP amount to add to total */
  xp_to_add?: number;
  /** Whether to update the daily streak */
  update_streak?: boolean;
  /** User's preferred display name */
  display_name?: string;
  /** User's unique username (3-20 chars, lowercase alphanumeric + underscores) */
  username?: string;
};

/** Username validation regex: 3-20 chars, lowercase alphanumeric + underscores, must start/end with alphanumeric */
const USERNAME_REGEX = /^[a-z0-9][a-z0-9_]*[a-z0-9]$|^[a-z0-9]{1,2}$/;

// -----------------------------------------------------------------------------
// GET /api/profile
// -----------------------------------------------------------------------------

/**
 * GET /api/profile
 *
 * Fetches the authenticated user's gamification profile.
 * Creates a new profile with defaults if none exists.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {UserProfile} profile - User's gamification profile
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase }) => {
  // Try to fetch existing profile
  const { data: profile, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If profile doesn't exist (PGRST116 = no rows returned), create one
  if (fetchError?.code === "PGRST116") {
    // Generate a default display name from user metadata or email
    const defaultDisplayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      (user.email ? user.email.split("@")[0] : null);

    const { data: newProfile, error: createError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        xp_total: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null,
        display_name: defaultDisplayName,
      })
      .select()
      .single();

    if (createError) {
      return ApiErrors.serverError(createError.message);
    }

    return successResponse({ profile: newProfile });
  }

  // Handle other database errors
  if (fetchError) {
    return ApiErrors.serverError(fetchError.message);
  }

  // Verify level matches XP total - auto-fix if out of sync
  const calculatedLevel = getLevelFromXpV2(profile.xp_total);
  if (calculatedLevel !== profile.level) {
    const { error: fixError } = await supabase
      .from("user_profiles")
      .update({ level: calculatedLevel })
      .eq("user_id", user.id);

    if (!fixError) {
      profile.level = calculatedLevel;
    }
  }

  return successResponse({ profile });
});

// -----------------------------------------------------------------------------
// PATCH /api/profile
// -----------------------------------------------------------------------------

/**
 * PATCH /api/profile
 *
 * Updates the user's gamification profile.
 * Used after task completion to award XP and update streaks.
 *
 * @authentication Required
 *
 * @body {number} [xp_to_add] - XP to add to total
 * @body {boolean} [update_streak] - Whether to update streak
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {UserProfile} profile - Updated profile
 * @returns {number} [xpGained] - XP added this request
 * @returns {boolean} [leveledUp] - True if user leveled up
 *
 * @throws {401} Not authenticated
 * @throws {404} Profile not found
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<ProfileUpdateBody>(request);
  const xp_to_add = body?.xp_to_add;
  const update_streak = body?.update_streak;
  const display_name = body?.display_name;

  // Fetch current profile
  const { data: currentProfile, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    return ApiErrors.notFound("Profile not found");
  }

  // Build updates object
  const today = getLocalDateString();
  const updates: Record<string, unknown> = {};

  // Calculate new XP and level if XP is being added
  if (xp_to_add && xp_to_add > 0) {
    const newXpTotal = currentProfile.xp_total + xp_to_add;
    const newLevel = getLevelFromXpV2(newXpTotal);

    updates.xp_total = newXpTotal;
    updates.level = newLevel;
  }

  // Update display name if provided
  if (display_name !== undefined) {
    updates.display_name = display_name.trim() || null;
  }

  // Update username if provided
  if (body?.username !== undefined) {
    const username = body.username.toLowerCase().trim();

    // Validate format
    if (username.length < 3 || username.length > 20) {
      return ApiErrors.badRequest("Username must be 3-20 characters");
    }
    if (!USERNAME_REGEX.test(username)) {
      return ApiErrors.badRequest(
        "Username can only contain lowercase letters, numbers, and underscores. Must start and end with a letter or number."
      );
    }

    // Check uniqueness (case-insensitive)
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("user_id")
      .ilike("username", username)
      .neq("user_id", user.id)
      .single();

    if (existing) {
      return ApiErrors.badRequest("Username is already taken");
    }

    updates.username = username;
  }

  // Update streak if requested
  if (update_streak) {
    const lastActive = currentProfile.last_active_date;

    // Only update if not already active today
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);

      // Calculate new streak
      const newStreak =
        lastActive === yesterdayStr
          ? currentProfile.current_streak + 1 // Consecutive day
          : 1; // Streak broken, start fresh

      updates.current_streak = newStreak;
      updates.last_active_date = today;

      // Update longest streak if this is a new record
      if (newStreak > currentProfile.longest_streak) {
        updates.longest_streak = newStreak;
      }
    }
  }

  // Apply updates if any changes
  if (Object.keys(updates).length > 0) {
    const { data: updatedProfile, error: updateError } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return ApiErrors.serverError(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      profile: updatedProfile,
      xpGained: xp_to_add,
      leveledUp: updatedProfile.level > currentProfile.level,
    });
  }

  // No changes needed
  return successResponse({ profile: currentProfile });
});
