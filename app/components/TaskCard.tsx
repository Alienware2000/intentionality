"use client";

// =============================================================================
// TASK CARD COMPONENT
// Enhanced task display with priority indicator and XP value.
// anime.js inspired: left border colored by priority, minimal design.
// =============================================================================

import { motion } from "framer-motion";
import { Check, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { PRIORITY_BORDER_COLORS, PRIORITY_LABELS } from "@/app/lib/constants";
import type { Task } from "@/app/lib/types";

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

  return (
    <motion.div
      className={cn(
        "w-full group",
        "flex items-center gap-3 sm:gap-4 p-4",
        "border-l-4 rounded-r-lg",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "transition-colors duration-150",
        PRIORITY_BORDER_COLORS[task.priority],
        isCompleted && "opacity-50",
        className
      )}
      whileTap={{ scale: 0.98 }}
    >
      {/* Checkbox - larger touch target on mobile (44px min) */}
      <button
        type="button"
        onClick={() => onToggle?.(task.id)}
        className={cn(
          "flex-shrink-0 w-11 h-11 sm:w-6 sm:h-6 rounded",
          "border-2 flex items-center justify-center",
          "transition-colors duration-150 cursor-pointer",
          isCompleted
            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)]"
        )}
      >
        {isCompleted && <Check size={18} className="text-white sm:hidden" />}
        {isCompleted && <Check size={14} className="text-white hidden sm:block" />}
      </button>

      {/* Task content - clickable to toggle */}
      <button
        type="button"
        onClick={() => onToggle?.(task.id)}
        className="flex-1 min-w-0 text-left cursor-pointer"
      >
        <div
          className={cn(
            "font-medium truncate",
            isCompleted
              ? "line-through text-[var(--text-muted)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {task.title}
        </div>
        {showDate && (
          <div className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
            {task.due_date}
          </div>
        )}
      </button>

      {/* Action buttons - always visible on mobile, hover on desktop */}
      {hasActions && (
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task.id)}
              className="p-2.5 sm:p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
              title="Edit task"
            >
              <Pencil size={16} className="text-[var(--text-muted)] sm:hidden" />
              <Pencil size={14} className="text-[var(--text-muted)] hidden sm:block" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-2.5 sm:p-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors"
              title="Delete task"
            >
              <Trash2 size={16} className="text-[var(--text-muted)] sm:hidden" />
              <Trash2 size={14} className="text-[var(--text-muted)] hidden sm:block" />
            </button>
          )}
        </div>
      )}

      {/* Priority label */}
      <div className="hidden sm:block text-xs text-[var(--text-muted)] font-mono">
        {PRIORITY_LABELS[task.priority]}
      </div>

      {/* XP value */}
      <div
        className={cn(
          "text-xs font-mono px-2 py-1 rounded",
          "bg-[var(--bg-elevated)]",
          isCompleted
            ? "text-[var(--accent-success)]"
            : "text-[var(--text-secondary)]"
        )}
      >
        +{task.xp_value} XP
      </div>
    </motion.div>
  );
}
