"use client";

// =============================================================================
// TASK CARD COMPONENT
// Enhanced task display with priority indicator and XP value.
// Glassmorphism background, soft priority glow, smooth animations.
// =============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Check, Pencil, Trash2, Calendar, Clock } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { Task } from "@/app/lib/types";
import PriorityPill from "./ui/PriorityPill";

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
      {/* Checkbox with animated checkmark */}
      <motion.button
        type="button"
        onClick={() => onToggle?.(task.id)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "flex-shrink-0 w-11 h-11 sm:w-6 sm:h-6 rounded-lg sm:rounded",
          "border-2 flex items-center justify-center",
          "transition-all duration-200 cursor-pointer",
          isCompleted
            ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5"
        )}
      >
        <AnimatePresence mode="wait">
          {isCompleted && (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ duration: 0.15 }}
            >
              <Check size={18} className="text-white sm:hidden" />
              <Check size={14} className="text-white hidden sm:block" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

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

        {/* Date and time badges */}
        {(showDate || hasScheduledTime) && (
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
              className="p-2.5 sm:p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
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
              className="p-2.5 sm:p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
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

      {/* XP badge */}
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
        {task.xp_value} XP
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
