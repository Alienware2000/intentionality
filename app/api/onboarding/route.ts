// =============================================================================
// ONBOARDING API ROUTE
// Handles fetching and managing onboarding progress via metadata.
// Progress is stored in user_profiles.onboarding_progress JSON field.
// No actual quests or tasks are created - everything is virtual.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import {
  getOnboardingProgress,
  skipOnboarding,
  TOTAL_ONBOARDING_STEPS,
} from "@/app/lib/onboarding";
import type { OnboardingProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/onboarding (skip or migrate) */
type SkipOnboardingBody = {
  action: "skip";
};

/** Request body for migration from localStorage */
type MigrationBody = {
  action: "migrate";
  existingProgress?: OnboardingProgress;
};

/** Request body for resetting onboarding (re-show guide) */
type ResetOnboardingBody = {
  action: "reset";
};

type RequestBody = SkipOnboardingBody | MigrationBody | ResetOnboardingBody;

// -----------------------------------------------------------------------------
// GET /api/onboarding
// -----------------------------------------------------------------------------

/**
 * GET /api/onboarding
 *
 * Fetches the onboarding progress from user_profiles.onboarding_progress.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {OnboardingProgress} progress - The onboarding progress
 * @returns {string[]} completedSteps - Array of completed step IDs
 * @returns {number} completedCount - Number of completed steps
 * @returns {number} totalSteps - Total number of steps (8)
 * @returns {boolean} isAllComplete - Whether all steps are complete
 * @returns {boolean} isDismissed - Whether onboarding was dismissed/skipped
 */
export const GET = withAuth(async ({ user, supabase }) => {
  const progress = await getOnboardingProgress(supabase, user.id);

  const completedCount = progress.completed_steps.length;
  const isAllComplete = completedCount >= TOTAL_ONBOARDING_STEPS;
  const isDismissed = progress.dismissed;

  return successResponse({
    progress,
    completedSteps: progress.completed_steps,
    completedCount,
    totalSteps: TOTAL_ONBOARDING_STEPS,
    isAllComplete,
    isDismissed,
  });
});

// -----------------------------------------------------------------------------
// POST /api/onboarding
// -----------------------------------------------------------------------------

/**
 * POST /api/onboarding
 *
 * Handles onboarding actions:
 * - action: "skip" - Skips/dismisses the onboarding
 * - action: "migrate" - Migrates from localStorage progress
 * - action: "reset" - Resets progress and re-enables the guide
 *
 * @authentication Required
 *
 * @body {string} action - The action to perform ("skip", "migrate", or "reset")
 * @body {OnboardingProgress} [existingProgress] - Existing progress for migration
 *
 * @returns {Object} Response object
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<RequestBody>(request);

  if (!body?.action) {
    return ApiErrors.badRequest("Missing action");
  }

  if (body.action === "skip") {
    const success = await skipOnboarding(supabase, user.id);

    if (!success) {
      return ApiErrors.serverError("Failed to skip onboarding");
    }

    return successResponse({ skipped: true });
  }

  if (body.action === "migrate") {
    // Migration from localStorage - update progress with existing completed steps
    const migrationBody = body as MigrationBody;
    const existingProgress = migrationBody.existingProgress;

    if (existingProgress && existingProgress.completed_steps.length > 0) {
      // Update the user_profiles.onboarding_progress with the existing progress
      const { error } = await supabase
        .from("user_profiles")
        .update({ onboarding_progress: existingProgress })
        .eq("user_id", user.id);

      if (error) {
        return ApiErrors.serverError("Failed to migrate onboarding progress");
      }
    }

    // Fetch the updated progress
    const progress = await getOnboardingProgress(supabase, user.id);
    const completedCount = progress.completed_steps.length;
    const isAllComplete = completedCount >= TOTAL_ONBOARDING_STEPS;

    return successResponse({
      progress,
      completedSteps: progress.completed_steps,
      completedCount,
      totalSteps: TOTAL_ONBOARDING_STEPS,
      isAllComplete,
      isDismissed: progress.dismissed,
      migrated: true,
    });
  }

  if (body.action === "reset") {
    // Reset onboarding progress (re-enable guide)
    const resetProgress: OnboardingProgress = {
      completed_steps: [],
      dismissed: false,
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    const { error } = await supabase
      .from("user_profiles")
      .update({ onboarding_progress: resetProgress })
      .eq("user_id", user.id);

    if (error) {
      return ApiErrors.serverError("Failed to reset onboarding");
    }

    return successResponse({ reset: true });
  }

  return ApiErrors.badRequest("Invalid action");
});
