"use client";

// =============================================================================
// DAY TIMELINE COMPONENT
// Unified chronological view of tasks and schedule blocks for a day.
// Used by both Today and Week views for consistent display.
// =============================================================================

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  MapPin,
  AlertCircle,
  ArrowRight,
  Zap,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useDayTimeline } from "@/app/lib/hooks/useDayTimeline";
import { cn } from "@/app/lib/cn";
import type { ISODateString, Task, ScheduleBlock, TimelineItem, Priority, Id, Quest } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import EditTaskModal from "./EditTaskModal";
import ConfirmModal from "./ConfirmModal";

type Props = {
  date: ISODateString;
  showOverdue?: boolean;
  showAddTask?: boolean;
  compact?: boolean;
  quests?: Quest[];
  onRefresh?: () => void;
};

const priorityColors: Record<Priority, string> = {
  high: "border-l-[var(--priority-high)]",
  medium: "border-l-[var(--priority-medium)]",
  low: "border-l-[var(--priority-low)]",
};

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function DayTimeline({
  date,
  showOverdue = false,
  showAddTask = false,
  compact = false,
  quests = [],
  onRefresh,
}: Props) {
  const {
    scheduledItems,
    unscheduledTasks,
    overdueTasks,
    loading,
    error,
    refresh,
    toggleTask,
    toggleScheduleBlock,
  } = useDayTimeline(date);

  // Add task form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [scheduledTime, setScheduledTime] = useState("");
  const [questId, setQuestId] = useState<Id>(quests[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit/delete task state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<Id | null>(null);

  async function handleAddTask() {
    const trimmed = title.trim();
    if (!trimmed || !questId) return;

    setAdding(true);
    setAddError(null);

    try {
      await fetchApi("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          due_date: date,
          quest_id: questId,
          priority,
          scheduled_time: scheduledTime || null,
        }),
      });

      setTitle("");
      setScheduledTime("");
      setShowForm(false);
      await refresh();
      onRefresh?.();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (e) {
      setAddError(getErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleMoveToday(taskId: Id) {
    try {
      await fetchApi("/api/tasks/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, dueDate: date }),
      });
      await refresh();
      onRefresh?.();
    } catch (e) {
      console.error("Failed to move task:", e);
    }
  }

  async function handleEditTask(
    taskId: string,
    updates: { title?: string; due_date?: string; priority?: Priority; scheduled_time?: string | null }
  ) {
    try {
      await fetchApi("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });
      await refresh();
      onRefresh?.();
    } catch (e) {
      console.error("Failed to edit task:", e);
    }
  }

  async function handleDeleteTask(taskId: Id) {
    try {
      await fetchApi("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      setDeletingTaskId(null);
      await refresh();
      onRefresh?.();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (e) {
      console.error("Failed to delete task:", e);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse bg-[var(--bg-card)] rounded-lg",
              compact ? "h-10" : "h-14"
            )}
          />
        ))}
      </div>
    );
  }

  const hasItems = scheduledItems.length > 0 || unscheduledTasks.length > 0;
  const hasOverdue = showOverdue && overdueTasks.length > 0;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {error && (
        <p className="text-xs text-[var(--accent-primary)]">Error: {error}</p>
      )}

      {/* Overdue Tasks */}
      {hasOverdue && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[var(--accent-primary)]">
            <AlertCircle size={14} />
            <span className="text-xs font-bold tracking-widest uppercase">
              Overdue
            </span>
          </div>
          {overdueTasks.map((task) => (
            <OverdueTaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onMoveToday={handleMoveToday}
              onEdit={setEditingTask}
              onDelete={setDeletingTaskId}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Scheduled Items (timeline) */}
      {scheduledItems.length > 0 && (
        <div className="space-y-2">
          {scheduledItems.map((item) =>
            item.type === "task" ? (
              <ScheduledTaskItem
                key={`task-${item.data.id}`}
                task={item.data}
                onToggle={toggleTask}
                onEdit={setEditingTask}
                onDelete={setDeletingTaskId}
                compact={compact}
              />
            ) : (
              <ScheduleBlockItem
                key={`block-${item.data.id}`}
                block={item.data}
                completed={item.completed}
                onToggle={toggleScheduleBlock}
                compact={compact}
              />
            )
          )}
        </div>
      )}

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div className="space-y-2">
          {scheduledItems.length > 0 && (
            <div className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] pt-2">
              Tasks
            </div>
          )}
          {unscheduledTasks.map((task) => (
            <UnscheduledTaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onEdit={setEditingTask}
              onDelete={setDeletingTaskId}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasItems && !hasOverdue && !showForm && (
        <p className={cn(
          "text-[var(--text-muted)] text-center",
          compact ? "text-xs py-4" : "text-sm py-6"
        )}>
          No items scheduled
        </p>
      )}

      {/* Add Task */}
      {showAddTask && quests.length > 0 && (
        <div className="pt-1">
          {showForm ? (
            <div className={cn("space-y-2 p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)]")}>
              <div className="flex gap-2">
                <select
                  value={questId}
                  onChange={(e) => setQuestId(e.target.value)}
                  className={cn(
                    "flex-1 min-w-0 px-2 py-1.5 text-xs rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                >
                  {quests.map((q) => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={cn(
                    "px-2 py-1.5 text-xs rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder="Time"
                  className={cn(
                    "px-2 py-1.5 text-xs rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]",
                    "[color-scheme:dark]"
                  )}
                />
              </div>
              <div className="flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="Task title..."
                  autoFocus
                  className={cn(
                    "flex-1 min-w-0 px-2 py-1.5 text-sm rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                />
                <button
                  onClick={handleAddTask}
                  disabled={adding || !title.trim()}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:bg-[var(--accent-primary)]/80 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {adding ? "..." : "Add"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded",
                    "bg-[var(--bg-hover)] text-[var(--text-muted)]",
                    "hover:bg-[var(--bg-elevated)] transition-colors"
                  )}
                >
                  Cancel
                </button>
              </div>
              {addError && (
                <p className="text-xs text-[var(--accent-primary)]">{addError}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className={cn(
                "w-full flex items-center justify-center gap-1",
                "py-2 rounded-lg border border-dashed border-[var(--border-default)]",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                "hover:border-[var(--border-subtle)] transition-colors",
                compact ? "text-xs" : "text-sm"
              )}
            >
              <Plus size={compact ? 12 : 14} />
              <span>Add task</span>
            </button>
          )}
        </div>
      )}

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        onSave={handleEditTask}
        onClose={() => setEditingTask(null)}
      />

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={deletingTaskId !== null}
        title="Delete Task"
        message="This will permanently delete this task. This action cannot be undone."
        onConfirm={() => deletingTaskId && handleDeleteTask(deletingTaskId)}
        onCancel={() => setDeletingTaskId(null)}
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ScheduledTaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  compact,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  compact: boolean;
}) {
  const isCompleted = task.completed;

  return (
    <motion.div
      className={cn(
        "group flex items-center gap-3 rounded-lg border-l-4",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "transition-colors",
        priorityColors[task.priority],
        isCompleted && "opacity-50",
        compact ? "p-2" : "p-3"
      )}
      whileTap={{ scale: 0.98 }}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "flex-shrink-0 rounded border-2 flex items-center justify-center",
          compact ? "w-4 h-4" : "w-5 h-5",
          isCompleted
            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)]"
        )}
      >
        {isCompleted && <Check size={compact ? 10 : 12} className="text-white" />}
      </button>

      {task.scheduled_time && (
        <span className={cn(
          "font-mono text-[var(--text-muted)]",
          compact ? "text-xs" : "text-xs"
        )}>
          {formatTime(task.scheduled_time)}
        </span>
      )}

      <span
        className={cn(
          "flex-1 min-w-0 truncate",
          isCompleted ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]",
          compact ? "text-sm" : "text-sm font-medium"
        )}
      >
        {task.title}
      </span>

      {/* Edit/Delete buttons - show on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Pencil size={compact ? 12 : 14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <Trash2 size={compact ? 12 : 14} />
        </button>
      </div>

      <span className={cn(
        "text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]",
        isCompleted ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"
      )}>
        +{task.xp_value}
      </span>
    </motion.div>
  );
}

function UnscheduledTaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  compact,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  compact: boolean;
}) {
  const isCompleted = task.completed;

  return (
    <motion.div
      className={cn(
        "group flex items-center gap-3 rounded-lg border-l-4",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "transition-colors",
        priorityColors[task.priority],
        isCompleted && "opacity-50",
        compact ? "p-2" : "p-3"
      )}
      whileTap={{ scale: 0.98 }}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "flex-shrink-0 rounded border-2 flex items-center justify-center",
          compact ? "w-4 h-4" : "w-5 h-5",
          isCompleted
            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)]"
        )}
      >
        {isCompleted && <Check size={compact ? 10 : 12} className="text-white" />}
      </button>

      <span
        className={cn(
          "flex-1 min-w-0 truncate",
          isCompleted ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]",
          compact ? "text-sm" : "text-sm font-medium"
        )}
      >
        {task.title}
      </span>

      {/* Edit/Delete buttons - show on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Pencil size={compact ? 12 : 14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <Trash2 size={compact ? 12 : 14} />
        </button>
      </div>

      <span className={cn(
        "text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]",
        isCompleted ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"
      )}>
        +{task.xp_value}
      </span>
    </motion.div>
  );
}

function ScheduleBlockItem({
  block,
  completed,
  onToggle,
  compact,
}: {
  block: ScheduleBlock;
  completed: boolean;
  onToggle: (id: string) => void;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 transition-all",
        completed && "opacity-60",
        compact ? "p-2" : "p-3"
      )}
      style={{
        backgroundColor: `${block.color}15`,
        borderLeftColor: block.color,
      }}
    >
      <div className="flex items-center gap-3">
        {block.is_completable && (
          <button
            onClick={() => onToggle(block.id)}
            className={cn(
              "flex-shrink-0 rounded-full border-2 flex items-center justify-center",
              compact ? "w-4 h-4" : "w-5 h-5",
              completed
                ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                : "border-[var(--text-muted)] hover:border-[var(--accent-success)]"
            )}
          >
            {completed && <Check size={compact ? 10 : 12} className="text-white" />}
          </button>
        )}

        <div className="flex items-center gap-1 text-[var(--text-muted)]">
          <Clock size={compact ? 10 : 12} />
          <span className={cn("font-mono", compact ? "text-xs" : "text-xs")}>
            {formatTime(block.start_time)}
          </span>
        </div>

        <span
          className={cn(
            "flex-1 min-w-0 truncate",
            completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]",
            compact ? "text-sm" : "text-sm font-medium"
          )}
        >
          {block.title}
        </span>

        {block.location && !compact && (
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <MapPin size={10} />
            <span className="truncate max-w-[100px]">{block.location}</span>
          </div>
        )}

        {block.is_completable && block.xp_value && (
          <span className={cn(
            "flex items-center gap-0.5 text-xs font-mono",
            completed ? "text-[var(--accent-success)]" : "text-[var(--accent-highlight)]"
          )}>
            <Zap size={10} />
            {completed ? "+" : ""}{block.xp_value}
          </span>
        )}
      </div>
    </div>
  );
}

function OverdueTaskItem({
  task,
  onToggle,
  onMoveToday,
  onEdit,
  onDelete,
  compact,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onMoveToday: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "group rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "flex-1 min-w-0 truncate text-[var(--text-primary)]",
          compact ? "text-sm" : "text-sm font-medium"
        )}>
          {task.title}
        </span>

        {/* Edit/Delete buttons - show on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Pencil size={compact ? 12 : 14} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Trash2 size={compact ? 12 : 14} />
          </button>
        </div>

        <span className="text-xs font-mono text-[var(--text-muted)]">
          {task.due_date}
        </span>
      </div>
      <div className={cn("flex gap-2", compact ? "mt-2" : "mt-2")}>
        <button
          onClick={() => onToggle(task.id)}
          className={cn(
            "rounded border border-[var(--border-default)]",
            "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors",
            compact ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-xs"
          )}
        >
          Done
        </button>
        <button
          onClick={() => onMoveToday(task.id)}
          className={cn(
            "flex items-center gap-1 rounded border border-[var(--border-default)]",
            "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors",
            compact ? "px-2 py-1 text-xs" : "px-2.5 py-1 text-xs"
          )}
        >
          <span>Move to today</span>
          <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}
