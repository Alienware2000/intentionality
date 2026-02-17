"use client";

// =============================================================================
// DAY TIMELINE COMPONENT
// Unified chronological view of tasks and schedule blocks for a day.
// Used by both Today and Week views for consistent display.
// =============================================================================

import { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  Play,
  List,
  CalendarDays,
} from "lucide-react";
import { useDayTimeline } from "@/app/lib/hooks/useDayTimeline";
import { cn } from "@/app/lib/cn";
import { formatTime, toISODateString } from "@/app/lib/date-utils";
import { FLAT_TASK_XP } from "@/app/lib/gamification";
import type { ISODateString, Task, ScheduleBlock, Priority, Id, Quest } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { useProfile } from "./ProfileProvider";
import { useCelebration } from "./CelebrationOverlay";
import { useFocus } from "./FocusProvider";
import { useToast } from "./Toast";
import { useOnboarding } from "./OnboardingProvider";
import EditTaskModal from "./EditTaskModal";
import ConfirmModal from "./ConfirmModal";
import PriorityPill from "./ui/PriorityPill";
import CalendarDayView from "./CalendarDayView";
import AddScheduleModal from "./AddScheduleModal";
import type { DayOfWeek } from "@/app/lib/types";

// View mode type for toggle
type ViewMode = "list" | "calendar";

// Priority sort weights: lower = higher priority
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// Duration presets for focus sessions (matches FocusLauncher)
const DURATION_PRESETS = [
  { minutes: 5, label: "5m" },
  { minutes: 10, label: "10m" },
  { minutes: 15, label: "15m" },
  { minutes: 25, label: "25m" },
  { minutes: 45, label: "45m" },
  { minutes: 60, label: "60m" },
];

/** External timeline data for controlled mode (when data is managed by parent) */
type ExternalTimelineData = {
  scheduledItems: Array<{ type: "task"; data: Task } | { type: "schedule_block"; data: ScheduleBlock; completed: boolean }>;
  unscheduledTasks: Task[];
  overdueTasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  toggleScheduleBlock: (blockId: string) => Promise<void>;
};

type Props = {
  date: ISODateString;
  showOverdue?: boolean;
  showAddTask?: boolean;
  compact?: boolean;
  quests?: Quest[];
  onRefresh?: () => void;
  /** Show all schedule blocks (default: only show imminent blocks within 45 min) */
  showAllBlocks?: boolean;
  /** Show the view mode toggle (list/calendar) - default true */
  showViewToggle?: boolean;
  /** Header to display above the timeline */
  header?: React.ReactNode;
  /** External data for controlled mode - when provided, component doesn't fetch its own data */
  externalData?: ExternalTimelineData;
  /** Hide calendar view completely (for side-by-side layout) */
  hideCalendarView?: boolean;
  /** Hide schedule blocks in list view (for side-by-side calendar layout) */
  hideBlocksInList?: boolean;
};

