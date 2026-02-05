"use client";

// =============================================================================
// PREMIUM SETTINGS CARD COMPONENT
// Settings page card showing current plan details:
// - All 4 AI usage meters with progress bars
// - Feature comparison table (Free vs Pro)
// - Waitlist status and CTA
//
// Design: Informative and detailed for users who want to understand limits.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  ChevronDown,
  MessageSquare,
  Brain,
  Sparkles,
  FileText,
  Check,
  Minus,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useFreemium } from "@/app/components/FreemiumProvider";
import { getUsageColorsFromPercentage } from "@/app/lib/usage-utils";

// -----------------------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------------------

type FeatureKey = "chat" | "brain_dump" | "insights" | "briefing";

const FEATURE_CONFIG: Record<FeatureKey, { icon: typeof MessageSquare; label: string }> = {
  chat: { icon: MessageSquare, label: "AI Chat" },
  brain_dump: { icon: Brain, label: "Brain Dump AI" },
  insights: { icon: Sparkles, label: "Proactive Insights" },
  briefing: { icon: FileText, label: "Daily Briefing" },
};

const COMPARISON_ROWS = [
  { feature: "AI Chat", free: "50/day", pro: "Unlimited" },
  { feature: "Brain Dump AI", free: "20/day", pro: "Unlimited" },
  { feature: "Proactive Insights", free: "48/day", pro: "Unlimited" },
  { feature: "Daily Briefing", free: "5/day", pro: "Unlimited" },
  { feature: "AI Models", free: "Standard", pro: "Premium" },
  { feature: "Voice Assistant", free: false, pro: "Coming Soon" },
  { feature: "Agentic Actions", free: false, pro: "Coming Soon" },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function PremiumSettingsCard() {
  const { usage, isLoadingUsage, isOnWaitlist, openUpgradeModal } = useFreemium();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "text-left hover:bg-[var(--bg-hover)]/50 transition-colors",
          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
          "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-highlight)]/10">
            <Crown size={18} className="text-[var(--accent-highlight)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Free Plan</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {isOnWaitlist ? "You're on the Pro waitlist!" : "Upgrade to Pro for unlimited AI"}
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-[var(--text-muted)]" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-5">
              {/* Divider */}
              <div className="h-px bg-[var(--border-subtle)]" />

              {/* Section 1: Current Usage */}
              <div>
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Today&apos;s Usage
                </h4>

                {isLoadingUsage ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-lg bg-[var(--skeleton-bg)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : usage ? (
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(FEATURE_CONFIG) as FeatureKey[]).map((feature) => {
                      const config = FEATURE_CONFIG[feature];
                      const Icon = config.icon;
                      const data = usage[feature];
                      const percentage = data && data.limit > 0 ? (data.used / data.limit) * 100 : 0;

                      return (
                        <div
                          key={feature}
                          className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon size={14} className="text-[var(--text-muted)]" />
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between mb-1.5">
                            <span className={cn(
                              "text-lg font-mono font-bold",
                              percentage > 80 ? getUsageColorsFromPercentage(percentage).text
                                : percentage >= 50 ? getUsageColorsFromPercentage(percentage).text
                                : "text-[var(--text-primary)]"
                            )}>
                              {data?.used || 0}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              / {data?.limit || 0}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                percentage >= 50 ? getUsageColorsFromPercentage(percentage).bg : "bg-[var(--accent-primary)]"
                              )}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Limits reset daily at midnight in your timezone.
                </p>
              </div>

              {/* Section 2: Feature Comparison */}
              <div>
                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Free vs Pro
                </h4>

                <div className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                  {/* Header row */}
                  <div className="grid grid-cols-3 bg-[var(--bg-elevated)]">
                    <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
                      Feature
                    </div>
                    <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] text-center">
                      Free
                    </div>
                    <div className="px-3 py-2 text-xs font-medium text-[var(--accent-highlight)] text-center">
                      Pro
                    </div>
                  </div>
                  {/* Data rows */}
                  {COMPARISON_ROWS.map((row, index) => (
                    <div
                      key={row.feature}
                      className={cn(
                        "grid grid-cols-3 border-t border-[var(--border-subtle)]",
                        index % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-card)]/50"
                      )}
                    >
                      <div className="px-3 py-2.5 text-sm text-[var(--text-primary)]">
                        {row.feature}
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        {typeof row.free === "boolean" ? (
                          row.free ? (
                            <Check size={16} className="mx-auto text-[var(--accent-success)]" />
                          ) : (
                            <Minus size={16} className="mx-auto text-[var(--text-muted)]" />
                          )
                        ) : (
                          <span className="text-sm text-[var(--text-muted)]">{row.free}</span>
                        )}
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        {typeof row.pro === "boolean" ? (
                          row.pro ? (
                            <Check size={16} className="mx-auto text-[var(--accent-success)]" />
                          ) : (
                            <Minus size={16} className="mx-auto text-[var(--text-muted)]" />
                          )
                        ) : (
                          <span className="text-sm text-[var(--accent-highlight)] font-medium">
                            {row.pro}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              {!isOnWaitlist && (
                <button
                  onClick={() => openUpgradeModal("settings")}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium",
                    "min-h-[44px]",
                    "bg-gradient-to-r from-[var(--accent-highlight)] to-amber-500 text-white",
                    "hover:opacity-90",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "active:scale-[0.98] transition-all duration-100",
                    "focus-visible:outline-2 focus-visible:outline-[var(--accent-highlight)]"
                  )}
                >
                  <Crown size={16} />
                  Join Pro Waitlist
                </button>
              )}

              {isOnWaitlist && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20">
                  <Check size={16} className="text-[var(--accent-success)]" />
                  <span className="text-sm font-medium text-[var(--accent-success)]">
                    You&apos;re on the waitlist!
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
