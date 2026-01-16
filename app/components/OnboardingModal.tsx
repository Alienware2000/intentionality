"use client";

// =============================================================================
// ONBOARDING MODAL COMPONENT
// Welcomes new users and guides them through key features.
// Shows once on first login, persists dismissal in localStorage.
// =============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  CheckSquare,
  Flame,
  Brain,
  Zap,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/app/lib/cn";

const ONBOARDING_STORAGE_KEY = "intentionality_onboarding_complete";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Step = {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    icon: Target,
    iconColor: "text-[var(--accent-primary)]",
    title: "Quests",
    description: "Group your tasks by goal or project. Start by creating a quest like \"Study\" or \"Work\".",
  },
  {
    icon: CheckSquare,
    iconColor: "text-[var(--accent-success)]",
    title: "Tasks",
    description: "Break down your quests into actionable tasks with due dates and priorities.",
  },
  {
    icon: Flame,
    iconColor: "text-[var(--accent-streak)]",
    title: "Habits",
    description: "Build daily habits and track your streaks. Consistency is key!",
  },
  {
    icon: Brain,
    iconColor: "text-[var(--accent-primary)]",
    title: "Brain Dump",
    description: "Press Ctrl+K anytime to quickly capture thoughts. Review them later in your Inbox.",
  },
  {
    icon: Zap,
    iconColor: "text-[var(--accent-highlight)]",
    title: "XP & Levels",
    description: "Earn XP by completing tasks and habits. Level up and build your streak!",
  },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if onboarding was already completed
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      // Small delay so page loads first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  }

  function handleSkip() {
    handleClose();
  }

  function handleClose() {
    setIsOpen(false);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[60] backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]",
              "w-full max-w-md p-6 rounded-xl mx-4 sm:mx-0",
              "bg-[var(--bg-card)] border border-[var(--border-default)]",
              "shadow-2xl"
            )}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              aria-label="Close onboarding"
              className={cn(
                "absolute top-4 right-4 p-1.5 rounded-lg",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-hover)] transition-colors"
              )}
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium mb-3">
                <Sparkles size={12} />
                Welcome to Intentionality
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Let&apos;s get you started
              </h2>
            </div>

            {/* Step Content */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-start gap-4 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className={cn("p-2.5 rounded-lg bg-[var(--bg-card)]", step.iconColor)}>
                  <step.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === currentStep
                      ? "bg-[var(--accent-primary)] w-6"
                      : "bg-[var(--border-default)] hover:bg-[var(--border-subtle)]"
                  )}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg",
                  "text-sm font-medium",
                  "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                  "hover:bg-[var(--bg-hover)] transition-colors"
                )}
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
                  "text-sm font-medium",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors"
                )}
              >
                {isLastStep ? "Get Started" : "Next"}
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono">Ctrl+K</kbd> anytime for quick capture
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
