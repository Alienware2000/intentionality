"use client";

// =============================================================================
// USE DAY TIMELINE HOOK
// Shared data fetching and mutation handlers for day timeline.
// Used by both Today and Week views for consistent behavior.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import type { ISODateString, Task, TimelineItem, DayTimelineResponse } from "../types";
import { fetchApi, getErrorMessage } from "../api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ToggleResult = {
  xpGained?: number;
  xpLost?: number;
  newLevel?: number;
  newStreak?: number;
  newXpTotal?: number;
};

type UseDayTimelineOptions = {
  /** Callback to trigger profile refresh after XP-granting actions */
  onProfileUpdate?: () => void;
  /** Callback when task is toggled, receives XP/level info for celebrations */
  onTaskToggle?: (result: ToggleResult) => void;
};

type UseDayTimelineReturn = {
  scheduledItems: TimelineItem[];
  unscheduledTasks: Task[];
  overdueTasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  toggleScheduleBlock: (blockId: string) => Promise<void>;
};

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Hook for fetching and managing day timeline data.
 * Handles tasks, schedule blocks, and overdue items for a specific date.
 *
 * @param date - Date in YYYY-MM-DD format
 * @param options - Optional configuration
 * @param options.onProfileUpdate - Callback to trigger when XP changes (e.g., task toggle)
 *
 * @example
 * const { refreshProfile } = useProfile();
 * const { scheduledItems, toggleTask } = useDayTimeline(date, {
 *   onProfileUpdate: refreshProfile
 * });
 */
export function useDayTimeline(
  date: ISODateString,
  options?: UseDayTimelineOptions
): UseDayTimelineReturn {
  const [scheduledItems, setScheduledItems] = useState<TimelineItem[]>([]);
  const [unscheduledTasks, setUnscheduledTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchApi<DayTimelineResponse>(
        `/api/day-timeline?date=${date}`
      );
      setScheduledItems(data.scheduledItems);
      setUnscheduledTasks(data.unscheduledTasks);
      setOverdueTasks(data.overdueTasks);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Helper to update task state across all arrays
  const updateTaskInState = useCallback(
    (taskId: string, completed: boolean) => {
      // Update in scheduledItems
      setScheduledItems((prev) =>
        prev.map((item) =>
          item.type === "task" && item.data.id === taskId
            ? { ...item, data: { ...item.data, completed } }
            : item
        )
      );

      // Update in unscheduledTasks
      setUnscheduledTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed } : task
        )
      );

      // Update in overdueTasks
      setOverdueTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed } : task
        )
      );
    },
    []
  );

  // Find task in any of the arrays
  const findTask = useCallback(
    (taskId: string): Task | undefined => {
      // Check scheduled items
      for (const item of scheduledItems) {
        if (item.type === "task" && item.data.id === taskId) {
          return item.data;
        }
      }
      // Check unscheduled tasks
      const unscheduled = unscheduledTasks.find((t) => t.id === taskId);
      if (unscheduled) return unscheduled;
      // Check overdue tasks
      return overdueTasks.find((t) => t.id === taskId);
    },
    [scheduledItems, unscheduledTasks, overdueTasks]
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      // 1. Find task and capture previous state
      const task = findTask(taskId);
      if (!task) return;
      const wasCompleted = task.completed;

      // 2. Optimistic update - immediate
      updateTaskInState(taskId, !wasCompleted);

      // 3. API call in background
      try {
        const result = await fetchApi<{ ok: true } & ToggleResult>("/api/tasks/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });

        // Notify profile update
        options?.onProfileUpdate?.();

        // Notify celebration callback with XP/level info
        options?.onTaskToggle?.(result);

        // No refresh() call - state is already correct
      } catch (e) {
        // 4. Rollback on error
        updateTaskInState(taskId, wasCompleted);
        setError(getErrorMessage(e));
      }
    },
    [findTask, updateTaskInState, options]
  );

  // Helper to update schedule block completion state
  const updateScheduleBlockInState = useCallback(
    (blockId: string, completed: boolean) => {
      setScheduledItems((prev) =>
        prev.map((item) =>
          item.type === "schedule_block" && item.data.id === blockId
            ? { ...item, completed }
            : item
        )
      );
    },
    []
  );

  // Find schedule block completion status
  const findScheduleBlockCompleted = useCallback(
    (blockId: string): boolean | undefined => {
      for (const item of scheduledItems) {
        if (item.type === "schedule_block" && item.data.id === blockId) {
          return item.completed;
        }
      }
      return undefined;
    },
    [scheduledItems]
  );

  const toggleScheduleBlock = useCallback(
    async (blockId: string) => {
      // 1. Find block and capture previous state
      const wasCompleted = findScheduleBlockCompleted(blockId);
      if (wasCompleted === undefined) return;

      // 2. Optimistic update - immediate
      updateScheduleBlockInState(blockId, !wasCompleted);

      // 3. API call in background
      try {
        await fetchApi("/api/schedule/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId, date }),
        });

        // Notify profile update
        options?.onProfileUpdate?.();

        // No refresh() call - state is already correct
      } catch (e) {
        // 4. Rollback on error
        updateScheduleBlockInState(blockId, wasCompleted);
        setError(getErrorMessage(e));
      }
    },
    [date, findScheduleBlockCompleted, updateScheduleBlockInState, options]
  );

  return {
    scheduledItems,
    unscheduledTasks,
    overdueTasks,
    loading,
    error,
    refresh,
    toggleTask,
    toggleScheduleBlock,
  };
}
