"use client";

// =============================================================================
// GETTING STARTED CHECKLIST COMPONENT
// Persistent onboarding checklist that guides new users through key features.
// Shows on dashboard until all steps are completed or dismissed.
// Uses OnboardingProvider for state management across the app.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  CheckSquare,
  Flame,
  Brain,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useOnboarding } from "./OnboardingProvider";
import type { OnboardingStep, OnboardingProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

type StepConfig = {
  id: OnboardingStep;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
};

const STEPS: StepConfig[] = [
  {
    id: "create_quest",
    icon: Target,
    iconColor: "text-[var(--accent-primary)]",
    title: "Create a Quest",
    description: "Quests are your big goals. Each contains related tasks.",
    actionLabel: "Go to Quests",
    actionHref: "/quests",
  },
  {
    id: "add_task",
    icon: CheckSquare,
    iconColor: "text-[var(--accent-success)]",
    title: "Add a Task",
    description: "Break down quests into actionable items with due dates.",
    actionLabel: "Add Task",
    actionHref: "/quests",
  },
  {
    id: "create_habit",
    icon: Flame,
    iconColor: "text-[var(--accent-streak)]",
    title: "Create a Daily Habit",
    description: "Build consistency with recurring daily habits.",
    actionLabel: "View Dashboard",
    actionHref: "/",
  },
  {
    id: "complete_task",
    icon: Check,
    iconColor: "text-[var(--accent-success)]",
    title: "Complete a Task",
    description: "Check off a task to earn XP and build your streak.",
    actionLabel: "View Tasks",
    actionHref: "/",
  },
  {
    id: "brain_dump",
    icon: Brain,
    iconColor: "text-[var(--accent-primary)]",
    title: "Try Brain Dump",
    description: "Press Ctrl+K to quickly capture thoughts anytime.",
    actionLabel: "Open Inbox",
    actionHref: "/inbox",
  },
  {
    id: "focus_session",
    icon: Zap,
    iconColor: "text-[var(--accent-highlight)]",
    title: "Start a Focus Session",
    description: "Use the Pomodoro timer to stay focused and earn XP.",
    actionLabel: "Start Focus",
    actionHref: "/",
  },
];

const STORAGE_KEY = "intentionality_onboarding_progress";
const COLLAPSE_FLAG_KEY = "intentionality_onboarding_collapsed";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

type Props = {
  onDismiss?: () => void;
};

/**
 * GettingStartedChecklist displays an interactive checklist for new users.
 * Uses OnboardingProvider for global state management.
 * Steps auto-complete when users perform actions across the app.
 */
export default function GettingStartedChecklist({ onDismiss }: Props) {
  const { progress, loading, isOnboardingDone, isStepComplete, completedCount } = useOnboarding();

  // Initialize collapsed state from localStorage or if user has progress
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    // Check localStorage flag
    if (localStorage.getItem(COLLAPSE_FLAG_KEY) === "true") return true;
    // Will be updated when progress loads if needed
    return false;
  });
  const [recentlyCompleted, setRecentlyCompleted] = useState<OnboardingStep | null>(null);

  // Track completed steps to detect new completions
  const prevCompletedStepsRef = useRef<OnboardingStep[]>([]);

  // Track if we've already checked progress for initial collapse
  const hasCheckedProgressRef = useRef(false);

  // Auto-collapse when progress loads if user has completed steps
  // Note: This is a legitimate initialization pattern that requires setState in effect
  useEffect(() => {
    if (hasCheckedProgressRef.current || !progress) return;
    hasCheckedProgressRef.current = true;

    if (progress.completed_steps.length > 0 && !isCollapsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(true);
    }
  }, [progress, isCollapsed]);

  // Detect when a step is newly completed and show animation
  useEffect(() => {
    if (!progress) return;

    const prevSteps = prevCompletedStepsRef.current;
    const newSteps = progress.completed_steps.filter(
      step => !prevSteps.includes(step)
    );

    if (newSteps.length > 0) {
      // Show the most recent completion
      setRecentlyCompleted(newSteps[newSteps.length - 1]);
      // Clear after animation
      const timer = setTimeout(() => setRecentlyCompleted(null), 2000);
      prevCompletedStepsRef.current = progress.completed_steps;
      return () => clearTimeout(timer);
    }

    prevCompletedStepsRef.current = progress.completed_steps;
  }, [progress?.completed_steps, progress]);

  // Save collapsed state
  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem(COLLAPSE_FLAG_KEY, String(newCollapsed));
  }, [isCollapsed]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    if (!progress) return;

    const newProgress: OnboardingProgress = {
      ...progress,
      dismissed: true,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));

    // Sync to server
    fetch("/api/profile/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_progress: newProgress }),
    }).catch(() => {});

    onDismiss?.();
    // Force a page reload to hide the checklist (since we can't update provider state directly)
    window.location.reload();
  }, [progress, onDismiss]);

  // Don't render if loading, no progress, dismissed, or all complete
  if (loading) return null;
  if (!progress) return null;
  if (isOnboardingDone) return null;

  const progressPercent = (completedCount / STEPS.length) * 100;

  return (
    <motion.div
      className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
      animate={recentlyCompleted ? { scale: [1, 1.01, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={handleToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg bg-[var(--accent-primary)]/10",
            recentlyCompleted && "animate-pulse"
          )}>
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">
              Getting Started
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {completedCount}/{STEPS.length} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-label="Dismiss checklist"
          >
            <X size={16} />
          </button>
          {isCollapsed ? (
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          ) : (
            <ChevronUp size={18} className="text-[var(--text-muted)]" />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--bg-elevated)]">
        <motion.div
          className="h-full bg-[var(--accent-primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Checklist items */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {STEPS.map((step) => {
                const isComplete = isStepComplete(step.id);
                const isRecentlyCompleted = recentlyCompleted === step.id;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      isComplete
                        ? "bg-[var(--accent-success)]/10"
                        : "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                    )}
                    animate={isRecentlyCompleted ? {
                      scale: [1, 1.02, 1],
                      backgroundColor: ["rgba(34, 197, 94, 0)", "rgba(34, 197, 94, 0.2)", "rgba(34, 197, 94, 0.1)"]
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Checkbox / Icon */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                        isComplete
                          ? "bg-[var(--accent-success)] text-white"
                          : "bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                      )}
                    >
                      {isComplete ? (
                        <motion.div
                          initial={isRecentlyCompleted ? { scale: 0 } : { scale: 1 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        >
                          <Check size={16} />
                        </motion.div>
                      ) : (
                        <Icon size={16} className={step.iconColor} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isComplete
                            ? "text-[var(--accent-success)] line-through"
                            : "text-[var(--text-primary)]"
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {step.description}
                      </p>
                    </div>

                    {/* Action button - only show for incomplete steps */}
                    {!isComplete && step.actionHref && (
                      <a
                        href={step.actionHref}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-lg",
                          "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                          "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                          "hover:border-[var(--border-default)] transition-colors",
                          "flex-shrink-0"
                        )}
                      >
                        {step.actionLabel}
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Keyboard hint */}
            <div className="px-4 pb-4">
              <p className="text-xs text-[var(--text-muted)] text-center">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono text-[10px]">
                  Ctrl+K
                </kbd>{" "}
                anytime for quick capture
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
