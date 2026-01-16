"use client";

// =============================================================================
// HABIT CARD COMPONENT
// Displays a single habit with completion status, streak, and actions.
// =============================================================================

import { Check, Pencil, Trash2, Flame } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { PRIORITY_BORDER_COLORS } from "@/app/lib/constants";
import type { HabitWithStatus } from "@/app/lib/types";

type Props = {
  habit: HabitWithStatus;
  onToggle?: (habitId: string) => void;
  onEdit?: (habitId: string) => void;
  onDelete?: (habitId: string) => void;
};

export default function HabitCard({
  habit,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  const isCompleted = habit.completedToday;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3",
        "border-l-2 rounded-r-lg",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "transition-colors duration-150",
        PRIORITY_BORDER_COLORS[habit.priority],
        isCompleted && "opacity-60"
      )}
    >
      {/* Checkbox - larger touch target on mobile */}
      <button
        type="button"
        onClick={() => onToggle?.(habit.id)}
        aria-label={isCompleted ? "Mark habit incomplete" : "Mark habit complete"}
        className={cn(
          "flex-shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded",
          "border-2 flex items-center justify-center",
          "transition-colors duration-150 cursor-pointer",
          isCompleted
            ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)]"
        )}
      >
        {isCompleted && <Check size={14} className="text-white sm:hidden" />}
        {isCompleted && <Check size={12} className="text-white hidden sm:block" />}
      </button>

      {/* Title */}
      <button
        type="button"
        onClick={() => onToggle?.(habit.id)}
        className="flex-1 min-w-0 text-left cursor-pointer"
      >
        <span
          className={cn(
            "text-sm truncate block",
            isCompleted
              ? "line-through text-[var(--text-muted)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {habit.title}
        </span>
      </button>

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(habit.id)}
            aria-label="Edit habit"
            className="p-2 sm:p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
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
            className="p-2 sm:p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Trash2 size={14} className="text-[var(--text-muted)] sm:hidden" />
            <Trash2 size={12} className="text-[var(--text-muted)] hidden sm:block" />
          </button>
        )}
      </div>

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
