"use client";

// =============================================================================
// ONBOARDING QUEST CARD COMPONENT
// Virtual quest card that appears on the Quests page for new users.
// Displays onboarding progress from metadata (no actual quest/tasks in DB).
//
// TIERED PROGRESSIVE ONBOARDING:
// - Tier 1 (Essential): 3 steps shown immediately
// - Tier 2 (Power User): 3 steps shown after Tier 1 complete (collapsible)
// =============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  CheckSquare,
  Flame,
  Brain,
  Zap,
  Check,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useOnboarding } from "./OnboardingProvider";
import { useAI } from "./AIProvider";
import type { OnboardingStep } from "@/app/lib/types";
import type { OnboardingStepConfig } from "@/app/lib/onboarding";
import { ONBOARDING_QUEST_TITLE, ESSENTIAL_STEPS, POWER_STEPS } from "@/app/lib/onboarding";
import ConfirmModal from "./ConfirmModal";

// -----------------------------------------------------------------------------
// Icon Map
// -----------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  CheckSquare,
  Flame,
  Brain,
  Zap,
  Sparkles,
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * OnboardingQuestCard displays a virtual "quest" for onboarding on the Quests page.
 * This renders from metadata, NOT from the quests table.
 * Shows progress bar, expandable tiered step list, and skip button.
 */
export default function OnboardingQuestCard() {
  const {
    loading,
    isOnboardingDone,
    isStepComplete,
    skipOnboarding,
    isTier1Complete,
    tier1CompletedCount,
    tier2CompletedCount,
    totalEssentialSteps,
    totalPowerSteps,
  } = useOnboarding();
  const { openChat } = useAI();

  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("intentionality_onboarding_quest_expanded");
    return saved === "true";
  });
  const [tier2Expanded, setTier2Expanded] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);

  // Track tier1 completion for celebration
  const prevTier1CompleteRef = useRef<boolean>(false);

  // Track tier1 completion for celebration animation
  useEffect(() => {
    if (isTier1Complete && !prevTier1CompleteRef.current) {
      setShowUnlockCelebration(true);
      setTier2Expanded(true);
      setTimeout(() => setShowUnlockCelebration(false), 3000);
    }
    prevTier1CompleteRef.current = isTier1Complete;
  }, [isTier1Complete]);

  // Persist expanded state to localStorage
  useEffect(() => {
    localStorage.setItem("intentionality_onboarding_quest_expanded", String(isExpanded));
  }, [isExpanded]);

  // Handle Kofi step click
  const handleKofiClick = useCallback(() => {
    openChat();
  }, [openChat]);

  // Don't render if loading, dismissed, or all complete
  if (loading || isOnboardingDone) return null;

  const totalCompleted = tier1CompletedCount + tier2CompletedCount;
  const totalSteps = totalEssentialSteps + totalPowerSteps;
  const percent = totalSteps === 0 ? 0 : Math.round((totalCompleted / totalSteps) * 100);

  const handleSkip = async () => {
    setShowSkipConfirm(false);
    await skipOnboarding();
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl bg-[var(--bg-card)]",
          "border border-[var(--border-subtle)]"
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
                {tier1CompletedCount}/{totalEssentialSteps} essentials
                {isTier1Complete && ` · ${tier2CompletedCount}/${totalPowerSteps} bonus`}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                  {totalCompleted}/{totalSteps}
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
                {/* Tier 1: Essential Steps */}
                <ul className="mt-3 space-y-2">
                  {ESSENTIAL_STEPS.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      isComplete={isStepComplete(step.id)}
                    />
                  ))}
                </ul>

                {/* Tier Transition Message */}
                {!isTier1Complete && (
                  <div className="text-center py-3 text-xs text-[var(--text-muted)]">
                    Complete to unlock more features
                  </div>
                )}

                {/* Unlock Celebration */}
                <AnimatePresence>
                  {showUnlockCelebration && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-4 rounded-lg bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20 my-2"
                    >
                      <div className="flex items-center gap-2 text-[var(--accent-success)]">
                        <Sparkles size={18} />
                        <span className="font-medium">Power Features Unlocked!</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tier 2: Power User Steps */}
                {isTier1Complete && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTier2Expanded(!tier2Expanded);
                      }}
                      className="w-full flex items-center justify-between py-3 text-sm"
                    >
                      <span className="font-medium text-[var(--text-primary)]">
                        Discover More ({tier2CompletedCount}/{totalPowerSteps})
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "transition-transform text-[var(--text-muted)]",
                          tier2Expanded && "rotate-180"
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {tier2Expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          {POWER_STEPS.map((step) => (
                            <StepRow
                              key={step.id}
                              step={step}
                              isComplete={isStepComplete(step.id)}
                              onAction={step.id === 'meet_kofi' ? handleKofiClick : undefined}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}

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

// -----------------------------------------------------------------------------
// Step Row Component
// -----------------------------------------------------------------------------

type StepRowProps = {
  step: OnboardingStepConfig;
  isComplete: boolean;
  onAction?: () => void;
};

function StepRow({ step, isComplete, onAction }: StepRowProps) {
  const Icon = ICON_MAP[step.icon] || Sparkles;

  return (
    <li
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
          <Icon size={14} className="text-[var(--text-muted)]" />
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
      {!isComplete && (step.actionHref || onAction) && (
        onAction ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={cn(
              "px-2 py-1 text-xs font-medium rounded",
              "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
              "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              "hover:border-[var(--border-default)] transition-colors",
              "flex-shrink-0"
            )}
          >
            {step.actionLabel}
          </button>
        ) : (
          <Link
            href={step.actionHref!}
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
          </Link>
        )
      )}
    </li>
  );
}
