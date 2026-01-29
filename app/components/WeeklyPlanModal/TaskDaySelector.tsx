"use client";

// =============================================================================
// TASK DAY SELECTOR COMPONENT
// Allows users to select which day a task should be scheduled on and which
// quest to assign the task to. Shows Mon-Sun as toggleable chips with visual
// indication of detected days.
// =============================================================================

import { memo } from "react";
import { X, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { DAY_CONFIG, PRIORITY_CONFIG, type DayKey } from "./constants";
import type { Priority, Quest } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type TaskSuggestionItem = {
  id: string;
  title: string;
  priority: Priority;
  category: "major" | "have-to" | "quick-win";
  detected_day?: DayKey;
  selected_day: DayKey;
  selected_quest_id: string | null;
  included: boolean;
};

type Props = {
  task: TaskSuggestionItem;
  quests: Quest[];
  onSelectDay: (taskId: string, day: DayKey) => void;
  onSelectQuest: (taskId: string, questId: string) => void;
  onToggleInclude: (taskId: string) => void;
  onRemove: (taskId: string) => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

function TaskDaySelector({ task, quests, onSelectDay, onSelectQuest, onToggleInclude, onRemove }: Props) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const selectedQuest = quests.find((q) => q.id === task.selected_quest_id);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        task.included
          ? `${priorityConfig.bgClass} ${priorityConfig.borderClass}`
          : "bg-[var(--bg-elevated)]/50 border-[var(--border-subtle)] opacity-60"
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Include/exclude checkbox */}
        <button
          onClick={() => onToggleInclude(task.id)}
          className={cn(
            "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0",
            "transition-colors min-w-[20px] min-h-[20px]",
            task.included
              ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
              : "border-[var(--border-subtle)] hover:border-[var(--text-muted)]"
          )}
          aria-label={task.included ? "Exclude task" : "Include task"}
        >
          {task.included && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="text-white"
            >
              <path
                d="M2.5 6L5 8.5L9.5 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              "font-medium text-sm leading-tight",
              task.included ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"
            )}
          >
            {task.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: task.included ? priorityConfig.color : "var(--text-muted)" }}
            >
              {priorityConfig.label}
            </span>
            {task.detected_day && (
              <span className="flex items-center gap-1 text-xs text-[var(--accent-highlight)]">
                <Sparkles size={10} />
                <span>Detected</span>
              </span>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(task.id)}
          className={cn(
            "p-1.5 rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center",
            "text-[var(--text-muted)] hover:text-[var(--priority-high)]",
            "hover:bg-[var(--priority-high)]/10 transition-colors"
          )}
          aria-label="Remove task"
        >
          <X size={16} />
        </button>
      </div>

      {/* Day selection and Quest selector rows */}
      {task.included && (
        <>
          {/* Day selection row */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {DAY_CONFIG.map((day) => {
              const isSelected = task.selected_day === day.key;
              const isDetected = task.detected_day === day.key;

              return (
                <button
                  key={day.key}
                  onClick={() => onSelectDay(task.id, day.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium min-h-[32px]",
                    "transition-all relative",
                    isSelected
                      ? "bg-[var(--accent-primary)] text-white shadow-sm"
                      : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                    isDetected && !isSelected && "ring-2 ring-[var(--accent-highlight)]/50"
                  )}
                  aria-label={`Schedule for ${day.fullLabel}`}
                  aria-pressed={isSelected}
                >
                  {day.label}
                  {isDetected && !isSelected && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent-highlight)] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quest selector */}
          {quests.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Quest:</span>
              <div className="relative flex-1 max-w-[200px]">
                <select
                  value={task.selected_quest_id || ""}
                  onChange={(e) => onSelectQuest(task.id, e.target.value)}
                  className={cn(
                    "w-full pl-3 pr-8 py-1.5 rounded-lg text-xs appearance-none cursor-pointer",
                    "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                    "text-[var(--text-secondary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]",
                    "transition-colors"
                  )}
                >
                  {quests.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default memo(TaskDaySelector);
