"use client";

// =============================================================================
// GROUP CHALLENGE CARD
// Shows the current week's group challenge with progress bar.
// =============================================================================

import { motion } from "framer-motion";
import { Target, CheckCircle, Flame, Clock, Zap } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { GroupChallenge } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GroupChallengeCardProps = {
  challenge: GroupChallenge | null;
  progressPercentage: number;
  className?: string;
};

// -----------------------------------------------------------------------------
// Helper: Get icon for challenge type
// -----------------------------------------------------------------------------

function ChallengeIcon({
  type,
  size,
  className,
}: {
  type: string;
  size: number;
  className?: string;
}) {
  switch (type) {
    case "tasks":
      return <CheckCircle size={size} className={className} />;
    case "focus":
      return <Clock size={size} className={className} />;
    case "habits":
      return <Flame size={size} className={className} />;
    case "xp":
      return <Zap size={size} className={className} />;
    default:
      return <Target size={size} className={className} />;
  }
}

// -----------------------------------------------------------------------------
// Helper: Format progress value
// -----------------------------------------------------------------------------

function formatProgress(value: number, type: string): string {
  if (type === "focus") {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }
  return value.toLocaleString();
}

// -----------------------------------------------------------------------------
// Helper: Get unit label
// -----------------------------------------------------------------------------

function getUnitLabel(type: string): string {
  switch (type) {
    case "tasks":
      return "tasks";
    case "focus":
      return "focus minutes";
    case "habits":
      return "habits";
    case "xp":
      return "XP";
    default:
      return "points";
  }
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function GroupChallengeCard({
  challenge,
  progressPercentage,
  className,
}: GroupChallengeCardProps) {
  if (!challenge) {
    return (
      <div className={cn(
        "rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4",
        className
      )}>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-[var(--bg-elevated)]">
            <Target size={16} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Challenge</h3>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          No challenge this week yet. Check back soon!
        </p>
      </div>
    );
  }

  const isCompleted = challenge.completed;
  const remaining = challenge.target_value - challenge.current_progress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-4",
        isCompleted
          ? "bg-[var(--accent-success)]/5 border-[var(--accent-success)]/30"
          : "bg-[var(--bg-card)] border-[var(--border-subtle)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            isCompleted ? "bg-[var(--accent-success)]/20" : "bg-[var(--accent-primary)]/10"
          )}>
            <ChallengeIcon
              type={challenge.challenge_type}
              size={16}
              className={isCompleted ? "text-[var(--accent-success)]" : "text-[var(--accent-primary)]"}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {challenge.name}
            </h3>
            {challenge.description && (
              <p className="text-xs text-[var(--text-muted)]">{challenge.description}</p>
            )}
          </div>
        </div>

        {/* Reward badge */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          isCompleted
            ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)]"
            : "bg-[var(--accent-highlight)]/10 text-[var(--accent-highlight)]"
        )}>
          <Zap size={12} />
          +{challenge.xp_reward_per_member} XP
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[var(--text-muted)]">
            {formatProgress(challenge.current_progress, challenge.challenge_type)} / {formatProgress(challenge.target_value, challenge.challenge_type)}
          </span>
          <span className={cn(
            "font-medium",
            isCompleted ? "text-[var(--accent-success)]" : "text-[var(--text-secondary)]"
          )}>
            {progressPercentage}%
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              isCompleted
                ? "bg-[var(--accent-success)]"
                : "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-highlight)]"
            )}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="flex items-center gap-1 text-[var(--accent-success)]"
          >
            <CheckCircle size={14} />
            <span className="font-medium">Challenge Complete!</span>
          </motion.div>
        ) : (
          <span className="text-[var(--text-muted)]">
            {remaining > 0
              ? `${formatProgress(remaining, challenge.challenge_type)} ${getUnitLabel(challenge.challenge_type)} to go`
              : "Almost there!"}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Loading Skeleton
// -----------------------------------------------------------------------------

export function GroupChallengeCardSkeleton() {
  return (
    <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--skeleton-bg)]" />
          <div className="space-y-1">
            <div className="h-4 w-28 rounded bg-[var(--skeleton-bg)]" />
            <div className="h-3 w-40 rounded bg-[var(--skeleton-bg)]" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-[var(--skeleton-bg)]" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-20 rounded bg-[var(--skeleton-bg)]" />
          <div className="h-3 w-8 rounded bg-[var(--skeleton-bg)]" />
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--skeleton-bg)]" />
      </div>
    </div>
  );
}
