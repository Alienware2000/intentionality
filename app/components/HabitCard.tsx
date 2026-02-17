"use client";

// =============================================================================
// HABIT CARD COMPONENT
// Displays a single habit with completion status, streak, schedule, and actions.
// Enhanced with glassmorphism, warm streak glow, and smooth animations.
// Features anime.js-style checkbox draw and ripple effects.
// =============================================================================

import { memo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, Flame, Calendar } from "lucide-react";
import anime from "animejs";
import { cn } from "@/app/lib/cn";
import { isActiveDay } from "@/app/lib/date-utils";
import { prefersReducedMotion } from "@/app/lib/anime-utils";
import { FLAT_TASK_XP } from "@/app/lib/gamification";
import type { HabitWithStatus, ISODateString, HabitFrequency } from "@/app/lib/types";
import AnimatedCheckbox from "./ui/AnimatedCheckbox";

type Props = {
  habit: HabitWithStatus;
  date: ISODateString;
  onToggle?: (habitId: string) => void;
  onEdit?: (habitId: string) => void;
  onDelete?: (habitId: string) => void;
};

/**
 * Get display label for habit frequency.
 */
function getScheduleLabel(frequency: HabitFrequency): string | null {
  switch (frequency) {
    case "daily":
      return null;
    case "weekdays":
      return "Mon-Fri";
    case "weekends":
      return "Sat-Sun";
    case "custom":
      return "Custom";
  }
}

function HabitCard({
  habit,
  date,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  const isCompleted = habit.completedToday;
  const activeDays = habit.active_days ?? [1, 2, 3, 4, 5, 6, 7];
  const isActiveToday = isActiveDay(date, activeDays);
  const scheduleLabel = getScheduleLabel(habit.frequency ?? "daily");
  const hasStreak = habit.current_streak > 0;

  const streakRef = useRef<HTMLDivElement>(null);
  const prevCompletedRef = useRef(isCompleted);

  // Animate streak badge on completion
  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current && streakRef.current && !prefersReducedMotion()) {
      anime({
        targets: streakRef.current,
        scale: [1, 1.2, 1],
        duration: 400,
        easing: "easeOutBack",
      });
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  return (
    <motion.div
      layout
      className={cn(
        "group flex items-center gap-2 sm:gap-3 p-3",
        "rounded-xl",
        "bg-[var(--bg-card)]",
        "border border-[var(--border-subtle)]",
        "hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]",
        "hover-lift",
        "transition-all duration-200",
        (isCompleted || !isActiveToday) && "opacity-60"
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* Checkbox with animated checkmark draw and ripple effect */}
      <AnimatedCheckbox
        checked={isCompleted && isActiveToday}
        disabled={!isActiveToday}
        onChange={() => isActiveToday && onToggle?.(habit.id)}
        size="md"
        ariaLabel={
          !isActiveToday
            ? "Not scheduled today"
            : isCompleted
            ? "Mark habit incomplete"
            : "Mark habit complete"
        }
      />

      {/* Title and schedule info */}
      <button
        type="button"
        onClick={() => isActiveToday && onToggle?.(habit.id)}
        disabled={!isActiveToday}
        className={cn(
          "flex-1 min-w-0 text-left",
          isActiveToday ? "cursor-pointer" : "cursor-default"
        )}
      >
        <motion.span
          className={cn(
            "text-sm truncate block transition-all duration-200",
            isCompleted
              ? "line-through text-[var(--text-muted)]"
              : !isActiveToday
              ? "text-[var(--text-muted)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {habit.title}
        </motion.span>
        {!isActiveToday && (
          <span className="text-xs text-[var(--text-muted)]">
            Not scheduled today
          </span>
        )}
      </button>

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-1 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <motion.button
            type="button"
            onClick={() => onEdit(habit.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Edit habit"
            className={cn(
              "p-2.5 sm:p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors",
              "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
            )}
          >
            <Pencil size={14} className="text-[var(--text-muted)] sm:hidden" />
            <Pencil size={12} className="text-[var(--text-muted)] hidden sm:block" />
          </motion.button>
        )}
        {onDelete && (
          <motion.button
            type="button"
            onClick={() => onDelete(habit.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Delete habit"
            className={cn(
              "p-2.5 sm:p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors",
              "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
            )}
          >
            <Trash2 size={14} className="text-[var(--text-muted)] sm:hidden" />
            <Trash2 size={12} className="text-[var(--text-muted)] hidden sm:block" />
          </motion.button>
        )}
      </div>

      {/* Schedule badge for non-daily habits */}
      {scheduleLabel && (
        <div
          className={cn(
            "hidden sm:flex items-center gap-1",
            "text-xs px-2 py-0.5 rounded-full",
            "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
          )}
        >
          <Calendar size={10} />
          <span>{scheduleLabel}</span>
        </div>
      )}

      {/* Streak indicator with warm glow */}
      {hasStreak && (
        <motion.div
          ref={streakRef}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg",
            "bg-[var(--accent-streak)]/10 text-[var(--accent-streak)]",
            habit.current_streak >= 7 && "border border-[var(--accent-streak)]/30"
          )}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Flame
            size={14}
            fill="currentColor"
            className={cn(
              habit.current_streak >= 7 && "animate-[pulse_2s_ease-in-out_infinite]"
            )}
          />
          <span className="text-xs font-mono font-bold">
            {habit.current_streak}
          </span>
        </motion.div>
      )}

      {/* XP badge - all habits earn flat 15 XP */}
      <motion.div
        className={cn(
          "text-xs font-mono px-2.5 py-1 rounded-lg",
          "border",
          isCompleted
            ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)] border-[var(--accent-success)]/20"
            : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-subtle)]"
        )}
        animate={isCompleted ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {isCompleted && "+"}
        {FLAT_TASK_XP} XP
      </motion.div>
    </motion.div>
  );
}

export default memo(HabitCard);
