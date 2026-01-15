"use client";

// =============================================================================
// TASK CARD COMPONENT
// Enhanced task display with priority indicator and XP value.
// anime.js inspired: left border colored by priority, minimal design.
// =============================================================================

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { Task, Priority } from "@/app/lib/types";

type Props = {
  task: Task;
  onToggle?: (taskId: string) => void;
  showDate?: boolean;
  className?: string;
};

const priorityColors: Record<Priority, string> = {
  high: "border-l-[var(--priority-high)]",
  medium: "border-l-[var(--priority-medium)]",
  low: "border-l-[var(--priority-low)]",
};

const priorityLabels: Record<Priority, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

export default function TaskCard({
  task,
  onToggle,
  showDate = false,
  className,
}: Props) {
  const isCompleted = task.completed;

  return (
    <motion.button
      type="button"
      onClick={() => onToggle?.(task.id)}
      className={cn(
        "w-full text-left",
        "flex items-center gap-4 p-4",
        "border-l-4 rounded-r-lg",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "transition-colors duration-150",
        priorityColors[task.priority],
        isCompleted && "opacity-50",
        className
      )}
      whileTap={{ scale: 0.98 }}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded",
          "border-2 flex items-center justify-center",
          "transition-colors duration-150",
          isCompleted
            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)]"
        )}
      >
        {isCompleted && <Check size={14} className="text-white" />}
      </div>

      {/* Task content */}
      <div className="flex-1 min-w-0">
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
      </div>

      {/* Priority label */}
      <div className="hidden sm:block text-xs text-[var(--text-muted)] font-mono">
        {priorityLabels[task.priority]}
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
    </motion.button>
  );
}
