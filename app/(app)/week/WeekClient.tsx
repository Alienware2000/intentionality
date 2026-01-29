"use client";

// =============================================================================
// WEEK CLIENT COMPONENT
// Weekly view showing each day's timeline with unified tasks + schedule blocks.
// Enhanced with glassmorphism and staggered day column animations.
// Includes weekly planning modal for guided task creation.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { Calendar, Plus, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import type { ISODateString, ScheduleBlock, Quest } from "@/app/lib/types";
import { formatDayLabel, addDaysISO, getTodayISO } from "@/app/lib/date-utils";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import DayTimeline from "@/app/components/DayTimeline";
import AddScheduleModal from "@/app/components/AddScheduleModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import { WeeklyPlanModal } from "@/app/components/WeeklyPlanModal";

// Animation variants for staggered entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

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

  // Weekly plan modal state
  const [showPlanModal, setShowPlanModal] = useState(false);

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

  // Handle plan save - just close modal and refresh
  const handlePlanSave = useCallback(() => {
    setShowPlanModal(false);
    setRefreshKey((k) => k + 1);
  }, []);

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

  const today = getTodayISO();

  return (
    <>
      {/* Week Header Actions */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-wrap items-center gap-3"
      >
        {/* Plan Week Button */}
        <motion.button
          onClick={() => setShowPlanModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-2",
            "rounded-xl glass-card",
            "border bg-[var(--bg-card)]",
            "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5",
            "px-4 py-3 text-sm",
            "hover:bg-[var(--bg-hover)]",
            "transition-all duration-200"
          )}
        >
          <div className="p-1.5 rounded-lg bg-[var(--accent-primary)]/10">
            <ClipboardList size={14} className="text-[var(--accent-primary)]" />
          </div>
          <span className="text-[var(--accent-primary)]">Plan Week</span>
        </motion.button>

        {/* Add Schedule Button */}
        <motion.button
          onClick={() => {
            setEditingBlock(null);
            setShowScheduleModal(true);
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-2",
            "rounded-xl glass-card",
            "border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-4 py-3 text-sm text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]",
            "transition-all duration-200"
          )}
        >
          <div className="p-1.5 rounded-lg bg-[var(--accent-primary)]/10">
            <Plus size={14} className="text-[var(--accent-primary)]" />
          </div>
          <span>Add Schedule Block</span>
        </motion.button>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {days.map((date) => {
          const isToday = date === today;

          return (
            <motion.div
              key={date}
              variants={itemVariants}
              className={cn(
                "rounded-xl glass-card",
                "border border-[var(--border-subtle)] bg-[var(--bg-card)]",
                "hover:border-[var(--border-default)]",
                "transition-all duration-200",
                isToday && "border-[var(--accent-primary)]/30 glow-primary"
              )}
            >
              {/* Day Header */}
              <div className={cn(
                "flex items-center justify-between px-4 py-3",
                "border-b border-[var(--border-subtle)]",
                isToday && "bg-[var(--accent-primary)]/5"
              )}>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className={cn(
                    "text-[var(--text-muted)]",
                    isToday && "text-[var(--accent-primary)]"
                  )} />
                  <h2 className={cn(
                    "text-sm font-bold tracking-widest uppercase",
                    isToday ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
                  )}>
                    {formatDayLabel(date)}
                    {isToday && <span className="ml-2 text-xs font-normal">(Today)</span>}
                  </h2>
                </div>
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
            </motion.div>
          );
        })}
      </motion.div>

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

      {/* Weekly Plan Modal */}
      <WeeklyPlanModal
        isOpen={showPlanModal}
        weekStart={start}
        quests={quests}
        onClose={() => setShowPlanModal(false)}
        onSave={handlePlanSave}
        onTasksCreated={triggerRefresh}
      />
    </>
  );
}
