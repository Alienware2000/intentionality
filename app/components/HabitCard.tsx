"use client";

// =============================================================================
// HABIT CARD COMPONENT
// Displays a single habit with completion status, streak, schedule, and actions.
// =============================================================================

import { memo } from "react";
import { Check, Pencil, Trash2, Flame, Calendar } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { PRIORITY_BORDER_COLORS } from "@/app/lib/constants";
import { isActiveDay } from "@/app/lib/date-utils";
import type { HabitWithStatus, ISODateString, HabitFrequency } from "@/app/lib/types";

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
      return null; // Don't show badge for daily
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

  return (
    <div
      className={cn(
        "group flex items-center gap-2 sm:gap-3 p-3",
        "border-l-2 rounded-r-lg",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "transition-colors duration-150",
        PRIORITY_BORDER_COLORS[habit.priority],
        (isCompleted || !isActiveToday) && "opacity-60"
      )}
    >
      {/* Checkbox - larger touch target on mobile (44px min) */}
      <button
        type="button"
        onClick={() => isActiveToday && onToggle?.(habit.id)}
        disabled={!isActiveToday}
        aria-label={
          !isActiveToday
            ? "Not scheduled today"
            : isCompleted
            ? "Mark habit incomplete"
            : "Mark habit complete"
        }
        className={cn(
          "flex-shrink-0 w-11 h-11 sm:w-6 sm:h-6 rounded",
          "border-2 flex items-center justify-center",
          "transition-colors duration-150",
          !isActiveToday
            ? "border-[var(--border-subtle)] bg-[var(--bg-elevated)] cursor-not-allowed"
            : isCompleted
            ? "bg-[var(--accent-success)] border-[var(--accent-success)] cursor-pointer"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)] cursor-pointer"
        )}
      >
        {isCompleted && isActiveToday && <Check size={18} className="text-white sm:hidden" />}
        {isCompleted && isActiveToday && <Check size={14} className="text-white hidden sm:block" />}
      </button>

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
        <span
          className={cn(
            "text-sm truncate block",
            isCompleted
              ? "line-through text-[var(--text-muted)]"
              : !isActiveToday
              ? "text-[var(--text-muted)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {habit.title}
        </span>
        {!isActiveToday && (
          <span className="text-xs text-[var(--text-muted)]">
            Not scheduled today
          </span>
        )}
      </button>

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(habit.id)}
            aria-label="Edit habit"
            className="p-2.5 sm:p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Pencil size={14} className="text-[var(--text-muted)] sm:hidden" />
            <Pencil size={12} className="text-[var(--text-muted)] hidden sm:block" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(habit.id)}
            aria-label="Delete habit"
            className="p-2.5 sm:p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Trash2 size={14} className="text-[var(--text-muted)] sm:hidden" />
            <Trash2 size={12} className="text-[var(--text-muted)] hidden sm:block" />
          </button>
        )}
      </div>

      {/* Schedule badge for non-daily habits */}
      {scheduleLabel && (
        <div
          className={cn(
            "hidden sm:flex items-center gap-1",
            "text-xs px-2 py-0.5 rounded",
            "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
          )}
        >
          <Calendar size={10} />
          <span>{scheduleLabel}</span>
        </div>
      )}

      {/* Streak indicator */}
      {habit.current_streak > 0 && (
        <div
          className={cn(
            "flex items-center gap-1",
            "text-[var(--accent-streak)]"
          )}
        >
          <Flame size={14} fill="currentColor" />
          <span className="text-xs font-mono font-bold">
            {habit.current_streak}
          </span>
        </div>
      )}

      {/* XP badge */}
      <div
        className={cn(
          "text-xs font-mono px-2 py-0.5 rounded",
          "bg-[var(--bg-elevated)]",
          isCompleted
            ? "text-[var(--accent-success)]"
            : "text-[var(--text-muted)]"
        )}
      >
        +{habit.xp_value}
      </div>
    </div>
  );
}

export default memo(HabitCard);
