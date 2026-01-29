"use client";

// =============================================================================
// GETTING STARTED CHECKLIST COMPONENT
// Persistent onboarding checklist that guides new users through key features.
// Shows on dashboard until all steps are completed or dismissed.
// Uses OnboardingProvider for state management across the app.
// Includes name input step for personalized greetings.
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
  ClipboardList,
  BookOpen,
  User,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useOnboarding } from "./OnboardingProvider";
import { useProfile } from "./ProfileProvider";
import type { OnboardingStep } from "@/app/lib/types";
import ConfirmModal from "./ConfirmModal";

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
    description: "Press Ctrl+K (or tap the button) to quickly capture thoughts.",
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
  {
    id: "weekly_plan",
    icon: ClipboardList,
    iconColor: "text-[var(--accent-primary)]",
    title: "Complete Weekly Planning",
    description: "Set your goals and focus areas for the week.",
    actionLabel: "Go to Week",
    actionHref: "/week",
  },
  {
    id: "daily_review",
    icon: BookOpen,
    iconColor: "text-[var(--accent-success)]",
    title: "Complete Daily Review",
    description: "Reflect on your day and plan tomorrow.",
    actionLabel: "Start Review",
    actionHref: "/review",
  },
];

const COLLAPSE_FLAG_KEY = "intentionality_onboarding_collapsed";
const NAME_ASKED_KEY = "intentionality_name_asked";

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
 * Includes name input step for personalized greetings.
 */
