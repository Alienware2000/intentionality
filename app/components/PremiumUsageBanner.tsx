"use client";

// =============================================================================
// PREMIUM USAGE BANNER COMPONENT
// Subtle, collapsible dashboard banner showing AI usage.
// Collapsed by default - shows only highest usage feature.
// Expands on click to show all 4 usage meters.
// Dismissible for 7 days via localStorage.
//
// Design: Non-intrusive, informative not sales-y.
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Brain, Sparkles, FileText, ChevronDown, X, Crown } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useFreemium } from "./FreemiumProvider";
import UsageIndicator from "./UsageIndicator";
import { getUsageColorsFromPercentage } from "@/app/lib/usage-utils";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DISMISS_KEY = "intentionality_usage_banner_dismissed";
const DISMISS_DAYS = 7;

const FEATURE_CONFIG = {
  chat: { icon: MessageSquare, label: "Chat" },
  brain_dump: { icon: Brain, label: "Process" },
  insights: { icon: Sparkles, label: "Insights" },
  briefing: { icon: FileText, label: "Briefing" },
} as const;

type FeatureKey = keyof typeof FEATURE_CONFIG;

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function PremiumUsageBanner() {
  const { usage, isLoadingUsage, openUpgradeModal } = useFreemium();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Default to hidden until we check

  // Check if banner was dismissed
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_DAYS) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, []);

  // Find the highest usage feature to show in collapsed state
  const highestUsageFeature = useMemo(() => {
    if (!usage) return null;

    const features: FeatureKey[] = ["chat", "brain_dump", "insights", "briefing"];
    let highest: { feature: FeatureKey; percentage: number } | null = null;

    for (const feature of features) {
      const data = usage[feature];
      if (data && data.limit > 0) {
        const percentage = (data.used / data.limit) * 100;
        if (!highest || percentage > highest.percentage) {
          highest = { feature, percentage };
        }
      }
    }

    return highest;
  }, [usage]);

  // Check if user has used any AI feature
  const hasAnyUsage = useMemo(() => {
    if (!usage) return false;
    return (
      usage.chat?.used > 0 ||
      usage.brain_dump?.used > 0 ||
      usage.insights?.used > 0 ||
      usage.briefing?.used > 0
    );
  }, [usage]);

  // Dismiss for 7 days
  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setIsDismissed(true);
  }

  // Don't show if:
  // - Loading
  // - Dismissed
  // - No usage data
  // - User hasn't used any AI features yet
  if (isLoadingUsage || isDismissed || !usage || !hasAnyUsage || !highestUsageFeature) {
    return null;
  }

  const HighestIcon = FEATURE_CONFIG[highestUsageFeature.feature].icon;
  const highestLabel = FEATURE_CONFIG[highestUsageFeature.feature].label;
  const highestData = usage[highestUsageFeature.feature];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border border-[var(--border-subtle)]",
        "bg-[var(--bg-card)]/50 backdrop-blur-sm"
      )}
    >
      {/* Collapsed State - Clickable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-3",
          "text-left transition-colors hover:bg-[var(--bg-hover)]/50 rounded-xl",
          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
          "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[var(--text-muted)]/10">
            <HighestIcon size={14} className="text-[var(--text-muted)]" />
          </div>
          <span className="text-sm text-[var(--text-secondary)]">
            {highestData?.used}/{highestData?.limit} {highestLabel.toLowerCase()}
            <span className="text-[var(--text-muted)]"> today</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">
            {isExpanded ? "Hide" : "See all"}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} className="text-[var(--text-muted)]" />
          </motion.div>
          <button
            onClick={handleDismiss}
            className={cn(
              "p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors ml-1",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
            )}
            aria-label="Dismiss banner"
          >
            <X size={12} className="text-[var(--text-muted)]" />
          </button>
        </div>
      </button>

      {/* Expanded State */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Divider */}
              <div className="h-px bg-[var(--border-subtle)]" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Today&apos;s AI Usage
                </span>
              </div>

              {/* Usage Meters */}
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FEATURE_CONFIG) as FeatureKey[]).map((feature) => {
                  const config = FEATURE_CONFIG[feature];
                  const Icon = config.icon;
                  const data = usage[feature];
                  const percentage = data && data.limit > 0 ? (data.used / data.limit) * 100 : 0;

                  return (
                    <div
                      key={feature}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-elevated)]/50"
                    >
                      <Icon size={12} className="text-[var(--text-muted)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">{config.label}</span>
                          <span className={cn(
                            "font-mono",
                            getUsageColorsFromPercentage(percentage).text
                          )}>
                            {data?.used || 0}/{data?.limit || 0}
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="mt-1 h-1 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              percentage >= 50 ? getUsageColorsFromPercentage(percentage).bg : "bg-[var(--text-muted)]/50"
                            )}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtle upgrade CTA */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--text-muted)]">
                  Limits reset daily at midnight
                </span>
                <button
                  onClick={() => openUpgradeModal("usage_banner")}
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    "text-[var(--accent-highlight)]/70 hover:text-[var(--accent-highlight)]",
                    "transition-colors",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--accent-highlight)]"
                  )}
                >
                  <Crown size={10} />
                  <span>Want unlimited?</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
