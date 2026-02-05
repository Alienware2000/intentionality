"use client";

// =============================================================================
// LIMIT REACHED MODAL COMPONENT
// Helpful modal that appears when user hits 100% usage on an AI feature.
//
// Design Philosophy:
// - Focus on HELPING first: show reset time, suggest alternatives
// - Upgrade CTA is secondary, not pushy
// - Tone: Understanding, not sales-y
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Lightbulb, Crown, X } from "lucide-react";
import { cn } from "@/app/lib/cn";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type FeatureType = "chat" | "brain_dump" | "insights" | "briefing";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  feature: FeatureType | null;
  onOpenUpgrade: () => void;
};

// -----------------------------------------------------------------------------
// Feature Config
// -----------------------------------------------------------------------------

const FEATURE_MESSAGES: Record<FeatureType, {
  title: string;
  tip: string;
}> = {
  chat: {
    title: "AI chat messages",
    tip: "Brain dump captures save without AI processing - try that for quick thoughts!",
  },
  brain_dump: {
    title: "AI brain dump processing",
    tip: "You can still save captures manually - they'll be there when limits reset!",
  },
  insights: {
    title: "proactive insights",
    tip: "Check your dashboard for existing insights - they're still available!",
  },
  briefing: {
    title: "daily briefings",
    tip: "Your tasks and habits are always available on the dashboard!",
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Calculate time until midnight (when limits reset).
 */
function getTimeUntilReset(): string {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function LimitReachedModal({
  isOpen,
  onClose,
  feature,
  onOpenUpgrade,
}: Props) {
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilReset());

  // Update reset time every minute
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilReset());
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Get feature-specific content
  const content = feature ? FEATURE_MESSAGES[feature] : null;

  // Handle escape key
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  // Handle upgrade click - close this modal and open upgrade
  function handleUpgradeClick() {
    onClose();
    onOpenUpgrade();
  }

  if (!content) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 modal-backdrop-heavy z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            className={cn(
              "fixed z-50",
              // Bottom on mobile, centered on desktop
              "bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "w-full sm:max-w-sm",
              "rounded-t-2xl sm:rounded-xl",
              "bg-[var(--bg-card)] glass-card",
              "border border-[var(--border-default)]",
              "shadow-2xl shadow-black/50"
            )}
          >
            {/* Main Content */}
            <div className="p-5">
              {/* Close button */}
              <button
                onClick={onClose}
                className={cn(
                  "absolute top-3 right-3 p-2 rounded-lg",
                  "hover:bg-[var(--bg-hover)] transition-colors",
                  "min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-h-0 sm:min-w-0",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                )}
              >
                <X size={16} className="text-[var(--text-muted)]" />
              </button>

              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                  You&apos;ve used today&apos;s {content.title}
                </h2>
              </div>

              {/* Reset Time - Primary Focus */}
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-4">
                <Clock size={20} className="text-[var(--accent-primary)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Resets in</p>
                  <p className="text-xl font-mono font-bold text-[var(--text-primary)]">
                    {timeUntilReset}
                  </p>
                </div>
              </div>

              {/* Helpful Tip */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] mb-4">
                <Lightbulb size={16} className="text-[var(--accent-highlight)] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {content.tip}
                </p>
              </div>

              {/* Primary Action - Dismiss */}
              <button
                onClick={onClose}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-medium",
                  "min-h-[44px]",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/90",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "active:scale-[0.98] transition-all duration-100",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                )}
              >
                Got it
              </button>
            </div>

            {/* Secondary: Upgrade CTA - Subtle */}
            <div className="border-t border-[var(--border-subtle)] px-5 py-3">
              <button
                onClick={handleUpgradeClick}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2",
                  "text-sm text-[var(--text-muted)] hover:text-[var(--accent-highlight)]",
                  "transition-colors",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-highlight)]"
                )}
              >
                <Crown size={14} />
                <span>Want unlimited? Learn about Pro</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
