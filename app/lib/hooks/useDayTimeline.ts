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

type UseDayTimelineOptions = {
  /** Callback to trigger profile refresh after XP-granting actions */
  onProfileUpdate?: () => void;
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

  const toggleTask = useCallback(
    async (taskId: string) => {
      try {
        await fetchApi("/api/tasks/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });

        // Notify profile update
        options?.onProfileUpdate?.();

        // Refresh data
        await refresh();
      } catch (e) {
        setError(getErrorMessage(e));
      }
    },
    [refresh, options]
  );

  const toggleScheduleBlock = useCallback(
    async (blockId: string) => {
      try {
        await fetchApi("/api/schedule/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId, date }),
        });

        // Notify profile update
        options?.onProfileUpdate?.();

        // Refresh data
        await refresh();
      } catch (e) {
        setError(getErrorMessage(e));
      }
    },
    [date, refresh, options]
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
