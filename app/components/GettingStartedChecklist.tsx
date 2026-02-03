"use client";

// =============================================================================
// GETTING STARTED CHECKLIST COMPONENT
// Persistent onboarding checklist that guides new users through key features.
// Shows on dashboard until all steps are completed or dismissed.
// Uses OnboardingProvider for state management across the app.
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
  ChevronUp,
  X,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useOnboarding } from "./OnboardingProvider";
import { useProfile } from "./ProfileProvider";
import { useAI } from "./AIProvider";
import type { OnboardingStep } from "@/app/lib/types";
import type { OnboardingStepConfig } from "@/app/lib/onboarding";
import { ESSENTIAL_STEPS, POWER_STEPS } from "@/app/lib/onboarding";
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
// Constants
// -----------------------------------------------------------------------------

const COLLAPSE_FLAG_KEY = "intentionality_onboarding_collapsed";
const NAME_ASKED_KEY = "intentionality_name_asked";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

type Props = {
  onDismiss?: () => void;
};

/**
 * GettingStartedChecklist displays an interactive tiered checklist for new users.
 * Uses OnboardingProvider for global state management.
 * Steps auto-complete when users perform actions across the app.
 *
 * Tier 1: Essential (3 steps) - shown immediately
 * Tier 2: Power User (3 steps) - shown after Tier 1 complete
 */
export default function GettingStartedChecklist({ onDismiss }: Props) {
  const {
    loading,
    isOnboardingDone,
    isStepComplete,
    completedSteps,
    skipOnboarding,
    isTier1Complete,
    tier1CompletedCount,
    tier2CompletedCount,
    totalEssentialSteps,
    totalPowerSteps,
  } = useOnboarding();
  const { profile, refreshProfile } = useProfile();
  const { openChat } = useAI();

  // Name input step state
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Tier 2 expansion state
  const [tier2Expanded, setTier2Expanded] = useState(false);
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);

  // Initialize collapsed state from localStorage or if user has progress
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(COLLAPSE_FLAG_KEY) === "true") return true;
    return false;
  });
  const [recentlyCompleted, setRecentlyCompleted] = useState<OnboardingStep | null>(null);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  // Track tier1 completion for celebration
  const prevTier1CompleteRef = useRef<boolean>(false);

  // Track completed steps to detect new completions
  const prevCompletedCountRef = useRef<number>(0);

  // Track if we've already checked progress for initial collapse
  const hasCheckedProgressRef = useRef(false);

  // Check if we should show name input (first-time users)
  useEffect(() => {
    if (loading || !profile) return;

    const hasAskedBefore = localStorage.getItem(NAME_ASKED_KEY) === "true";
    if (!profile.display_name && !hasAskedBefore && tier1CompletedCount === 0) {
      setShowNameInput(true);
    }
  }, [loading, profile, tier1CompletedCount]);

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

  // Track tier1 completion for celebration animation
  useEffect(() => {
    if (isTier1Complete && !prevTier1CompleteRef.current) {
      setShowUnlockCelebration(true);
      setTier2Expanded(true);
      setTimeout(() => setShowUnlockCelebration(false), 3000);
    }
    prevTier1CompleteRef.current = isTier1Complete;
  }, [isTier1Complete]);

  // Auto-collapse when progress loads if user has completed steps
  useEffect(() => {
    if (hasCheckedProgressRef.current || loading) return;
    hasCheckedProgressRef.current = true;

    if (tier1CompletedCount > 0 && !isCollapsed) {
      setIsCollapsed(true);
    }
  }, [tier1CompletedCount, loading, isCollapsed]);

  // Detect when a step is newly completed and show animation
  useEffect(() => {
    if (loading) return;

    const totalCompleted = tier1CompletedCount + tier2CompletedCount;
    const prevCount = prevCompletedCountRef.current;

    if (totalCompleted > prevCount) {
      // Find a newly completed step
      const allSteps = [...ESSENTIAL_STEPS, ...POWER_STEPS];
      for (const step of allSteps) {
        if (isStepComplete(step.id)) {
          setRecentlyCompleted(step.id);
          const timer = setTimeout(() => setRecentlyCompleted(null), 2000);
          prevCompletedCountRef.current = totalCompleted;
          return () => clearTimeout(timer);
        }
      }
    }

    prevCompletedCountRef.current = totalCompleted;
  }, [tier1CompletedCount, tier2CompletedCount, loading, isStepComplete]);

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

  // Handle Kofi step click
  const handleKofiClick = useCallback(() => {
    openChat();
  }, [openChat]);

  // Don't render if loading, dismissed, or all complete
  if (loading) return null;
  if (isOnboardingDone) return null;

  const tier1Progress = (tier1CompletedCount / totalEssentialSteps) * 100;

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
                {tier1CompletedCount}/{totalEssentialSteps} essentials
                {isTier1Complete && ` · ${tier2CompletedCount}/${totalPowerSteps} bonus`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismissClick();
              }}
              className={cn(
                "p-2 sm:p-1.5 rounded-lg",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-elevated)]",
                // Mobile accessibility (44px minimum)
                "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
                "flex items-center justify-center",
                // Touch responsiveness
                "[touch-action:manipulation]",
                "active:scale-[0.97] active:bg-[var(--bg-hover)]",
                // Keyboard accessibility
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2",
                // Fast transitions
                "transition-all duration-100"
              )}
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
            animate={{ width: `${tier1Progress}%` }}
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
                {/* Tier 1: Essential Steps */}
                {ESSENTIAL_STEPS.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    isComplete={isStepComplete(step.id)}
                    isRecentlyCompleted={recentlyCompleted === step.id}
                  />
                ))}

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
                      className="p-4 rounded-lg bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20"
                    >
                      <div className="flex items-center gap-2 text-[var(--accent-success)]">
                        <Sparkles size={18} />
                        <span className="font-medium">Power Features Unlocked!</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tier 2: Power User Steps (collapsed by default, expands on unlock) */}
                {isTier1Complete && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTier2Expanded(!tier2Expanded);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between py-3 text-sm",
                        "min-h-[44px] sm:min-h-0",
                        "[touch-action:manipulation]",
                        "active:bg-[var(--bg-hover)]",
                        "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2",
                        "transition-colors duration-100 rounded-lg"
                      )}
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
                              isRecentlyCompleted={recentlyCompleted === step.id}
                              onAction={step.id === 'meet_kofi' ? handleKofiClick : undefined}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
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

