// =============================================================================
// ONBOARDING HELPER FUNCTIONS
// Centralized utilities for the metadata-based onboarding system.
// Progress is stored in user_profiles.onboarding_progress JSON field.
// No actual tasks or quests are created - everything is virtual.
//
// TIERED PROGRESSIVE ONBOARDING:
// - Tier 1 (Essential): 3 steps shown immediately
// - Tier 2 (Power User): 3 steps unlocked after Tier 1 complete
// - Social Discovery: Contextual card after level 2 or 5 tasks (separate)
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingStep, OnboardingProgress, OnboardingTier } from "./types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Title of the virtual onboarding quest */
export const ONBOARDING_QUEST_TITLE = "Your First Steps";

/**
 * Configuration for a single onboarding step with tier metadata.
 */
export type OnboardingStepConfig = {
  id: OnboardingStep;
  tier: OnboardingTier;
  title: string;
  description: string;
  icon: string;  // Icon name for dynamic lookup
  actionLabel: string;
  actionHref?: string;
};

/**
 * Tier 1: Essential Steps (3 steps) - shown immediately to new users.
 * These cover the core workflow: Quests → Tasks → Focus.
 */
export const ESSENTIAL_STEPS: OnboardingStepConfig[] = [
  {
    id: "create_quest",
    tier: "essential",
    title: "Create a Quest",
    description: "Quests organize your tasks by goal or project",
    icon: "Target",
    actionLabel: "Go to Quests",
    actionHref: "/quests",
  },
  {
    id: "add_task",
    tier: "essential",
    title: "Add a Task",
    description: "Break down quests into actionable items",
    icon: "CheckSquare",
    actionLabel: "Add Task",
    actionHref: "/quests",
  },
  {
    id: "focus_session",
    tier: "essential",
    title: "Start a Focus Session",
    description: "Use Pomodoro to stay focused and earn XP",
    icon: "Zap",
    actionLabel: "Start Focus",
    actionHref: "/dashboard?section=focus",
  },
];

/**
 * Tier 2: Power User Steps (3 steps) - unlocked after Tier 1 complete.
 * These introduce advanced features: Habits, Brain Dump, AI.
 */
export const POWER_STEPS: OnboardingStepConfig[] = [
  {
    id: "create_habit",
    tier: "power",
    title: "Create a Daily Habit",
    description: "Build consistency with recurring habits",
    icon: "Flame",
    actionLabel: "View Habits",
    actionHref: "/dashboard?section=habits",
  },
  {
    id: "brain_dump",
    tier: "power",
    title: "Try Brain Dump",
    description: "Press Ctrl+K to quickly capture thoughts",
    icon: "Brain",
    actionLabel: "Open Inbox",
    actionHref: "/inbox",
  },
  {
    id: "meet_kofi",
    tier: "power",
    title: "Chat with Kofi",
    description: "Your AI assistant for productivity advice",
    icon: "Sparkles",
    actionLabel: "Say Hi",
    // No href - handled via onClick to open chat
  },
];

/**
 * All active onboarding steps (Tier 1 + Tier 2).
 * Legacy steps (complete_task, weekly_plan, daily_review) are not included.
 */
export const ALL_ONBOARDING_STEPS = [...ESSENTIAL_STEPS, ...POWER_STEPS];

/** Total number of essential (Tier 1) steps */
export const TOTAL_ESSENTIAL_STEPS = ESSENTIAL_STEPS.length;

/** Total number of power user (Tier 2) steps */
export const TOTAL_POWER_STEPS = POWER_STEPS.length;

/** Total number of active onboarding steps (Tier 1 + Tier 2) */
export const TOTAL_ONBOARDING_STEPS = ALL_ONBOARDING_STEPS.length;

/**
 * Legacy step definitions for backward compatibility.
 * These are kept for existing users who may have completed them.
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
  {
    id: "meet_kofi",
    title: "Chat with Kofi",
    description: "Say hi to your AI assistant",
  },
];

// Map step IDs to array indices for quick lookup
const STEP_INDEX_MAP = new Map(
  ONBOARDING_STEPS.map((step, idx) => [step.id, idx])
);

// -----------------------------------------------------------------------------
// Tier Helper Functions
// -----------------------------------------------------------------------------

/**
 * Check if Tier 1 (Essential) is complete.
 * @param completedSteps - Array of completed step IDs
 * @returns true if all essential steps are complete
 */
export function isTier1Complete(completedSteps: OnboardingStep[]): boolean {
  return ESSENTIAL_STEPS.every(step => completedSteps.includes(step.id));
}

/**
 * Check if Tier 2 (Power User) is complete.
 * @param completedSteps - Array of completed step IDs
 * @returns true if all power user steps are complete
 */
export function isTier2Complete(completedSteps: OnboardingStep[]): boolean {
  return POWER_STEPS.every(step => completedSteps.includes(step.id));
}

/**
 * Count completed steps in Tier 1.
 * @param completedSteps - Array of completed step IDs
 * @returns number of completed essential steps
 */
export function countTier1Complete(completedSteps: OnboardingStep[]): number {
  return ESSENTIAL_STEPS.filter(step => completedSteps.includes(step.id)).length;
}

/**
 * Count completed steps in Tier 2.
 * @param completedSteps - Array of completed step IDs
 * @returns number of completed power user steps
 */
export function countTier2Complete(completedSteps: OnboardingStep[]): number {
  return POWER_STEPS.filter(step => completedSteps.includes(step.id)).length;
}

/**
 * Determine current tier based on progress.
 * @param completedSteps - Array of completed step IDs
 * @param isDismissed - Whether onboarding was dismissed
 * @returns current tier
 */
export function getCurrentTier(completedSteps: OnboardingStep[], isDismissed: boolean): OnboardingTier {
  if (isDismissed) return 'complete';
  if (isTier1Complete(completedSteps) && isTier2Complete(completedSteps)) return 'complete';
  if (isTier1Complete(completedSteps)) return 'power';
  return 'essential';
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Default onboarding progress for new users */
const DEFAULT_PROGRESS: OnboardingProgress = {
  completed_steps: [],
  current_tier: 'essential',
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
  const allComplete = isTier1Complete(newCompletedSteps) && isTier2Complete(newCompletedSteps);
  const newTier = getCurrentTier(newCompletedSteps, false);

  // Build updated progress
  const updatedProgress: OnboardingProgress = {
    ...progress,
    completed_steps: newCompletedSteps,
    current_tier: newTier,
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
    current_tier: 'complete',
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
