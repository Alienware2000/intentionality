"use client";

// =============================================================================
// USAGE INDICATOR COMPONENT
// Displays AI feature usage like "5/50 messages" with color coding.
// Changes color based on usage percentage:
// - <50%: Subtle (muted)
// - 50-80%: Warning (highlight/gold)
// - >80%: Alert (red) with pulse animation
// =============================================================================

import { cn } from "@/app/lib/cn";
import { getUsageColorsFromPercentage } from "@/app/lib/usage-utils";

export type UsageData = {
  used: number;
  limit: number;
};

type Props = {
  /** Feature identifier for labeling */
  feature: "chat" | "brain_dump" | "insights" | "briefing";
  /** Usage data with used and limit */
  usage: UsageData | null;
  /** Compact mode (just numbers) vs full mode (with label) */
  compact?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler (e.g., to open upgrade modal when usage is high) */
  onClick?: () => void;
  /** Always show usage, even when low (subtle styling at <50%) */
  alwaysShow?: boolean;
};

const FEATURE_LABELS = {
  chat: "messages",
  brain_dump: "processes",
  insights: "insights",
  briefing: "briefings",
} as const;

export default function UsageIndicator({
  feature,
  usage,
  compact = false,
  showProgress = false,
  className,
  onClick,
  alwaysShow = false,
}: Props) {
  // Don't render if no usage data
  if (!usage) {
    return null;
  }

  const { used, limit } = usage;
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const label = FEATURE_LABELS[feature];

  // For alwaysShow mode at low usage, use extra subtle styling
  const isLowUsage = percentage < 50;
  const isSubtle = alwaysShow && isLowUsage;

  // Get color classes from shared utility (maintains consistent thresholds)
  const baseColors = getUsageColorsFromPercentage(percentage);

  // Override with subtle styling for alwaysShow at low usage
  const { text: textColor, bg: bgColor, pulse } = isSubtle
    ? { text: "text-[var(--text-muted)]/60", bg: "bg-[var(--text-muted)]/40", pulse: false }
    : baseColors;

  // Interactive styles when clickable
  const interactiveClasses = onClick
    ? cn(
        "cursor-pointer",
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
        "hover:opacity-80 active:scale-[0.98] transition-all duration-100",
        "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
      )
    : "";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "flex flex-col gap-1",
        interactiveClasses,
        isSubtle && "opacity-60",
        className
      )}
    >
      {/* Usage text */}
      <span
        className={cn(
          "text-xs font-medium",
          textColor,
          pulse && "animate-pulse"
        )}
      >
        {used}/{limit}
        {!compact && ` ${label}`}
        {compact && percentage >= 50 && (
          <span className="ml-1 opacity-70">today</span>
        )}
      </span>

      {/* Progress bar (optional) */}
      {showProgress && (
        <div className="h-1 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              bgColor,
              pulse && "animate-pulse"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
