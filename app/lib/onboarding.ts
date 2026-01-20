// =============================================================================
// ONBOARDING HELPER FUNCTIONS
// Centralized utilities for the metadata-based onboarding system.
// Progress is stored in user_profiles.onboarding_progress JSON field.
// No actual tasks or quests are created - everything is virtual.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingStep, OnboardingProgress } from "./types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Title of the virtual onboarding quest */
export const ONBOARDING_QUEST_TITLE = "Your First Steps";

/** Total number of onboarding steps */
export const TOTAL_ONBOARDING_STEPS = 8;

/**
 * Definition of all onboarding steps with their descriptions.
 * Order matters - this determines the order in the checklist.
 */
export const ONBOARDING_STEPS: Array<{
  id: OnboardingStep;
  title: string;
  description: string;
}> = [
  {
    id: "create_quest",
    title: "Create a Quest",
    description: "Create your first quest to organize your tasks",
  },
  {
    id: "add_task",
    title: "Add a Task",
    description: "Add a task to one of your quests",
  },
  {
    id: "create_habit",
    title: "Create a Daily Habit",
    description: "Create a daily habit to track",
  },
  {
    id: "complete_task",
    title: "Complete a Task",
    description: "Mark a task as complete",
  },
  {
    id: "brain_dump",
    title: "Try Brain Dump",
    description: "Capture a thought with Ctrl+K",
  },
  {
    id: "focus_session",
    title: "Start a Focus Session",
    description: "Complete a Pomodoro focus session",
  },
  {
    id: "weekly_plan",
    title: "Complete Weekly Planning",
    description: "Set your goals for the week",
  },
  {
    id: "daily_review",
    title: "Complete Daily Review",
    description: "Reflect on your day",
  },
];

// Map step IDs to array indices for quick lookup
const STEP_INDEX_MAP = new Map(
  ONBOARDING_STEPS.map((step, idx) => [step.id, idx])
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Default onboarding progress for new users */
const DEFAULT_PROGRESS: OnboardingProgress = {
  completed_steps: [],
  dismissed: false,
  started_at: new Date().toISOString(),
  completed_at: null,
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Gets the onboarding progress for a user from user_profiles.
 * Returns default progress if none exists.
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns The user's onboarding progress
 */
export async function getOnboardingProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<OnboardingProgress> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_progress")
    .eq("user_id", userId)
    .single();

  if (!profile?.onboarding_progress) {
    return { ...DEFAULT_PROGRESS, started_at: new Date().toISOString() };
  }

  return profile.onboarding_progress as OnboardingProgress;
}

/**
 * Marks an onboarding step as complete.
 * Updates the user_profiles.onboarding_progress JSON field.
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param step - The onboarding step to mark complete
 * @returns Whether the step was marked complete and if all steps are now complete
 */
export async function markOnboardingStepComplete(
  supabase: SupabaseClient,
  userId: string,
  step: OnboardingStep
): Promise<{ marked: boolean; allComplete: boolean }> {
  // Fetch current progress
  const progress = await getOnboardingProgress(supabase, userId);

  // Skip if already dismissed
  if (progress.dismissed) {
    return { marked: false, allComplete: false };
  }

  // Skip if step already complete
  if (progress.completed_steps.includes(step)) {
    const allComplete = progress.completed_steps.length >= TOTAL_ONBOARDING_STEPS;
    return { marked: false, allComplete };
  }

  // Add step to completed
  const newCompletedSteps = [...progress.completed_steps, step];
  const allComplete = newCompletedSteps.length >= TOTAL_ONBOARDING_STEPS;

  // Build updated progress
  const updatedProgress: OnboardingProgress = {
    ...progress,
    completed_steps: newCompletedSteps,
    completed_at: allComplete ? new Date().toISOString() : null,
  };

  // Update profile
  const { error } = await supabase
    .from("user_profiles")
    .update({ onboarding_progress: updatedProgress })
    .eq("user_id", userId);

  if (error) {
    console.error("Error marking onboarding step complete:", error);
    return { marked: false, allComplete: false };
  }

  return { marked: true, allComplete };
}

/**
 * Skips/dismisses the onboarding by setting dismissed: true.
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Whether the skip was successful
 */
export async function skipOnboarding(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Fetch current progress
  const progress = await getOnboardingProgress(supabase, userId);

  // Update with dismissed flag
  const updatedProgress: OnboardingProgress = {
    ...progress,
    dismissed: true,
  };

  const { error } = await supabase
    .from("user_profiles")
    .update({ onboarding_progress: updatedProgress })
    .eq("user_id", userId);

  if (error) {
    console.error("Error skipping onboarding:", error);
    return false;
  }

  return true;
}

/**
 * Gets the index of an onboarding step (for ordering).
 *
 * @param step - The step ID
 * @returns The index or -1 if not found
 */
export function getStepIndex(step: OnboardingStep): number {
  return STEP_INDEX_MAP.get(step) ?? -1;
}

/**
 * Gets an array of all onboarding step IDs in order.
 */
export function getAllStepIds(): OnboardingStep[] {
  return ONBOARDING_STEPS.map((s) => s.id);
}
