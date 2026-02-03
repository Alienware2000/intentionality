"use client";

// =============================================================================
// PRIORITY PILL COMPONENT
// Reusable priority indicator pill for task items.
// Displays HIGH, MED, or LOW with appropriate color coding.
// =============================================================================

import { cn } from "@/app/lib/cn";
import { PRIORITY_LABELS } from "@/app/lib/constants";
import type { Priority } from "@/app/lib/types";

const PRIORITY_PILL_COLORS: Record<Priority, string> = {
  high: "bg-[var(--priority-high)]/10 text-[var(--priority-high)]",
  medium: "bg-[var(--priority-medium)]/10 text-[var(--priority-medium)]",
  low: "bg-[var(--priority-low)]/10 text-[var(--priority-low)]",
};

type Props = {
  priority: Priority;
  compact?: boolean;
  className?: string;
};

export default function PriorityPill({ priority, compact = false, className }: Props) {
  return (
    <span
      className={cn(
        "font-medium uppercase tracking-wide rounded-full flex-shrink-0",
        compact
          ? "text-[10px] px-1.5 py-0.5"
          : "text-xs px-2 py-1",
        PRIORITY_PILL_COLORS[priority],
        className
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
