"use client";

// =============================================================================
// ACTIVITY FEED ITEM COMPONENT
// Displays a single activity in the social feed.
// =============================================================================

import { motion } from "framer-motion";
import {
  CheckCircle,
  Flag,
  TrendingUp,
  Award,
  Flame,
  Repeat,
  Users,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { ActivityType, ActivityFeedItemWithUser } from "@/app/lib/types";

type ActivityFeedItemProps = {
  /** The activity data */
  activity: ActivityFeedItemWithUser;
  /** Animation index for staggering */
  index?: number;
  /** Whether to show user info (for group feeds) */
  showUser?: boolean;
};

/** Get icon and color for activity type */
function getActivityConfig(type: ActivityType) {
  switch (type) {
    case "task_completed":
      return {
        icon: CheckCircle,
        color: "text-[var(--accent-success)]",
        bg: "bg-[var(--accent-success)]/10",
      };
    case "quest_completed":
      return {
        icon: Flag,
        color: "text-[var(--accent-highlight)]",
        bg: "bg-[var(--accent-highlight)]/10",
      };
    case "level_up":
      return {
        icon: TrendingUp,
        color: "text-[var(--accent-primary)]",
        bg: "bg-[var(--accent-primary)]/10",
      };
    case "achievement_unlocked":
      return {
        icon: Award,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
      };
    case "streak_milestone":
      return {
        icon: Flame,
        color: "text-[var(--accent-streak)]",
        bg: "bg-[var(--accent-streak)]/10",
      };
    case "habit_streak":
      return {
        icon: Repeat,
        color: "text-[var(--accent-streak)]",
        bg: "bg-[var(--accent-streak)]/10",
      };
    case "joined_group":
      return {
        icon: Users,
        color: "text-[var(--accent-primary)]",
        bg: "bg-[var(--accent-primary)]/10",
      };
    case "focus_milestone":
      return {
        icon: Clock,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
      };
    default:
      return {
        icon: CheckCircle,
        color: "text-[var(--text-muted)]",
        bg: "bg-[var(--bg-elevated)]",
      };
  }
}

/** Format relative time */
function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * ActivityFeedItem displays a single activity in the social feed.
 *
 * @example
 * <ActivityFeedItem
 *   activity={activity}
 *   index={0}
 *   showUser
 * />
 */
export default function ActivityFeedItem({
  activity,
  index = 0,
  showUser = true,
}: ActivityFeedItemProps) {
  const config = getActivityConfig(activity.activity_type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
        ease: "easeOut",
      }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]"
      )}
    >
      {/* Activity Icon */}
      <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
        <Icon size={16} className={config.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showUser && (
          <div className="flex items-center gap-2 mb-1">
            <User size={12} className="text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {activity.display_name || "Anonymous"}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Lv.{activity.level}
            </span>
          </div>
        )}

        <p className="text-sm text-[var(--text-secondary)]">{activity.message}</p>

        <p className="text-xs text-[var(--text-muted)] mt-1">
          {formatRelativeTime(activity.created_at)}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * ActivityFeedSkeleton for loading states.
 */
export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--skeleton-bg)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-[var(--skeleton-bg)] animate-pulse" />
            <div className="h-4 w-48 rounded bg-[var(--skeleton-bg)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state for activity feed.
 */
export function NoActivityMessage() {
  return (
    <div className="text-center py-8">
      <div className="inline-flex p-4 rounded-full bg-[var(--bg-elevated)] mb-3">
        <Clock size={24} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)]">No recent activity</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Activity from friends and group members will appear here
      </p>
    </div>
  );
}
