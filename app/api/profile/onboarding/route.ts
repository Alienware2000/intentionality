// =============================================================================
// ONBOARDING PROGRESS API ROUTE
// Handles fetching and updating user onboarding checklist progress.
// Stores progress in user_profiles.onboarding_progress (JSONB).
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { OnboardingProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type UpdateBody = {
  onboarding_progress: OnboardingProgress;
};

// Default progress for new users
const DEFAULT_PROGRESS: OnboardingProgress = {
  completed_steps: [],
  current_tier: 'essential',
  dismissed: false,
  started_at: new Date().toISOString(),
  completed_at: null,
};

// -----------------------------------------------------------------------------
// GET /api/profile/onboarding
// -----------------------------------------------------------------------------

/**
 * GET /api/profile/onboarding
 *
 * Fetches the user's onboarding progress.
 * Returns default progress if none exists.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {OnboardingProgress} progress - User's onboarding progress
 */
export const GET = withAuth(async ({ user, supabase }) => {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("onboarding_progress")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return ApiErrors.serverError(error.message);
  }

  // Return stored progress or default
  const progress: OnboardingProgress =
    profile?.onboarding_progress ?? DEFAULT_PROGRESS;

  return successResponse({ progress });
});

// -----------------------------------------------------------------------------
// PATCH /api/profile/onboarding
// -----------------------------------------------------------------------------

/**
 * PATCH /api/profile/onboarding
 *
 * Updates the user's onboarding progress.
 *
 * @authentication Required
 *
 * @body {OnboardingProgress} onboarding_progress - New progress state
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {OnboardingProgress} progress - Updated progress
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<UpdateBody>(request);

  if (!body?.onboarding_progress) {
    return ApiErrors.badRequest("onboarding_progress is required");
  }

  // Validate the progress structure
  const progress = body.onboarding_progress;
  if (!Array.isArray(progress.completed_steps)) {
    return ApiErrors.badRequest("completed_steps must be an array");
  }

  // Update the profile with new progress
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .update({ onboarding_progress: progress })
    .eq("user_id", user.id)
    .select("onboarding_progress")
    .single();

  if (error) {
    // If profile doesn't exist, create it with progress
    if (error.code === "PGRST116") {
      const { data: newProfile, error: createError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: user.id,
          xp_total: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_active_date: null,
          onboarding_progress: progress,
        })
        .select("onboarding_progress")
        .single();

      if (createError) {
        return ApiErrors.serverError(createError.message);
      }

      return successResponse({ progress: newProfile.onboarding_progress });
    }

    return ApiErrors.serverError(error.message);
  }

  return successResponse({ progress: profile.onboarding_progress });
});
