"use client";

// =============================================================================
// USE DAY TIMELINE HOOK
// Shared data fetching and mutation handlers for day timeline.
// Used by both Today and Week views for consistent behavior.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import type { ISODateString, Task, TimelineItem, DayTimelineResponse } from "../types";
import { fetchApi, getErrorMessage } from "../api";

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

export function useDayTimeline(date: ISODateString): UseDayTimelineReturn {
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

        // Dispatch profile update event
        window.dispatchEvent(new CustomEvent("profile-updated"));

        // Refresh data
        await refresh();
      } catch (e) {
        setError(getErrorMessage(e));
      }
    },
    [refresh]
  );

  const toggleScheduleBlock = useCallback(
    async (blockId: string) => {
      try {
        await fetchApi("/api/schedule/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId, date }),
        });

        // Dispatch profile update event
        window.dispatchEvent(new CustomEvent("profile-updated"));

        // Refresh data
        await refresh();
      } catch (e) {
        setError(getErrorMessage(e));
      }
    },
    [date, refresh]
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
