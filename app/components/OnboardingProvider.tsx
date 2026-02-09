"use client";

// =============================================================================
// ONBOARDING PROVIDER CONTEXT
// Global context for tracking onboarding progress across the app.
// Uses metadata stored in user_profiles.onboarding_progress JSON field.
// No actual tasks or quests are created - everything is virtual.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useToast } from "./Toast";
import type { OnboardingStep, OnboardingProgress, OnboardingTier } from "@/app/lib/types";
import {
  TOTAL_ONBOARDING_STEPS,
  TOTAL_ESSENTIAL_STEPS,
  TOTAL_POWER_STEPS,
  isTier1Complete as checkTier1Complete,
  countTier1Complete,
  countTier2Complete,
  getCurrentTier,
} from "@/app/lib/onboarding";
import { fetchApi, getErrorMessage } from "@/app/lib/api";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const STORAGE_KEY = "intentionality_onboarding_progress";

// Human-readable labels for each step (used in toast messages)
const STEP_LABELS: Record<OnboardingStep, string> = {
  create_quest: "Create a Quest",
  add_task: "Add a Task",
  create_habit: "Create a Daily Habit",
  complete_task: "Complete a Task",
  brain_dump: "Try Brain Dump",
  focus_session: "Start a Focus Session",
  weekly_plan: "Complete Weekly Planning",
  daily_review: "Complete Daily Review",
  meet_kofi: "Chat with Kofi",
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type OnboardingApiResponse = {
  ok: true;
  progress: OnboardingProgress;
  completedSteps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  isAllComplete: boolean;
  isDismissed: boolean;
  migrated?: boolean;
};

type OnboardingContextValue = {
  loading: boolean;
  isOnboardingDone: boolean;
  completedSteps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  isStepComplete: (step: OnboardingStep) => boolean;
  skipOnboarding: () => Promise<void>;
  refreshOnboarding: () => Promise<void>;
  // Legacy: markStepComplete for backward compatibility in case any component still calls it
  // This is now a no-op locally since APIs handle step completion
  markStepComplete: (step: OnboardingStep) => void;
  // Tier tracking for progressive onboarding
  currentTier: OnboardingTier;
  isTier1Complete: boolean;
  tier1CompletedCount: number;
  tier2CompletedCount: number;
  totalEssentialSteps: number;
  totalPowerSteps: number;
};

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Read existing progress from localStorage for migration.
 * Returns null if no progress exists.
 */
function getLocalStorageProgress(): OnboardingProgress | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

/**
 * Clear localStorage progress after migration.
 */
function clearLocalStorageProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const { showToast } = useToast();

  // Fetch onboarding data from API
  const fetchOnboarding = useCallback(async (existingProgress?: OnboardingProgress | null) => {
    try {
      let data: OnboardingApiResponse;

      if (existingProgress && existingProgress.completed_steps.length > 0) {
        // Migrate from localStorage
        data = await fetchApi<OnboardingApiResponse>("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "migrate",
            existingProgress,
          }),
        });

        // Clear localStorage after successful migration
        if (data.migrated) {
          clearLocalStorageProgress();
        }
      } else {
        // Normal fetch
        data = await fetchApi<OnboardingApiResponse>("/api/onboarding");
      }

      setCompletedSteps(data.completedSteps);
      setIsDismissed(data.isDismissed || data.isAllComplete);
    } catch (error) {
      // If the API fails, treat as onboarding complete so the app continues to work
      console.warn("Onboarding API error:", getErrorMessage(error));
      setIsDismissed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Check for localStorage progress to migrate
    const localProgress = getLocalStorageProgress();
    fetchOnboarding(localProgress);
  }, [fetchOnboarding]);

  // Listen for external refresh requests (e.g., from AIProvider after marking meet_kofi step)
  useEffect(() => {
    const handleRefresh = () => {
      fetchOnboarding();
    };

    window.addEventListener('onboarding-refresh', handleRefresh);
    return () => window.removeEventListener('onboarding-refresh', handleRefresh);
  }, [fetchOnboarding]);

  // Refresh onboarding data
  const refreshOnboarding = useCallback(async () => {
    setLoading(true);
    await fetchOnboarding();
  }, [fetchOnboarding]);

  // Skip onboarding
  const skipOnboarding = useCallback(async () => {
    try {
      await fetchApi("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip" }),
      });

      // Clear localStorage too
      clearLocalStorageProgress();

      setIsDismissed(true);

      showToast({
        message: "Getting started guide dismissed",
        type: "default",
        duration: 3000,
      });
    } catch {
      showToast({
        message: "Failed to skip onboarding",
        type: "error",
        duration: 3000,
      });
    }
  }, [showToast]);

  // Check if a specific step is complete
  const isStepComplete = useCallback(
    (step: OnboardingStep) => {
      return completedSteps.includes(step);
    },
    [completedSteps]
  );

  // Legacy: markStepComplete - optimistically update UI when a step is completed via API
  // The actual step completion happens in the various API routes that call markOnboardingStepComplete
  const markStepComplete = useCallback(
    (step: OnboardingStep) => {
      // Check if already complete
      if (completedSteps.includes(step)) return;
      if (isDismissed) return;

      // Show toast notification
      showToast({
        message: `Step completed: ${STEP_LABELS[step]}`,
        type: "success",
        duration: 3000,
      });

      // Optimistically update local state
      setCompletedSteps((prev) => {
        const newSteps = [...prev, step];
        const newCount = newSteps.length;

        // Check if all steps complete
        if (newCount >= TOTAL_ONBOARDING_STEPS) {
          setIsDismissed(true);
          setTimeout(() => {
            showToast({
              message: "You've completed the getting started guide!",
              type: "success",
              duration: 5000,
            });
          }, 500);
        }

        return newSteps;
      });
    },
    [completedSteps, isDismissed, showToast]
  );

  // Compute tier status
  const tier1CompletedCount = countTier1Complete(completedSteps);
  const tier2CompletedCount = countTier2Complete(completedSteps);
  const isTier1Complete = checkTier1Complete(completedSteps);
  const currentTier = getCurrentTier(completedSteps, isDismissed);

  // Check if onboarding is done (dismissed or all complete)
  const completedCount = completedSteps.length;
  const isOnboardingDone = isDismissed || currentTier === 'complete';

  return (
    <OnboardingContext.Provider
      value={{
        loading,
        isOnboardingDone,
        completedSteps,
        completedCount,
        totalSteps: TOTAL_ONBOARDING_STEPS,
        isStepComplete,
        skipOnboarding,
        refreshOnboarding,
        markStepComplete,
        currentTier,
        isTier1Complete,
        tier1CompletedCount,
        tier2CompletedCount,
        totalEssentialSteps: TOTAL_ESSENTIAL_STEPS,
        totalPowerSteps: TOTAL_POWER_STEPS,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
