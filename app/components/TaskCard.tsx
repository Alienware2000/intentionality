"use client";

// =============================================================================
// TASK CARD COMPONENT
// Enhanced task display with priority indicator and XP value.
// Glassmorphism background, soft priority glow, smooth animations.
// Features anime.js-style checkbox draw and ripple effects.
// Shows goal indicator when task is linked to a weekly goal.
// =============================================================================

import { motion } from "framer-motion";
import { Pencil, Trash2, Calendar, Clock, Target } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { Task } from "@/app/lib/types";
import { FLAT_TASK_XP } from "@/app/lib/gamification";
import PriorityPill from "./ui/PriorityPill";
import AnimatedCheckbox from "./ui/AnimatedCheckbox";

type Props = {
  task: Task;
  onToggle?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  showDate?: boolean;
  className?: string;
};

export default function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  showDate = false,
  className,
}: Props) {
  const isCompleted = task.completed;
  const hasActions = onEdit || onDelete;
  const hasScheduledTime = task.scheduled_time;
  const hasGoalLink = task.weekly_goal_index !== null && task.weekly_goal_index !== undefined;

  return (
    <motion.div
      layout
      className={cn(
        "w-full group relative",
        "flex items-center gap-3 sm:gap-4 p-4",
        "rounded-xl",
        "bg-[var(--bg-card)] glass-card",
        "border border-[var(--border-subtle)]",
        "hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]",
        "hover-lift",
        "transition-all duration-200",
        isCompleted && "opacity-60",
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Checkbox with animated checkmark draw and ripple effect */}
      <AnimatedCheckbox
        checked={isCompleted}
        onChange={() => onToggle?.(task.id)}
        size="md"
        ariaLabel={isCompleted ? "Mark task incomplete" : "Mark task complete"}
      />

      {/* Task content - clickable to toggle */}
      <button
        type="button"
        onClick={() => onToggle?.(task.id)}
        className="flex-1 min-w-0 text-left cursor-pointer"
      >
        <motion.div
          className={cn(
            "font-medium truncate transition-all duration-200",
            isCompleted
              ? "line-through text-[var(--text-muted)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {task.title}
        </motion.div>

        {/* Date, time, and goal badges */}
        {(showDate || hasScheduledTime || hasGoalLink) && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {showDate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]">
                <Calendar size={10} />
                {task.due_date}
              </span>
            )}
            {hasScheduledTime && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]">
                <Clock size={10} />
                {formatTime(task.scheduled_time!)}
              </span>
            )}
            {hasGoalLink && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-xs text-[var(--accent-primary)]"
                title={`Linked to weekly goal #${(task.weekly_goal_index ?? 0) + 1}`}
              >
                <Target size={10} />
                Goal {(task.weekly_goal_index ?? 0) + 1}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Action buttons - always visible on mobile, hover on desktop */}
      {hasActions && (
        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <motion.button
              type="button"
              onClick={() => onEdit(task.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "p-2.5 sm:p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors",
                "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              )}
              title="Edit task"
            >
              <Pencil size={16} className="text-[var(--text-muted)] sm:hidden" />
              <Pencil size={14} className="text-[var(--text-muted)] hidden sm:block" />
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              type="button"
              onClick={() => onDelete(task.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "p-2.5 sm:p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors",
                "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              )}
              title="Delete task"
            >
              <Trash2 size={16} className="text-[var(--text-muted)] sm:hidden" />
              <Trash2 size={14} className="text-[var(--text-muted)] hidden sm:block" />
            </motion.button>
          )}
        </div>
      )}

      {/* Priority pill */}
      <PriorityPill priority={task.priority} />

      {/* XP badge - all tasks earn flat 15 XP */}
      <motion.div
        className={cn(
          "text-xs font-mono px-2.5 py-1 rounded-lg",
          "border",
          isCompleted
            ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)] border-[var(--accent-success)]/20"
            : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
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

// Helper to format time
function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}
