"use client";

// =============================================================================
// CURRENT ACTIVITY BADGE
// Shows what a group member is currently working on.
// =============================================================================

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, Pencil } from "lucide-react";
import { cn } from "@/app/lib/cn";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CurrentActivityBadgeProps = {
  activity: string | null;
  updatedAt: string | null;
  isEditable?: boolean;
  onEdit?: () => void;
  className?: string;
};

// -----------------------------------------------------------------------------
// Helper: Format relative time
// -----------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function CurrentActivityBadge({
  activity,
  updatedAt,
  isEditable = false,
  onEdit,
  className,
}: CurrentActivityBadgeProps) {
  // Track tick count to trigger re-renders every 60 seconds
  const [, setTick] = useState(0);

  // Calculate relative time directly from prop (no separate state needed)
  const relativeTime = updatedAt ? formatRelativeTime(updatedAt) : null;

  // Set up interval to refresh the display every 60 seconds
  useEffect(() => {
    if (!updatedAt) return;

    // Refresh every 60 seconds by incrementing tick
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [updatedAt]);

  if (!activity && !isEditable) {
    return null;
  }

  if (!activity && isEditable) {
    return (
      <button
        onClick={onEdit}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg",
          "text-xs text-[var(--text-muted)]",
          "bg-[var(--bg-elevated)] border border-dashed border-[var(--border-subtle)]",
          "hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]",
          "transition-colors",
          className
        )}
      >
        <Pencil size={12} />
        <span>Set status</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-lg",
        "bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20",
        isEditable && "cursor-pointer hover:bg-[var(--accent-primary)]/10 transition-colors",
        className
      )}
      onClick={isEditable ? onEdit : undefined}
      role={isEditable ? "button" : "status"}
      aria-label={`Current activity: ${activity}${relativeTime ? `, updated ${relativeTime}` : ""}`}
      tabIndex={isEditable ? 0 : undefined}
      onKeyDown={isEditable ? (e) => { if (e.key === "Enter" || e.key === " ") onEdit?.(); } : undefined}
    >
      <Briefcase size={12} className="text-[var(--accent-primary)] shrink-0" />
      <span className="text-xs text-[var(--text-secondary)] truncate max-w-[150px]">
        {activity}
      </span>
      {relativeTime && (
        <span className="text-xs text-[var(--text-muted)] shrink-0">
          · {relativeTime}
        </span>
      )}
      {isEditable && (
        <Pencil size={10} className="text-[var(--text-muted)] shrink-0 ml-1" />
      )}
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Compact Version for Member Lists
// -----------------------------------------------------------------------------

type CurrentActivityCompactProps = {
  activity: string | null;
  className?: string;
};

export function CurrentActivityCompact({ activity, className }: CurrentActivityCompactProps) {
  if (!activity) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded",
        "bg-[var(--accent-primary)]/5",
        className
      )}
      role="status"
      aria-label={`Currently working on: ${activity}`}
    >
      <Briefcase size={10} className="text-[var(--accent-primary)]" />
      <span className="text-xs text-[var(--text-muted)] truncate max-w-[100px]">
        {activity}
      </span>
    </div>
  );
}
