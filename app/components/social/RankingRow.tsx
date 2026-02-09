"use client";

// =============================================================================
// RANKING ROW COMPONENT
// A table-row style component for leaderboard entries.
// Optimized for displaying ranked lists with visual hierarchy.
// =============================================================================

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, User, UserPlus, Loader2, Check } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { LeaderboardEntry, LeaderboardMetric } from "@/app/lib/types";

type RankingRowProps = {
  /** The leaderboard entry data */
  entry: LeaderboardEntry;
  /** The metric being displayed */
  metric: LeaderboardMetric;
  /** Animation index for staggering */
  index?: number;
  /** Click handler */
  onClick?: () => void;
  /** Handler for adding friend (if provided, shows add button) */
  onAddFriend?: (userId: string) => Promise<boolean>;
  /** Whether a friend request is already pending to this user */
  hasPendingRequest?: boolean;
};

/** Format value based on metric type */
function formatValue(value: number, metric: LeaderboardMetric): string {
  switch (metric) {
    case "xp":
      return value.toLocaleString() + " XP";
    case "streak":
      return value + " days";
    case "level":
      return "Level " + value;
    case "tasks":
      return value + " tasks";
    case "focus":
      return Math.floor(value / 60) + "h " + (value % 60) + "m";
    default:
      return value.toString();
  }
}

/** Get rank badge styling */
function getRankBadgeStyle(rank: number) {
  switch (rank) {
    case 1:
      return "bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-900 shadow-lg shadow-amber-500/20";
    case 2:
      return "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 shadow-lg shadow-gray-400/20";
    case 3:
      return "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900 shadow-lg shadow-orange-500/20";
    default:
      return "bg-[var(--bg-elevated)] text-[var(--text-secondary)]";
  }
}

/**
 * RankingRow displays a single entry in a leaderboard.
 * Features medal-style badges for top 3, smooth animations, and responsive design.
 *
 * @example
 * <RankingRow
 *   entry={entry}
 *   metric="xp"
 *   index={0}
 *   onClick={() => viewProfile(entry.user_id)}
 * />
 */
export default function RankingRow({
  entry,
  metric,
  index = 0,
  onClick,
  onAddFriend,
  hasPendingRequest = false,
}: RankingRowProps) {
  const isTopThree = entry.rank <= 3;

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Track in-flight request to prevent rapid double-clicks
  const pendingRef = useRef(false);

  // Show add friend button if:
  // - onAddFriend handler is provided
  // - Not current user
  // - Not already friends
  // - No pending request
  const showAddFriend =
    onAddFriend &&
    !entry.is_current_user &&
    !entry.is_friend &&
    !hasPendingRequest &&
    !sent;

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger row click
    if (!onAddFriend || sending || pendingRef.current) return;

    pendingRef.current = true;
    setSending(true);
    const success = await onAddFriend(entry.user_id);
    setSending(false);
    pendingRef.current = false;

    if (success) {
      setSent(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
        ease: "easeOut",
      }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-xl",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
        "hover:bg-[var(--bg-hover)] transition-colors duration-150",
        onClick && "cursor-pointer",
        entry.is_current_user && "ring-2 ring-[var(--accent-primary)]/30"
      )}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold shrink-0",
          getRankBadgeStyle(entry.rank)
        )}
      >
        {entry.rank}
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "p-2 rounded-full shrink-0",
            entry.is_current_user
              ? "bg-[var(--accent-primary)]/10"
              : "bg-[var(--bg-elevated)]"
          )}
        >
          <User
            size={18}
            className={
              entry.is_current_user
                ? "text-[var(--accent-primary)]"
                : "text-[var(--text-muted)]"
            }
          />
        </div>

        <div className="min-w-0">
          <p
            className={cn(
              "font-medium truncate",
              entry.is_current_user
                ? "text-[var(--accent-primary)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {entry.display_name || "Anonymous"}
            {entry.is_current_user && (
              <span className="text-xs text-[var(--text-muted)] ml-1">(You)</span>
            )}
          </p>

          {/* Secondary stats */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {entry.username && (
              <span className="text-[var(--accent-primary)]">@{entry.username}</span>
            )}
            {entry.level !== undefined && <span>Lv.{entry.level}</span>}
            {entry.current_streak !== undefined && entry.current_streak > 0 && (
              <span className="flex items-center gap-0.5">
                <Flame size={10} className="text-[var(--accent-streak)]" />
                {entry.current_streak}d
              </span>
            )}
            {entry.is_friend && (
              <span className="text-[var(--accent-primary)]">Friend</span>
            )}
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="text-right shrink-0">
        <p
          className={cn(
            "font-mono font-bold",
            isTopThree ? "text-lg" : "text-base",
            entry.is_current_user
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {formatValue(entry.value, metric)}
        </p>
      </div>

      {/* Add Friend Button */}
      {showAddFriend && (
        <button
          onClick={handleAddFriend}
          disabled={sending}
          className={cn(
            "p-2 rounded-lg shrink-0",
            "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
            "hover:bg-[var(--accent-primary)]/20 transition-colors",
            "disabled:opacity-50"
          )}
          title="Add friend"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
        </button>
      )}

      {/* Sent indicator */}
      {sent && (
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
          )}
          title="Request sent"
        >
          <Check size={16} />
        </div>
      )}

      {/* Pending indicator */}
      {hasPendingRequest && !sent && (
        <div
          className={cn(
            "px-2 py-1 rounded-lg shrink-0 text-xs",
            "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
          )}
        >
          Pending
        </div>
      )}
    </motion.div>
  );
}

/**
 * RankingRowSkeleton for loading states.
 */
export function RankingRowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
    >
      <div className="w-10 h-10 rounded-full bg-[var(--skeleton-bg)] animate-pulse" />
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-[var(--skeleton-bg)] animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-[var(--skeleton-bg)] animate-pulse" />
          <div className="h-3 w-20 rounded bg-[var(--skeleton-bg)] animate-pulse" />
        </div>
      </div>
      <div className="h-6 w-20 rounded bg-[var(--skeleton-bg)] animate-pulse" />
    </motion.div>
  );
}
