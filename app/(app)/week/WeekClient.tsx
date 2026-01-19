"use client";

// =============================================================================
// WEEK CLIENT COMPONENT
// Weekly view showing each day's timeline with unified tasks + schedule blocks.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { Calendar } from "lucide-react";
import type { ISODateString, ScheduleBlock, Quest } from "@/app/lib/types";
import { formatDayLabel, addDaysISO } from "@/app/lib/date-utils";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import DayTimeline from "@/app/components/DayTimeline";
import AddScheduleModal from "@/app/components/AddScheduleModal";
import ConfirmModal from "@/app/components/ConfirmModal";

type Props = {
  start: ISODateString;
  end: ISODateString;
};

type ScheduleResponse = { ok: true; blocks: ScheduleBlock[] };
type QuestsResponse = { ok: true; quests: Quest[] };

export default function WeekClient({ start }: Props) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  // Refresh counter to force DayTimeline refresh
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [, questsData] = await Promise.all([
        fetchApi<ScheduleResponse>("/api/schedule"),
        fetchApi<QuestsResponse>("/api/quests"),
      ]);
      setQuests(questsData.quests);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function triggerRefresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteBlock(blockId: string) {
    try {
      await fetchApi("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      });
      setDeletingBlockId(null);
      await loadData();
      triggerRefresh();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  // Generate array of 7 days
  const days: ISODateString[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDaysISO(start, i));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse bg-[var(--skeleton-bg)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-[var(--accent-primary)]">Error: {error}</p>;
  }

  return (
    <>
      {/* Add Schedule Button */}
      <div className="mb-4">
        <button
          onClick={() => {
            setEditingBlock(null);
            setShowScheduleModal(true);
          }}
          className={cn(
            "flex items-center gap-2",
            "rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-4 py-2.5 text-sm text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] transition-colors"
          )}
        >
          <Calendar size={16} />
          <span>Add Schedule Block</span>
        </button>
      </div>

      <div className="space-y-4">
        {days.map((date) => (
          <div
            key={date}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                {formatDayLabel(date)}
              </h2>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {date}
              </span>
            </div>

            {/* Day Timeline Content */}
            <div className="p-3">
              <DayTimeline
                key={`${date}-${refreshKey}`}
                date={date}
                showOverdue={false}
                showAddTask={true}
                compact={true}
                quests={quests}
                onRefresh={triggerRefresh}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Schedule Modal */}
      <AddScheduleModal
        block={editingBlock}
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setEditingBlock(null);
        }}
        onSaved={() => {
          loadData();
          triggerRefresh();
        }}
      />

      {/* Delete Schedule Confirmation */}
      <ConfirmModal
        isOpen={deletingBlockId !== null}
        title="Delete Schedule Block"
        message="This will remove the recurring schedule block. This action cannot be undone."
        onConfirm={() => deletingBlockId && handleDeleteBlock(deletingBlockId)}
        onCancel={() => setDeletingBlockId(null)}
      />
    </>
  );
}
