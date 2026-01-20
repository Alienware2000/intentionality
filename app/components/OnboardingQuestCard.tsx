"use client";

// =============================================================================
// ONBOARDING QUEST CARD COMPONENT
// Virtual quest card that appears on the Quests page for new users.
// Displays onboarding progress from metadata (no actual quest/tasks in DB).
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  CheckSquare,
  Flame,
  Brain,
  Zap,
  Check,
  ChevronDown,
  Circle,
  ClipboardList,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useOnboarding } from "./OnboardingProvider";
import type { OnboardingStep } from "@/app/lib/types";
import { ONBOARDING_QUEST_TITLE } from "@/app/lib/onboarding";
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
    actionLabel: "Add Below",
  },
  {
    id: "add_task",
    icon: CheckSquare,
    iconColor: "text-[var(--accent-success)]",
    title: "Add a Task",
    description: "Break down quests into actionable items with due dates.",
    actionLabel: "Expand Quest",
  },
  {
    id: "create_habit",
    icon: Flame,
    iconColor: "text-[var(--accent-streak)]",
    title: "Create a Daily Habit",
    description: "Build consistency with recurring daily habits.",
    actionLabel: "Go to Dashboard",
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
    actionLabel: "Go to Plan",
    actionHref: "/plan",
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

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * OnboardingQuestCard displays a virtual "quest" for onboarding on the Quests page.
 * This renders from metadata, NOT from the quests table.
 * Shows progress bar, expandable step list, and skip button.
 */
export default function OnboardingQuestCard() {
  const { loading, isOnboardingDone, isStepComplete, completedCount, totalSteps, skipOnboarding } = useOnboarding();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Don't render if loading, dismissed, or all complete
  if (loading || isOnboardingDone) return null;

  const percent = totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);

  const handleSkip = async () => {
    setShowSkipConfirm(false);
    await skipOnboarding();
  };

  return (
    <>
      <div
        className={cn(
          "rounded-lg border-l-2 bg-[var(--bg-card)]",
          "border-l-[var(--accent-highlight)]"
        )}
      >
        {/* Quest Header - Clickable to expand */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          className="w-full p-4 text-left cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--accent-highlight)] flex-shrink-0" />
                <h2 className="font-medium text-[var(--text-primary)] truncate">
                  {ONBOARDING_QUEST_TITLE}
                </h2>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent-highlight)]/20 text-[var(--accent-highlight)]">
                  Getting Started
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Complete these steps to learn the basics
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                  {completedCount}/{totalSteps}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  steps
                </div>
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1"
              >
                <ChevronDown size={18} className="text-[var(--text-muted)]" />
              </motion.div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-1 w-full rounded-full bg-[var(--bg-elevated)]">
              <motion.div
                className={cn(
                  "h-1 rounded-full transition-all",
                  "bg-[var(--accent-highlight)]"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {percent}% complete
            </p>
          </div>
        </div>

        {/* Expandable Steps List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
                {/* Steps List */}
                <ul className="mt-3 space-y-2">
                  {STEPS.map((step) => {
                    const isComplete = isStepComplete(step.id);
                    const Icon = step.icon;

                    return (
                      <li
                        key={step.id}
                        className={cn(
                          "flex items-center gap-3 py-2 px-3 rounded-lg",
                          isComplete
                            ? "bg-[var(--accent-success)]/10"
                            : "bg-[var(--bg-elevated)]"
                        )}
                      >
                        {/* Checkbox / Icon */}
                        <div
                          className={cn(
                            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                            isComplete
                              ? "bg-[var(--accent-success)] text-white"
                              : "border-2 border-[var(--text-muted)]"
                          )}
                        >
                          {isComplete ? (
                            <Check size={14} />
                          ) : (
                            <Icon size={14} className={step.iconColor} />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              "text-sm",
                              isComplete
                                ? "line-through text-[var(--text-muted)]"
                                : "text-[var(--text-primary)]"
                            )}
                          >
                            {step.title}
                          </span>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {step.description}
                          </p>
                        </div>

                        {/* Action link for incomplete steps */}
                        {!isComplete && step.actionHref && (
                          <a
                            href={step.actionHref}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "px-2 py-1 text-xs font-medium rounded",
                              "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                              "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                              "hover:border-[var(--border-default)] transition-colors",
                              "flex-shrink-0"
                            )}
                          >
                            {step.actionLabel}
                          </a>
                        )}

                        {/* Completed checkmark */}
                        {isComplete && (
                          <Circle size={14} className="text-[var(--accent-success)] fill-current flex-shrink-0" />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Skip button */}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSkipConfirm(true);
                    }}
                    className={cn(
                      "w-full py-2.5 rounded-lg text-sm font-medium",
                      "bg-[var(--bg-elevated)] text-[var(--text-muted)]",
                      "hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]",
                      "transition-colors min-h-[44px]"
                    )}
                  >
                    Skip Getting Started Guide
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip confirmation modal */}
      <ConfirmModal
        isOpen={showSkipConfirm}
        title="Skip Getting Started?"
        message="Are you sure you want to skip the getting started guide? You can always explore features on your own."
        confirmLabel="Skip"
        onConfirm={handleSkip}
        onCancel={() => setShowSkipConfirm(false)}
      />
    </>
  );
}
