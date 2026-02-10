"use client";

// =============================================================================
// WEEKLY AWARDS DISPLAY
// Shows the podium with last week's top 3 members in a group.
// =============================================================================

import { motion } from "framer-motion";
import { Trophy, Medal, Crown, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { WeeklyAwards } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type WeeklyAwardsDisplayProps = {
  awards: WeeklyAwards | null;
  currentUserId?: string;
  className?: string;
};

// -----------------------------------------------------------------------------
// Helper: Format date range
// -----------------------------------------------------------------------------

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

// -----------------------------------------------------------------------------
// Podium Position Component
// -----------------------------------------------------------------------------

type PodiumPositionProps = {
  place: 1 | 2 | 3;
  data: {
    user_id: string;
    display_name: string | null;
    xp: number;
    xp_bonus: number;
  } | null;
  isCurrentUser: boolean;
};

function PodiumPosition({ place, data, isCurrentUser }: PodiumPositionProps) {
  if (!data) return null;

  const config = {
    1: {
      height: "h-24",
      bg: "bg-[var(--tier-gold-bg)]",
      border: "border-[var(--tier-gold-text)]",
      textColor: "text-[var(--tier-gold-text)]",
      icon: Crown,
      label: "1st",
      delay: 0.2,
    },
    2: {
      height: "h-20",
      bg: "bg-[var(--tier-silver-bg)]",
      border: "border-[var(--tier-silver-text)]",
      textColor: "text-[var(--tier-silver-text)]",
      icon: Medal,
      label: "2nd",
      delay: 0.3,
    },
    3: {
      height: "h-16",
      bg: "bg-[var(--tier-bronze-bg)]",
      border: "border-[var(--tier-bronze-text)]",
      textColor: "text-[var(--tier-bronze-text)]",
      icon: Medal,
      label: "3rd",
      delay: 0.4,
    },
  };

  const { height, bg, border, textColor, icon: Icon, label, delay } = config[place];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "flex flex-col items-center",
        place === 1 ? "order-2" : place === 2 ? "order-1" : "order-3"
      )}
    >
      {/* Avatar area */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.1, type: "spring", bounce: 0.5 }}
        className={cn(
          "relative flex items-center justify-center",
          "w-12 h-12 rounded-full mb-2",
          bg,
          "border-2",
          border,
          isCurrentUser && "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-card)]"
        )}
      >
        <Icon size={place === 1 ? 24 : 20} className={textColor} />
        {place === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles size={12} className="text-[var(--tier-gold-text)]" />
          </motion.div>
        )}
      </motion.div>

      {/* Name */}
      <p
        className={cn(
          "text-xs font-medium text-center truncate max-w-[80px]",
          isCurrentUser ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
        )}
      >
        {data.display_name || "Anonymous"}
        {isCurrentUser && " (You)"}
      </p>

      {/* XP Earned */}
      <p className={cn("text-xs font-mono font-bold", textColor)}>
        +{data.xp}
      </p>

      {/* Bonus badge */}
      <div className={cn("text-xs px-1.5 py-0.5 rounded-full mt-1", bg, textColor)}>
        +{data.xp_bonus} bonus
      </div>

      {/* Podium block */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.1, duration: 0.3 }}
        style={{ originY: 1 }}
        className={cn(
          "w-20 sm:w-24 mt-2 rounded-t-lg flex items-end justify-center",
          height,
          bg,
          "border-t-2 border-x-2",
          border
        )}
      >
        <span className={cn("text-lg font-bold mb-2", textColor)}>{label}</span>
      </motion.div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function WeeklyAwardsDisplay({
  awards,
  currentUserId,
  className,
}: WeeklyAwardsDisplayProps) {
  if (!awards) {
    return null;
  }

  const hasWinners = awards.first_place || awards.second_place || awards.third_place;

  if (!hasWinners) {
    return null;
  }

  return (
    <div className={cn("rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-[var(--tier-gold-bg)]">
          <Trophy size={16} className="text-[var(--tier-gold-text)]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Last Week&apos;s Winners</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {formatWeekRange(awards.week_start, awards.week_end)}
          </p>
        </div>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-2 sm:gap-4">
        <PodiumPosition
          place={2}
          data={awards.second_place}
          isCurrentUser={awards.second_place?.user_id === currentUserId}
        />
        <PodiumPosition
          place={1}
          data={awards.first_place}
          isCurrentUser={awards.first_place?.user_id === currentUserId}
        />
        <PodiumPosition
          place={3}
          data={awards.third_place}
          isCurrentUser={awards.third_place?.user_id === currentUserId}
        />
      </div>

      {/* Total XP */}
      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Group earned <span className="font-mono font-bold text-[var(--accent-primary)]">{awards.total_group_xp.toLocaleString()} XP</span> last week
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Loading Skeleton
// -----------------------------------------------------------------------------

export function WeeklyAwardsDisplaySkeleton() {
  return (
    <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[var(--skeleton-bg)]" />
        <div className="space-y-1">
          <div className="h-4 w-32 rounded bg-[var(--skeleton-bg)]" />
          <div className="h-3 w-20 rounded bg-[var(--skeleton-bg)]" />
        </div>
      </div>
      <div className="flex items-end justify-center gap-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[var(--skeleton-bg)]" />
          <div className="w-24 h-20 mt-2 rounded-t-lg bg-[var(--skeleton-bg)]" />
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[var(--skeleton-bg)]" />
          <div className="w-24 h-24 mt-2 rounded-t-lg bg-[var(--skeleton-bg)]" />
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[var(--skeleton-bg)]" />
          <div className="w-24 h-16 mt-2 rounded-t-lg bg-[var(--skeleton-bg)]" />
        </div>
      </div>
    </div>
  );
}
