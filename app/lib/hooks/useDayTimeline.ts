"use client";

// =============================================================================
// USE DAY TIMELINE HOOK
// Shared data fetching and mutation handlers for day timeline.
// Used by both Today and Week views for consistent behavior.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import type { ISODateString, Task, TimelineItem, DayTimelineResponse } from "../types";
import { fetchApi, getErrorMessage } from "../api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ToggleResult = {
  xpGained?: number;
  xpLost?: number;
  newLevel?: number;
  leveledUp?: boolean;
  levelDecreased?: boolean;
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

  // Refs to track current state for synchronous access (avoids stale closures)
  const scheduledItemsRef = useRef<TimelineItem[]>([]);
  const unscheduledTasksRef = useRef<Task[]>([]);
  const overdueTasksRef = useRef<Task[]>([]);

  // In-flight toggle tracking to prevent duplicate API calls
  const inFlightToggles = useRef<Set<string>>(new Set());
  const inFlightBlockToggles = useRef<Set<string>>(new Set());

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

  // Keep refs in sync with state
  useEffect(() => { scheduledItemsRef.current = scheduledItems; }, [scheduledItems]);
  useEffect(() => { unscheduledTasksRef.current = unscheduledTasks; }, [unscheduledTasks]);
  useEffect(() => { overdueTasksRef.current = overdueTasks; }, [overdueTasks]);

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

  // Find task in any of the arrays (uses refs to avoid stale closures)
  const findTask = useCallback(
    (taskId: string): Task | undefined => {
      // Check scheduled items
      for (const item of scheduledItemsRef.current) {
        if (item.type === "task" && item.data.id === taskId) {
          return item.data;
        }
      }
      // Check unscheduled tasks
      const unscheduled = unscheduledTasksRef.current.find((t) => t.id === taskId);
      if (unscheduled) return unscheduled;
      // Check overdue tasks
      return overdueTasksRef.current.find((t) => t.id === taskId);
    },
    [] // No dependencies - reads from refs
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      // Guard against duplicate in-flight toggles
      if (inFlightToggles.current.has(taskId)) {
        return;
      }

      // 1. Find task and capture previous state
      const task = findTask(taskId);
      if (!task) return;
      const wasCompleted = task.completed;
      const isCompleting = !wasCompleted;

      // Mark as in-flight
      inFlightToggles.current.add(taskId);

      // 2. Optimistic update - immediate
      updateTaskInState(taskId, isCompleting);

      // 3. Show XP animation IMMEDIATELY (before API call) for instant feedback
      if (isCompleting && task.xp_value) {
        options?.onTaskToggle?.({ xpGained: task.xp_value });
      }

      // 4. API call in background
      try {
        const result = await fetchApi<{ ok: true } & ToggleResult>("/api/tasks/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });

        // 5. Handle level-up/streak (these need API response)
        if (result.leveledUp && result.newLevel) {
          options?.onTaskToggle?.({ leveledUp: true, newLevel: result.newLevel });
        }
        if (result.newStreak) {
          options?.onTaskToggle?.({ newStreak: result.newStreak });
        }

        // 6. Update profile after API completes
        options?.onProfileUpdate?.();

        // No refresh() call - state is already correct
      } catch (e) {
        // 7. Rollback on error
        updateTaskInState(taskId, wasCompleted);
        setError(getErrorMessage(e));
      } finally {
        inFlightToggles.current.delete(taskId);
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

  // Find schedule block completion status (uses refs to avoid stale closures)
  const findScheduleBlockCompleted = useCallback(
    (blockId: string): boolean | undefined => {
      for (const item of scheduledItemsRef.current) {
        if (item.type === "schedule_block" && item.data.id === blockId) {
          return item.completed;
        }
      }
      return undefined;
    },
    [] // No dependencies - reads from refs
  );

  // Find schedule block xp_value (uses refs to avoid stale closures)
  const findScheduleBlockXpValue = useCallback(
    (blockId: string): number | undefined => {
      for (const item of scheduledItemsRef.current) {
        if (item.type === "schedule_block" && item.data.id === blockId) {
          return item.data.xp_value ?? 10; // Default to 10 XP
        }
      }
      return undefined;
    },
    [] // No dependencies - reads from refs
  );

  const toggleScheduleBlock = useCallback(
    async (blockId: string) => {
      // Guard against duplicate in-flight toggles
      if (inFlightBlockToggles.current.has(blockId)) {
        return;
      }

      // 1. Find block and capture previous state
      const wasCompleted = findScheduleBlockCompleted(blockId);
      if (wasCompleted === undefined) return;
      const isCompleting = !wasCompleted;
      const xpValue = findScheduleBlockXpValue(blockId);

      // Mark as in-flight
      inFlightBlockToggles.current.add(blockId);

      // 2. Optimistic update - immediate
      updateScheduleBlockInState(blockId, isCompleting);

      // 3. Show XP animation IMMEDIATELY (before API call) for instant feedback
      if (isCompleting && xpValue) {
        options?.onTaskToggle?.({ xpGained: xpValue });
      }

      // 4. API call in background
      try {
        const result = await fetchApi<{ ok: true } & ToggleResult>("/api/schedule/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId, date }),
        });

        // 5. Handle level-up (needs API response)
        if (result.leveledUp && result.newLevel) {
          options?.onTaskToggle?.({ leveledUp: true, newLevel: result.newLevel });
        }

        // 6. Notify profile update
        options?.onProfileUpdate?.();

        // No refresh() call - state is already correct
      } catch (e) {
        // 7. Rollback on error
        updateScheduleBlockInState(blockId, wasCompleted);
        setError(getErrorMessage(e));
      } finally {
        inFlightBlockToggles.current.delete(blockId);
      }
    },
    [date, findScheduleBlockCompleted, findScheduleBlockXpValue, updateScheduleBlockInState, options]
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
