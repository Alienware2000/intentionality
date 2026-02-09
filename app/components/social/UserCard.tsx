"use client";

// =============================================================================
// USER CARD COMPONENT
// Displays a user's profile information in a card format.
// Used in friends lists, leaderboards, and group members.
// =============================================================================

import { motion } from "framer-motion";
import { User, Flame, Zap, Crown, Shield } from "lucide-react";
import { cn } from "@/app/lib/cn";
import GlowCard from "@/app/components/ui/GlowCard";
import type { LevelTitle } from "@/app/lib/types";

type UserCardProps = {
  /** User's display name */
  displayName: string | null;
  /** User's level */
  level: number;
  /** User's current streak */
  currentStreak: number;
  /** User's total XP */
  xpTotal?: number;
  /** User's title (derived from level) */
  title?: LevelTitle;
  /** Rank number to display (for leaderboards) */
  rank?: number;
  /** Whether this is the current user */
  isCurrentUser?: boolean;
  /** Whether to show stats (level, streak) */
  showStats?: boolean;
  /** Whether to show XP */
  showXp?: boolean;
  /** Role indicator (for groups) */
  role?: "owner" | "admin" | "member";
  /** Weekly XP contribution (for groups) */
  weeklyXp?: number;
  /** Click handler */
  onClick?: () => void;
  /** Additional actions menu content */
  actions?: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Animation delay for staggered lists */
  animationDelay?: number;
};

/** Get medal color for top 3 ranks */
function getRankStyle(rank: number) {
  switch (rank) {
    case 1:
      return {
        bg: "bg-gradient-to-br from-yellow-400 to-amber-500",
        text: "text-amber-900",
        glow: "shadow-lg shadow-amber-500/30",
      };
    case 2:
      return {
        bg: "bg-gradient-to-br from-gray-300 to-gray-400",
        text: "text-gray-700",
        glow: "shadow-lg shadow-gray-400/30",
      };
    case 3:
      return {
        bg: "bg-gradient-to-br from-orange-400 to-orange-600",
        text: "text-orange-900",
        glow: "shadow-lg shadow-orange-500/30",
      };
    default:
      return {
        bg: "bg-[var(--bg-elevated)]",
        text: "text-[var(--text-secondary)]",
        glow: "",
      };
  }
}

/**
 * UserCard displays a user's profile information.
 * Supports various contexts: friends list, leaderboard, group members.
 *
 * @example
 * // In a leaderboard
 * <UserCard
 *   displayName="Alice"
 *   level={15}
 *   currentStreak={7}
 *   rank={1}
 *   xpTotal={5000}
 *   showXp
 * />
 *
 * @example
 * // In a friends list
 * <UserCard
 *   displayName="Bob"
 *   level={10}
 *   currentStreak={3}
 *   onClick={() => viewProfile(userId)}
 *   actions={<FriendActions userId={userId} />}
 * />
 */
export default function UserCard({
  displayName,
  level,
  currentStreak,
  xpTotal,
  title,
  rank,
  isCurrentUser = false,
  showStats = true,
  showXp = false,
  role,
  weeklyXp,
  onClick,
  actions,
  className,
  animationDelay = 0,
}: UserCardProps) {
  const rankStyle = rank ? getRankStyle(rank) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: animationDelay,
        ease: "easeOut",
      }}
    >
      <GlowCard
        hoverLift
        hoverScale
        interactive={!!onClick}
        onClick={onClick}
        glowColor={isCurrentUser ? "primary" : "none"}
        className={cn(
          isCurrentUser && "ring-2 ring-[var(--accent-primary)]/30",
          className
        )}
      >
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          {rank && (
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold shrink-0",
                rankStyle?.bg,
                rankStyle?.text,
                rankStyle?.glow
              )}
            >
              {rank}
            </div>
          )}

          {/* Avatar / User Icon */}
          <div
            className={cn(
              "p-2.5 rounded-full shrink-0",
              isCurrentUser
                ? "bg-[var(--accent-primary)]/10"
                : "bg-[var(--bg-elevated)]"
            )}
          >
            <User
              size={20}
              className={
                isCurrentUser
                  ? "text-[var(--accent-primary)]"
                  : "text-[var(--text-muted)]"
              }
            />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "font-medium truncate",
                  isCurrentUser
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-primary)]"
                )}
              >
                {displayName || "Anonymous"}
                {isCurrentUser && (
                  <span className="text-xs text-[var(--text-muted)] ml-1">
                    (You)
                  </span>
                )}
              </p>

              {/* Role Badge */}
              {role === "owner" && (
                <Crown
                  size={14}
                  className="text-amber-500 shrink-0"
                  aria-label="Owner"
                />
              )}
              {role === "admin" && (
                <Shield
                  size={14}
                  className="text-[var(--accent-primary)] shrink-0"
                  aria-label="Admin"
                />
              )}
            </div>

            {/* Stats Row */}
            {showStats && (
              <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Zap size={12} className="text-[var(--accent-primary)]" />
                  Lv.{level}
                </span>
                {currentStreak > 0 && (
                  <span className="flex items-center gap-1">
                    <Flame size={12} className="text-[var(--accent-streak)]" />
                    {currentStreak}d
                  </span>
                )}
                {title && (
                  <span className="hidden sm:inline text-[var(--text-muted)]">
                    {title}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Value Column (XP, weekly XP, etc.) */}
          <div className="text-right shrink-0">
            {showXp && xpTotal !== undefined && (
              <p className="font-mono text-lg font-bold text-[var(--text-primary)]">
                {xpTotal.toLocaleString()}
                <span className="text-xs text-[var(--text-muted)] ml-1">XP</span>
              </p>
            )}
            {weeklyXp !== undefined && (
              <p className="text-sm text-[var(--text-muted)]">
                +{weeklyXp} this week
              </p>
            )}
          </div>

          {/* Actions Menu */}
          {actions && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      </GlowCard>
    </motion.div>
  );
}

/**
 * Compact variant of UserCard for inline display.
 */
export function UserCardCompact({
  displayName,
  level,
  currentStreak,
  isCurrentUser = false,
  onClick,
  className,
}: Pick<
  UserCardProps,
  "displayName" | "level" | "currentStreak" | "isCurrentUser" | "onClick" | "className"
>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "border border-[var(--border-subtle)]",
        "transition-colors duration-150",
        isCurrentUser && "ring-1 ring-[var(--accent-primary)]/30",
        className
      )}
    >
      <User size={16} className="text-[var(--text-muted)]" />
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {displayName || "Anonymous"}
      </span>
      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        <Zap size={10} /> {level}
      </span>
      {currentStreak > 0 && (
        <span className="flex items-center gap-1 text-xs text-[var(--accent-streak)]">
          <Flame size={10} /> {currentStreak}
        </span>
      )}
    </button>
  );
}
