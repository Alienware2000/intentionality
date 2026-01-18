"use client";

// =============================================================================
// TODAY CLIENT COMPONENT
// Task management for today using the unified DayTimeline.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import type { ISODateString, Quest } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import DayTimeline from "./DayTimeline";

type Props = {
  date: ISODateString;
  onTaskAction?: () => void;
};

type QuestsResponse = { ok: true; quests: Quest[] };

export default function TodayClient({ date, onTaskAction }: Props) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadQuests = useCallback(async () => {
    try {
      const data = await fetchApi<QuestsResponse>("/api/quests");
      setQuests(data.quests);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    onTaskAction?.();
  }, [onTaskAction]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--accent-primary)]">Error: {error}</p>
    );
  }

  return (
    <DayTimeline
      date={date}
      showOverdue={true}
      showAddTask={true}
      quests={quests}
      onRefresh={handleRefresh}
    />
  );
}