export default function DayTimeline({
  date,
  showOverdue = false,
  showAddTask = false,
  compact = false,
  quests = [],
  onRefresh,
  showAllBlocks = false,
  showViewToggle = true,
  header,
  externalData,
  hideCalendarView = false,
  hideBlocksInList = false,
}: Props) {
  const { refreshProfile } = useProfile();
  const { showXpGain, showLevelUp, showStreakMilestone } = useCelebration();
  const { session: activeSession, startSession } = useFocus();
  const { showToast } = useToast();
  const { markStepComplete } = useOnboarding();

  // View mode state (persisted to localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("timeline-view") as ViewMode) || "list";
    }
    return "list";
  });

  // Schedule modal state for calendar view click-to-add
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDefaults, setScheduleDefaults] = useState<{
    start_time: string;
    end_time: string;
    days_of_week: DayOfWeek[];
  } | null>(null);

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("timeline-view", viewMode);
  }, [viewMode]);

  // Memoize callbacks to prevent unnecessary recreations
  const handleTaskToggle = useCallback(
    (result: { xpGained?: number; leveledUp?: boolean; newLevel?: number; newStreak?: number }) => {
      if (result.xpGained) {
        showXpGain(result.xpGained);
        // Mark onboarding step complete when task is completed (XP is gained)
        markStepComplete("complete_task");
      }
      if (result.leveledUp && result.newLevel) showLevelUp(result.newLevel);
      if (result.newStreak) showStreakMilestone(result.newStreak);
    },
    [showXpGain, showLevelUp, showStreakMilestone, markStepComplete]
  );

  const timelineOptions = useMemo(
    () => ({
      onProfileUpdate: refreshProfile,
      onTaskToggle: handleTaskToggle,
      includeOverdue: showOverdue,
      skip: !!externalData, // Skip fetching when external data is provided
    }),
    [refreshProfile, handleTaskToggle, showOverdue, externalData]
  );

  const internalData = useDayTimeline(date, timelineOptions);

  // Use external data when provided, otherwise use internal hook data
  const {
    scheduledItems: rawScheduledItems,
    unscheduledTasks,
    overdueTasks,
    loading,
    error,
    refresh,
    toggleTask,
    toggleScheduleBlock,
  } = externalData ?? internalData;

  // Filter schedule blocks to only show imminent ones (within 45 min window)
  // unless showAllBlocks is true
  const scheduledItems = useMemo(() => {
    if (showAllBlocks) return rawScheduledItems;

    const now = new Date();
    const todayStr = toISODateString(now);

    // Only filter blocks for today's date
    if (date !== todayStr) return rawScheduledItems;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const IMMINENT_WINDOW_MINUTES = 45; // Show blocks within 45 min before/after start

    return rawScheduledItems.filter((item) => {
      // Always show tasks
      if (item.type === "task") return true;

      // For blocks, check if imminent
      const block = item.data;

      // Validate time format before parsing
      const startParts = block.start_time?.split(":");
      const endParts = block.end_time?.split(":");
      if (!startParts || startParts.length !== 2 || !endParts || endParts.length !== 2) {
        // Show block if time format is invalid (fail open)
        return true;
      }

      const [startHour, startMin] = startParts.map(Number);
      const [endHour, endMin] = endParts.map(Number);

      // Check for NaN values from invalid time strings
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        return true;
      }

      const blockStartMinutes = startHour * 60 + startMin;
      const blockEndMinutes = endHour * 60 + endMin;

      // Show if:
      // - Block starts within IMMINENT_WINDOW_MINUTES from now, OR
      // - Block is currently happening (started but not ended), OR
      // - Block ended within 15 min ago (small grace period)
      const isImminent = blockStartMinutes - currentMinutes <= IMMINENT_WINDOW_MINUTES &&
                         blockStartMinutes - currentMinutes >= -15;
      const isHappening = currentMinutes >= blockStartMinutes && currentMinutes <= blockEndMinutes;
      const justEnded = currentMinutes - blockEndMinutes <= 15 && currentMinutes > blockEndMinutes;

      return isImminent || isHappening || justEnded;
    });
  }, [rawScheduledItems, date, showAllBlocks]);

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

  // Edit/delete schedule block state
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<Id | null>(null);

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
      refreshProfile();
      // Mark onboarding step complete
      markStepComplete("add_task");
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
    } catch {
      // Silent fail - task stays in place
    }
  }

  async function handleEditTask(
    taskId: string,
    updates: { title?: string; due_date?: string; priority?: Priority; scheduled_time?: string | null; default_work_duration?: number | null }
  ) {
    try {
      await fetchApi("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });
      await refresh();
      onRefresh?.();
    } catch {
      // Silent fail - task keeps original values
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
      refreshProfile();

      // Show toast with undo option
      showToast({
        message: "Task deleted",
        type: "default",
        duration: 6000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await fetchApi("/api/tasks/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId }),
              });
              await refresh();
              onRefresh?.();
              refreshProfile();
            } catch {
              // Silent fail - task stays deleted
            }
          },
        },
      });
    } catch {
      setDeletingTaskId(null);
      // Silent fail - task remains
    }
  }

  async function handleDeleteBlock(blockId: Id) {
    try {
      await fetchApi("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      });
      setDeletingBlockId(null);
      await refresh();
      onRefresh?.();
    } catch {
      setDeletingBlockId(null);
    }
  }

  // Extract schedule blocks from scheduledItems for CalendarDayView
  // NOTE: All hooks must be called before any early returns
  const calendarBlocks = useMemo(() => {
    return scheduledItems
      .filter((item): item is { type: "schedule_block"; data: ScheduleBlock; completed: boolean } =>
        item.type === "schedule_block"
      )
      .map((item) => ({ block: item.data, completed: item.completed }));
  }, [scheduledItems]);

  // Handle add block from calendar click
  const handleAddBlockFromCalendar = useCallback(
    (defaults: { start_time: string; end_time: string; days_of_week: DayOfWeek[] }) => {
      setScheduleDefaults(defaults);
      setScheduleModalOpen(true);
    },
    []
  );

  // Handle schedule modal close
  const handleScheduleModalClose = useCallback(() => {
    setScheduleModalOpen(false);
    setScheduleDefaults(null);
  }, []);

  // Handle schedule saved
  const handleScheduleSaved = useCallback(async () => {
    await refresh();
    onRefresh?.();
  }, [refresh, onRefresh]);

  // Sort scheduled items: incomplete first, then by priority, then by time
  const sortedScheduledItems = useMemo(() => {
    return [...scheduledItems].sort((a, b) => {
      const aCompleted = a.type === "task" ? a.data.completed : a.completed;
      const bCompleted = b.type === "task" ? b.data.completed : b.completed;

      // Incomplete first
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

      // By priority (tasks only — blocks default to medium-level weight)
      const aPriority = a.type === "task" ? (PRIORITY_ORDER[a.data.priority] ?? 1) : 1;
      const bPriority = b.type === "task" ? (PRIORITY_ORDER[b.data.priority] ?? 1) : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Preserve chronological time order as tiebreaker
      const aTime = a.type === "task" ? (a.data.scheduled_time ?? "") : (a.data.start_time ?? "");
      const bTime = b.type === "task" ? (b.data.scheduled_time ?? "") : (b.data.start_time ?? "");
      return aTime.localeCompare(bTime);
    });
  }, [scheduledItems]);

  // Sort unscheduled tasks: incomplete first, then by priority
  const sortedUnscheduledTasks = useMemo(() => {
    return [...unscheduledTasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    });
  }, [unscheduledTasks]);

  // Sort overdue tasks by priority (all incomplete by definition)
  const sortedOverdueTasks = useMemo(() => {
    return [...overdueTasks].sort((a, b) => {
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    });
  }, [overdueTasks]);

  // Early return for loading state (after all hooks)
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse bg-[var(--skeleton-bg)] rounded-lg",
              compact ? "h-10" : "h-14"
            )}
          />
        ))}
      </div>
    );
  }

  const hasItems = sortedScheduledItems.length > 0 || sortedUnscheduledTasks.length > 0;
  const hasOverdue = showOverdue && sortedOverdueTasks.length > 0;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {/* Header with view toggle */}
      {(header || (showViewToggle && !hideCalendarView)) && (
        <div className="flex items-center justify-between gap-4 mb-2">
          {/* Custom header or default */}
          <div className="flex-1 min-w-0">
            {header}
          </div>

          {/* View toggle - hidden on mobile and when hideCalendarView is true */}
          {showViewToggle && !hideCalendarView && (
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <motion.button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                title="List view"
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <List size={16} />
              </motion.button>
              <motion.button
                onClick={() => setViewMode("calendar")}
                aria-label="Calendar view"
                title="Calendar view"
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === "calendar"
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CalendarDays size={16} />
              </motion.button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-[var(--accent-primary)]">Error: {error}</p>
      )}

      {/* Calendar View - only shown when not hidden and in calendar mode */}
      <AnimatePresence mode="wait">
        {viewMode === "calendar" && !compact && !hideCalendarView && (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CalendarDayView
              date={date}
              blocks={calendarBlocks}
              onToggleBlock={toggleScheduleBlock}
              onAddBlock={handleAddBlockFromCalendar}
              onEditBlock={setEditingBlock}
              onDeleteBlock={(id) => setDeletingBlockId(id)}
              compact={compact}
            />
          </motion.div>
        )}

        {/* List View (default on mobile, when selected, or when calendar is hidden) */}
        {(viewMode === "list" || compact || hideCalendarView) && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Overdue Tasks */}
            {hasOverdue && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[var(--accent-primary)]">
            <AlertCircle size={14} />
            <span className="text-xs font-bold tracking-widest uppercase">
              Overdue
            </span>
          </div>
          {sortedOverdueTasks.map((task) => (
            <OverdueTaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onMoveToday={handleMoveToday}
              onEdit={setEditingTask}
              onDelete={setDeletingTaskId}
              onStartFocus={startSession}
              hasActiveSession={!!activeSession}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Scheduled Items (timeline) */}
      {sortedScheduledItems.length > 0 && (
        <div className="space-y-2">
          {sortedScheduledItems
            .filter((item) => !hideBlocksInList || item.type === "task")
            .map((item) =>
              item.type === "task" ? (
                <ScheduledTaskItem
                  key={`task-${item.data.id}`}
                  task={item.data}
                  onToggle={toggleTask}
                  onEdit={setEditingTask}
                  onDelete={setDeletingTaskId}
                  onStartFocus={startSession}
                  hasActiveSession={!!activeSession}
                  compact={compact}
                />
              ) : (
                <ScheduleBlockItem
                  key={`block-${item.data.id}`}
                  block={item.data}
                  completed={item.completed}
                  onToggle={toggleScheduleBlock}
                  onEdit={setEditingBlock}
                  onDelete={setDeletingBlockId}
                  compact={compact}
                />
              )
            )}
        </div>
      )}

      {/* Unscheduled Tasks */}
      {sortedUnscheduledTasks.length > 0 && (
        <div className="space-y-2">
          {sortedScheduledItems.length > 0 && !hideBlocksInList && (
            <div className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] pt-2">
              Tasks
            </div>
          )}
          {sortedUnscheduledTasks.map((task) => (
            <UnscheduledTaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onEdit={setEditingTask}
              onDelete={setDeletingTaskId}
              onStartFocus={startSession}
              hasActiveSession={!!activeSession}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasItems && !hasOverdue && !showForm && (
        <div className={cn(
          "text-center rounded-lg border border-dashed border-[var(--border-subtle)]",
          compact ? "py-4 px-3" : "py-8 px-6"
        )}>
          <div className={cn(
            "mx-auto mb-2 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center",
            compact ? "w-8 h-8" : "w-12 h-12"
          )}>
            <Zap size={compact ? 16 : 24} className="text-[var(--text-muted)]" />
          </div>
          <p className={cn(
            "text-[var(--text-primary)] font-medium",
            compact ? "text-xs mb-1" : "text-sm mb-2"
          )}>
            No tasks for today
          </p>
          <p className={cn(
            "text-[var(--text-muted)]",
            compact ? "text-xs" : "text-xs"
          )}>
            {quests.length > 0
              ? "Add a task below to get started"
              : "Create a Quest first, then add tasks"}
          </p>
          {quests.length === 0 && (
            <Link
              href="/quests"
              className={cn(
                "inline-block mt-3 px-3 py-1.5 rounded-lg text-xs font-medium",
                "bg-[var(--accent-primary)] text-white",
                "hover:bg-[var(--accent-primary)]/80 transition-colors"
              )}
            >
              Create Quest
            </Link>
          )}
        </div>
      )}

      {/* Add Task */}
      {showAddTask && quests.length > 0 && (
        <div className="pt-1">
          {showForm ? (
            <div className={cn("space-y-2 p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-default)]")}>
              {/* First row: Quest, Priority, Time - stacks on mobile */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={questId}
                  onChange={(e) => setQuestId(e.target.value)}
                  className={cn(
                    "flex-1 min-w-0 px-3 py-2 text-sm rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                >
                  {quests.filter((q) => q.quest_type !== "onboarding").map((q) => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className={cn(
                      "flex-1 sm:flex-initial px-3 py-2 text-sm rounded",
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
                      "flex-1 sm:flex-initial px-3 py-2 text-sm rounded",
                      "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                      "text-[var(--text-primary)]",
                      "focus:outline-none focus:border-[var(--accent-primary)]",
                      "theme-color-scheme"
                    )}
                  />
                </div>
              </div>
              {/* Second row: Title and buttons - stacks on mobile */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="Task title..."
                  autoFocus
                  className={cn(
                    "flex-1 min-w-0 px-3 py-2 text-sm rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTask}
                    disabled={adding || !title.trim()}
                    className={cn(
                      "flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded",
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
                      "flex-1 sm:flex-initial px-4 py-2 text-sm rounded",
                      "bg-[var(--bg-hover)] text-[var(--text-muted)]",
                      "hover:bg-[var(--bg-elevated)] transition-colors"
                    )}
                  >
                    Cancel
                  </button>
                </div>
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
            message="Delete this task? You can undo this action for a few seconds after deletion."
            onConfirm={() => deletingTaskId && handleDeleteTask(deletingTaskId)}
            onCancel={() => setDeletingTaskId(null)}
          />

          {/* Edit Schedule Block Modal */}
          <AddScheduleModal
            block={editingBlock}
            isOpen={editingBlock !== null}
            onClose={() => setEditingBlock(null)}
            onSaved={handleScheduleSaved}
          />

          {/* Delete Schedule Block Confirmation */}
          <ConfirmModal
            isOpen={deletingBlockId !== null}
            title="Delete Schedule Block"
            message="This will remove the recurring schedule block. This action cannot be undone."
            onConfirm={() => deletingBlockId && handleDeleteBlock(deletingBlockId)}
            onCancel={() => setDeletingBlockId(null)}
          />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Schedule Modal (for calendar click-to-add) */}
      <AddScheduleModal
        isOpen={scheduleModalOpen}
        onClose={handleScheduleModalClose}
        onSaved={handleScheduleSaved}
        defaultValues={scheduleDefaults}
      />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Popover for selecting focus session duration before starting.
 * Wrapper component that handles AnimatePresence.
 */
function TaskFocusPopover({
  isOpen,
  onClose,
  onStart,
  defaultDuration,
  hasActiveSession,
  anchorRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStart: (duration: number) => void;
  defaultDuration: number;
  hasActiveSession: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <TaskFocusPopoverContent
          onClose={onClose}
          onStart={onStart}
          defaultDuration={defaultDuration}
          hasActiveSession={hasActiveSession}
          anchorRef={anchorRef}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Inner content of the focus popover - mounts fresh each time popover opens,
 * so state naturally resets to defaults.
 */
function TaskFocusPopoverContent({
  onClose,
  onStart,
  defaultDuration,
  hasActiveSession,
  anchorRef,
}: {
  onClose: () => void;
  onStart: (duration: number) => void;
  defaultDuration: number;
  hasActiveSession: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);

  // Handle click outside and escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, anchorRef]);

  function handleStart() {
    onStart(selectedDuration);
    onClose();
  }

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "absolute z-50 p-3 rounded-lg",
        // Smaller width on mobile to prevent overflow
        "w-40 sm:w-48",
        "bg-[var(--bg-card)] border border-[var(--border-default)]",
        "shadow-lg",
        "bottom-full mb-1",
        // Left-align on mobile to prevent overflow, right-align on desktop
        "left-0 sm:left-auto sm:right-0"
      )}
    >
      <div className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-2">
        Start Focus
      </div>

      {/* Duration presets */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            onClick={() => setSelectedDuration(preset.minutes)}
            className={cn(
              "px-2 py-1.5 text-xs font-mono rounded transition-colors",
              selectedDuration === preset.minutes
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={hasActiveSession}
        className={cn(
          "w-full py-2 text-sm font-medium rounded",
          "bg-[var(--accent-primary)] text-white",
          "hover:bg-[var(--accent-primary)]/80 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        Start
      </button>
    </motion.div>
  );
}

const ScheduledTaskItem = memo(function ScheduledTaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  onStartFocus,
  hasActiveSession,
  compact,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartFocus: (options?: { workDuration?: number; taskId?: string; title?: string }) => Promise<void>;
  hasActiveSession: boolean;
  compact: boolean;
}) {
  const isCompleted = task.completed;
  const focusDuration = task.default_work_duration ?? 25;
  const [showFocusPopover, setShowFocusPopover] = useState(false);
  const focusButtonRef = useRef<HTMLButtonElement>(null);

  function handleStartFocus(duration: number) {
    onStartFocus({
      workDuration: duration,
      taskId: task.id,
      title: task.title,
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      className={cn(
        "group flex items-center gap-2 sm:gap-3 rounded-xl",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
        "hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]",
        "hover-lift transition-all duration-200",
        isCompleted && "opacity-60",
        compact ? "p-2" : "p-3"
      )}
      whileTap={{ scale: 0.98 }}
    >
      <button
        onClick={() => onToggle(task.id)}
        aria-label={isCompleted ? "Mark task incomplete" : "Mark task complete"}
        className={cn(
          "flex-shrink-0 rounded border-2 flex items-center justify-center",
          // Larger touch targets on mobile (44px min)
          compact ? "w-10 h-10 sm:w-5 sm:h-5" : "w-11 h-11 sm:w-6 sm:h-6",
          isCompleted
            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)]"
        )}
      >
        {isCompleted && <Check size={compact ? 16 : 18} className="text-white sm:hidden" />}
        {isCompleted && <Check size={compact ? 12 : 14} className="text-white hidden sm:block" />}
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

      <PriorityPill priority={task.priority} compact />

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className="relative flex items-center gap-1 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity">
        {/* Focus button - only show for incomplete tasks */}
        {!isCompleted && (
          <button
            ref={focusButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowFocusPopover(!showFocusPopover);
            }}
            disabled={hasActiveSession}
            aria-label="Start focus session"
            title={hasActiveSession ? "Focus session in progress" : "Start focus session"}
            className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={compact ? 14 : 16} className="sm:hidden" />
            <Play size={compact ? 12 : 14} className="hidden sm:block" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          aria-label="Edit task"
          className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Pencil size={compact ? 14 : 16} className="sm:hidden" />
          <Pencil size={compact ? 12 : 14} className="hidden sm:block" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          aria-label="Delete task"
          className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <Trash2 size={compact ? 14 : 16} className="sm:hidden" />
          <Trash2 size={compact ? 12 : 14} className="hidden sm:block" />
        </button>

        {/* Focus duration popover */}
        <TaskFocusPopover
          isOpen={showFocusPopover}
          onClose={() => setShowFocusPopover(false)}
          onStart={handleStartFocus}
          defaultDuration={focusDuration}
          hasActiveSession={hasActiveSession}
          anchorRef={focusButtonRef}
        />
      </div>

      <span className={cn(
        "text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]",
        isCompleted ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"
      )}>
        +{FLAT_TASK_XP}
      </span>
    </motion.div>
  );
});

const UnscheduledTaskItem = memo(function UnscheduledTaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  onStartFocus,
  hasActiveSession,
  compact,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartFocus: (options?: { workDuration?: number; taskId?: string; title?: string }) => Promise<void>;
  hasActiveSession: boolean;
  compact: boolean;
}) {
  const isCompleted = task.completed;
  const focusDuration = task.default_work_duration ?? 25;
  const [showFocusPopover, setShowFocusPopover] = useState(false);
  const focusButtonRef = useRef<HTMLButtonElement>(null);

  function handleStartFocus(duration: number) {
    onStartFocus({
      workDuration: duration,
      taskId: task.id,
      title: task.title,
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      className={cn(
        "group flex items-center gap-2 sm:gap-3 rounded-xl",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
        "hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]",
        "hover-lift transition-all duration-200",
        isCompleted && "opacity-60",
        compact ? "p-2" : "p-3"
      )}
      whileTap={{ scale: 0.98 }}
    >
      <button
        onClick={() => onToggle(task.id)}
        aria-label={isCompleted ? "Mark task incomplete" : "Mark task complete"}
        className={cn(
          "flex-shrink-0 rounded border-2 flex items-center justify-center",
          // Larger touch targets on mobile (44px min)
          compact ? "w-10 h-10 sm:w-5 sm:h-5" : "w-11 h-11 sm:w-6 sm:h-6",
          isCompleted
            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
            : "border-[var(--border-default)] hover:border-[var(--accent-primary)]"
        )}
      >
        {isCompleted && <Check size={compact ? 16 : 18} className="text-white sm:hidden" />}
        {isCompleted && <Check size={compact ? 12 : 14} className="text-white hidden sm:block" />}
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

      <PriorityPill priority={task.priority} compact />

      {/* Action buttons - always visible on mobile, hover on desktop */}
      <div className="relative flex items-center gap-1 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity">
        {/* Focus button - only show for incomplete tasks */}
        {!isCompleted && (
          <button
            ref={focusButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowFocusPopover(!showFocusPopover);
            }}
            disabled={hasActiveSession}
            aria-label="Start focus session"
            title={hasActiveSession ? "Focus session in progress" : "Start focus session"}
            className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={compact ? 14 : 16} className="sm:hidden" />
            <Play size={compact ? 12 : 14} className="hidden sm:block" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          aria-label="Edit task"
          className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Pencil size={compact ? 14 : 16} className="sm:hidden" />
          <Pencil size={compact ? 12 : 14} className="hidden sm:block" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          aria-label="Delete task"
          className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <Trash2 size={compact ? 14 : 16} className="sm:hidden" />
          <Trash2 size={compact ? 12 : 14} className="hidden sm:block" />
        </button>

        {/* Focus duration popover */}
        <TaskFocusPopover
          isOpen={showFocusPopover}
          onClose={() => setShowFocusPopover(false)}
          onStart={handleStartFocus}
          defaultDuration={focusDuration}
          hasActiveSession={hasActiveSession}
          anchorRef={focusButtonRef}
        />
      </div>

      <span className={cn(
        "text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]",
        isCompleted ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"
      )}>
        +{FLAT_TASK_XP}
      </span>
    </motion.div>
  );
});

const ScheduleBlockItem = memo(function ScheduleBlockItem({
  block,
  completed,
  onToggle,
  onEdit,
  onDelete,
  compact,
}: {
  block: ScheduleBlock;
  completed: boolean;
  onToggle: (id: string) => void;
  onEdit?: (block: ScheduleBlock) => void;
  onDelete?: (blockId: string) => void;
  compact: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        "group rounded-xl border-l-[3px] border border-[var(--border-subtle)]",
        "hover-lift transition-all duration-200",
        completed && "opacity-60",
        compact ? "p-2" : "p-3"
      )}
      style={{
        backgroundColor: `${block.color}10`,
        borderLeftColor: block.color,
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {block.is_completable && (
          <button
            onClick={() => onToggle(block.id)}
            aria-label={completed ? "Mark block incomplete" : "Mark block complete"}
            className={cn(
              "flex-shrink-0 rounded-full border-2 flex items-center justify-center",
              // Larger touch targets on mobile (44px min)
              compact ? "w-10 h-10 sm:w-5 sm:h-5" : "w-11 h-11 sm:w-6 sm:h-6",
              completed
                ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                : "border-[var(--text-muted)] hover:border-[var(--accent-success)]"
            )}
          >
            {completed && <Check size={compact ? 16 : 12} className="text-white sm:hidden" />}
            {completed && <Check size={compact ? 12 : 14} className="text-white hidden sm:block" />}
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

        {/* Action buttons - always visible on touch, hover on desktop */}
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(block);
                }}
                aria-label="Edit schedule block"
                className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Pencil size={compact ? 14 : 16} className="sm:hidden" />
                <Pencil size={compact ? 12 : 14} className="hidden sm:block" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(block.id);
                }}
                aria-label="Delete schedule block"
                className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              >
                <Trash2 size={compact ? 14 : 16} className="sm:hidden" />
                <Trash2 size={compact ? 12 : 14} className="hidden sm:block" />
              </button>
            )}
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
    </motion.div>
  );
});

const OverdueTaskItem = memo(function OverdueTaskItem({
  task,
  onToggle,
  onMoveToday,
  onEdit,
  onDelete,
  onStartFocus,
  hasActiveSession,
  compact,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onMoveToday: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartFocus: (options?: { workDuration?: number; taskId?: string; title?: string }) => Promise<void>;
  hasActiveSession: boolean;
  compact: boolean;
}) {
  const focusDuration = task.default_work_duration ?? 25;
  const [showFocusPopover, setShowFocusPopover] = useState(false);
  const focusButtonRef = useRef<HTMLButtonElement>(null);

  function handleStartFocus(duration: number) {
    onStartFocus({
      workDuration: duration,
      taskId: task.id,
      title: task.title,
    });
  }

  return (
    <div
      className={cn(
        "group rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={cn(
          "flex-1 min-w-0 truncate text-[var(--text-primary)]",
          compact ? "text-sm" : "text-sm font-medium"
        )}>
          {task.title}
        </span>

        <PriorityPill priority={task.priority} compact />

        {/* Action buttons - always visible on mobile, hover on desktop */}
        <div className="relative flex items-center gap-1 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 transition-opacity">
          {/* Focus button */}
          <button
            ref={focusButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowFocusPopover(!showFocusPopover);
            }}
            disabled={hasActiveSession}
            aria-label="Start focus session"
            title={hasActiveSession ? "Focus session in progress" : "Start focus session"}
            className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={compact ? 14 : 16} className="sm:hidden" />
            <Play size={compact ? 12 : 14} className="hidden sm:block" />
          </button>
          <button
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Pencil size={compact ? 14 : 16} className="sm:hidden" />
            <Pencil size={compact ? 12 : 14} className="hidden sm:block" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            className="p-2.5 sm:p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Trash2 size={compact ? 14 : 16} className="sm:hidden" />
            <Trash2 size={compact ? 12 : 14} className="hidden sm:block" />
          </button>

          {/* Focus duration popover */}
          <TaskFocusPopover
            isOpen={showFocusPopover}
            onClose={() => setShowFocusPopover(false)}
            onStart={handleStartFocus}
            defaultDuration={focusDuration}
            hasActiveSession={hasActiveSession}
            anchorRef={focusButtonRef}
          />
        </div>

        <span className="text-xs font-mono text-[var(--text-muted)]">
          {task.due_date}
        </span>
      </div>
      {/* Action buttons - stack on mobile */}
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          onClick={() => onToggle(task.id)}
          aria-label="Mark task as done"
          className={cn(
            "rounded border border-[var(--border-default)]",
            "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors",
            // 44px min height on mobile
            "px-4 py-3 text-sm sm:px-2.5 sm:py-1 sm:text-xs"
          )}
        >
          Done
        </button>
        <button
          onClick={() => onMoveToday(task.id)}
          aria-label="Move task to today"
          className={cn(
            "flex items-center gap-1 rounded border border-[var(--border-default)]",
            "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors",
            // 44px min height on mobile
            "px-4 py-3 text-sm sm:px-2.5 sm:py-1 sm:text-xs"
          )}
        >
          <span>Move to today</span>
          <ArrowRight size={12} className="sm:hidden" />
          <ArrowRight size={10} className="hidden sm:block" />
        </button>
      </div>
    </div>
  );
});