export default function GettingStartedChecklist({ onDismiss }: Props) {
  const { loading, isOnboardingDone, isStepComplete, completedCount, totalSteps, skipOnboarding } = useOnboarding();
  const { profile, refreshProfile } = useProfile();

  // Name input step state
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Initialize collapsed state from localStorage or if user has progress
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    // Check localStorage flag
    if (localStorage.getItem(COLLAPSE_FLAG_KEY) === "true") return true;
    // Will be updated when progress loads if needed
    return false;
  });
  const [recentlyCompleted, setRecentlyCompleted] = useState<OnboardingStep | null>(null);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  // Track completed steps to detect new completions
  const prevCompletedCountRef = useRef<number>(0);

  // Track if we've already checked progress for initial collapse
  const hasCheckedProgressRef = useRef(false);

  // Check if we should show name input (first-time users)
  useEffect(() => {
    if (loading || !profile) return;

    // Show name input if:
    // 1. User doesn't have a display_name set
    // 2. We haven't asked before (check localStorage)
    const hasAskedBefore = localStorage.getItem(NAME_ASKED_KEY) === "true";
    if (!profile.display_name && !hasAskedBefore && completedCount === 0) {
      setShowNameInput(true);
    }
  }, [loading, profile, completedCount]);

  // Handle saving name
  const handleSaveName = useCallback(async () => {
    if (savingName) return;

    setSavingName(true);
    try {
      const trimmedName = nameValue.trim();
      if (trimmedName) {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: trimmedName }),
        });
        await refreshProfile();
      }
      localStorage.setItem(NAME_ASKED_KEY, "true");
      setShowNameInput(false);
    } catch {
      // Silent fail - user can still proceed
      localStorage.setItem(NAME_ASKED_KEY, "true");
      setShowNameInput(false);
    } finally {
      setSavingName(false);
    }
  }, [nameValue, savingName, refreshProfile]);

  // Handle skipping name input
  const handleSkipName = useCallback(() => {
    localStorage.setItem(NAME_ASKED_KEY, "true");
    setShowNameInput(false);
  }, []);

  // Auto-collapse when progress loads if user has completed steps
  // Note: This is a legitimate initialization pattern that requires setState in effect
  useEffect(() => {
    if (hasCheckedProgressRef.current || loading) return;
    hasCheckedProgressRef.current = true;

    if (completedCount > 0 && !isCollapsed) {
       
      setIsCollapsed(true);
    }
  }, [completedCount, loading, isCollapsed]);

  // Detect when a step is newly completed and show animation
  // Note: This is a legitimate animation trigger pattern that requires setState in effect
  useEffect(() => {
    if (loading) return;

    const prevCount = prevCompletedCountRef.current;

    if (completedCount > prevCount) {
      // Find a newly completed step
      for (const step of STEPS) {
        if (isStepComplete(step.id)) {
          // Show the most recent completion animation
           
          setRecentlyCompleted(step.id);
          // Clear after animation
          const timer = setTimeout(() => setRecentlyCompleted(null), 2000);
          prevCompletedCountRef.current = completedCount;
          return () => clearTimeout(timer);
        }
      }
    }

    prevCompletedCountRef.current = completedCount;
  }, [completedCount, loading, isStepComplete]);

  // Save collapsed state
  const handleToggleCollapse = useCallback(() => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem(COLLAPSE_FLAG_KEY, String(newCollapsed));
  }, [isCollapsed]);

  // Handle dismiss with confirmation
  const handleDismissClick = useCallback(() => {
    setShowDismissConfirm(true);
  }, []);

  // Confirm dismiss
  const handleConfirmDismiss = useCallback(async () => {
    setShowDismissConfirm(false);
    await skipOnboarding();
    onDismiss?.();
  }, [skipOnboarding, onDismiss]);

  // Handle skip button click
  const handleSkip = useCallback(async () => {
    await skipOnboarding();
    onDismiss?.();
  }, [skipOnboarding, onDismiss]);

  // Don't render if loading, dismissed, or all complete
  if (loading) return null;
  if (isOnboardingDone) return null;

  const progressPercent = (completedCount / totalSteps) * 100;

  // Show name input step for first-time users
  if (showNameInput) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden"
      >
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
            <User size={24} className="text-[var(--accent-primary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            What should I call you?
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            This helps make your experience more personal
          </p>
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameValue.trim()) {
                handleSaveName();
              }
            }}
            placeholder="Your first name"
            autoFocus
            className={cn(
              "w-full max-w-xs mx-auto px-4 py-3 rounded-lg",
              "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
              "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
              "focus:outline-none focus:border-[var(--accent-primary)]",
              "transition-colors text-center"
            )}
          />
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={handleSkipName}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-hover)] transition-colors"
              )}
            >
              Skip
            </button>
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--accent-primary)] text-white",
                "hover:bg-[var(--accent-primary)]/90 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "min-w-[80px]"
              )}
            >
              {savingName ? "Saving..." : "Continue"}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
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
                {completedCount}/{totalSteps} completed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismissClick();
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
                            "flex-shrink-0",
                            // Ensure 44px touch target on mobile
                            "min-h-[44px] sm:min-h-0 flex items-center"
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
              <div className="px-4 pb-2">
                <p className="text-xs text-[var(--text-muted)] text-center">
                  <span className="hidden sm:inline">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono text-[10px]">
                      Ctrl+K
                    </kbd>{" "}
                    anytime for quick capture
                  </span>
                  <span className="sm:hidden">
                    Tap the brain button anytime for quick capture
                  </span>
                </p>
              </div>

              {/* Skip button */}
              <div className="px-4 pb-4">
                <button
                  onClick={handleSkip}
                  className={cn(
                    "w-full py-3 rounded-lg text-sm font-medium",
                    "bg-[var(--bg-elevated)] text-[var(--text-muted)]",
                    "hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]",
                    "transition-colors min-h-[44px]"
                  )}
                >
                  Skip Getting Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dismiss confirmation modal */}
      <ConfirmModal
        isOpen={showDismissConfirm}
        title="Skip Getting Started?"
        message="Are you sure you want to dismiss the getting started guide? You can always explore features on your own."
        confirmLabel="Skip"
        onConfirm={handleConfirmDismiss}
        onCancel={() => setShowDismissConfirm(false)}
      />
    </>
  );
}