// -----------------------------------------------------------------------------
// Step Row Component
// -----------------------------------------------------------------------------

type StepRowProps = {
  step: OnboardingStepConfig;
  isComplete: boolean;
  isRecentlyCompleted: boolean;
  onAction?: () => void;
};

function StepRow({ step, isComplete, isRecentlyCompleted, onAction }: StepRowProps) {
  const Icon = ICON_MAP[step.icon] || Sparkles;

  return (
    <motion.div
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
          <Icon size={16} className="text-[var(--text-muted)]" />
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
      {!isComplete && (step.actionHref || onAction) && (
        onAction ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={cn(
              // Base styling
              "px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg",
              "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
              "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              "hover:border-[var(--border-default)]",
              "flex-shrink-0",
              // Mobile accessibility (44px minimum)
              "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
              "flex items-center justify-center",
              // Touch responsiveness
              "[touch-action:manipulation]",
              "active:scale-[0.97] active:bg-[var(--bg-hover)]",
              // Keyboard accessibility
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2",
              // Fast transitions
              "transition-all duration-100"
            )}
          >
            {step.actionLabel}
          </button>
        ) : (
          <Link
            href={step.actionHref!}
            className={cn(
              // Base styling
              "px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg",
              "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
              "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              "hover:border-[var(--border-default)]",
              "flex-shrink-0",
              // Mobile accessibility (44px minimum)
              "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
              "flex items-center justify-center",
              // Touch responsiveness
              "[touch-action:manipulation]",
              "active:scale-[0.97] active:bg-[var(--bg-hover)]",
              // Keyboard accessibility
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2",
              // Fast transitions
              "transition-all duration-100"
            )}
          >
            {step.actionLabel}
          </Link>
        )
      )}
    </motion.div>
  );
}
