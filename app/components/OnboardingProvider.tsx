"use client";

// =============================================================================
// ONBOARDING PROVIDER CONTEXT
// Global context for tracking onboarding progress across the app.
// Enables auto-completion of checklist steps when users perform actions.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useToast } from "./Toast";
import type { OnboardingStep, OnboardingProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const STORAGE_KEY = "intentionality_onboarding_progress";
const TOTAL_STEPS = 6;

// Human-readable labels for each step (used in toast messages)
const STEP_LABELS: Record<OnboardingStep, string> = {
  create_quest: "Create a Quest",
  add_task: "Add a Task",
  create_habit: "Create a Daily Habit",
  complete_task: "Complete a Task",
  brain_dump: "Try Brain Dump",
  focus_session: "Start a Focus Session",
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type OnboardingContextValue = {
  progress: OnboardingProgress | null;
  loading: boolean;
  markStepComplete: (step: OnboardingStep) => void;
  isStepComplete: (step: OnboardingStep) => boolean;
  isOnboardingDone: boolean;
  completedCount: number;
  refreshProgress: () => void;
};

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

// Helper to get initial progress from localStorage
function getInitialProgress(): OnboardingProgress {
  if (typeof window === "undefined") {
    return {
      completed_steps: [],
      dismissed: false,
      started_at: new Date().toISOString(),
      completed_at: null,
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Fall through to create fresh progress
  }

  // Initialize new progress
  const newProgress: OnboardingProgress = {
    completed_steps: [],
    dismissed: false,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  return newProgress;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Use lazy initializer to avoid effect for initial load
  const [progress, setProgress] = useState<OnboardingProgress | null>(() => getInitialProgress());
  const loading = false; // Always loaded since we use lazy initializer
  const { showToast } = useToast();

  // Refresh progress from localStorage (for manual refresh if needed)
  const refreshProgress = useCallback(() => {
    setProgress(getInitialProgress());
  }, []);

  // Update progress in localStorage and optionally sync to server
  const updateProgress = useCallback((newProgress: OnboardingProgress) => {
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));

    // Try to sync to server (silent fail is OK)
    fetch("/api/profile/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_progress: newProgress }),
    }).catch(() => {
      // Silent fail - localStorage is the primary source
    });
  }, []);

  // Mark a step as complete (with toast notification)
  const markStepComplete = useCallback(
    (step: OnboardingStep) => {
      if (!progress) return;
      if (progress.completed_steps.includes(step)) return;
      if (progress.dismissed) return;

      const newSteps = [...progress.completed_steps, step];
      const isAllComplete = newSteps.length === TOTAL_STEPS;

      const newProgress: OnboardingProgress = {
        ...progress,
        completed_steps: newSteps,
        completed_at: isAllComplete ? new Date().toISOString() : null,
      };

      updateProgress(newProgress);

      // Show toast notification for the completed step
      showToast({
        message: `Step completed: ${STEP_LABELS[step]}`,
        type: "success",
        duration: 3000,
      });

      // If all steps complete, show celebration toast
      if (isAllComplete) {
        setTimeout(() => {
          showToast({
            message: "You've completed the getting started guide!",
            type: "success",
            duration: 5000,
          });
        }, 500);
      }
    },
    [progress, updateProgress, showToast]
  );

  // Check if a specific step is complete
  const isStepComplete = useCallback(
    (step: OnboardingStep) => {
      return progress?.completed_steps.includes(step) ?? false;
    },
    [progress]
  );

  // Check if onboarding is done (all steps complete or dismissed)
  const isOnboardingDone =
    progress?.dismissed ||
    progress?.completed_steps.length === TOTAL_STEPS ||
    false;

  const completedCount = progress?.completed_steps.length ?? 0;

  return (
    <OnboardingContext.Provider
      value={{
        progress,
        loading,
        markStepComplete,
        isStepComplete,
        isOnboardingDone,
        completedCount,
        refreshProgress,
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
