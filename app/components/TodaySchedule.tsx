"use client";

// =============================================================================
// TODAY SCHEDULE COMPONENT
// Displays today's schedule blocks in chronological order.
// Supports completion toggle for completable blocks with XP rewards.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, MapPin, Calendar, Zap, Check } from "lucide-react";
import type { ISODateString, ScheduleBlock, ScheduleBlockCompletion } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { getDayOfWeek } from "@/app/lib/date-utils";
import { cn } from "@/app/lib/cn";

type Props = {
  date: ISODateString;
};

type ScheduleResponse = { ok: true; blocks: ScheduleBlock[] };
type CompletionsResponse = { ok: true; completions: ScheduleBlockCompletion[] };
type ToggleResponse = { ok: true; xpGained?: number; xpLost?: number; newXpTotal: number };

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

type BlockStatus = "past" | "current" | "upcoming";

function getBlockStatus(block: ScheduleBlock, currentTime: string): BlockStatus {
  if (currentTime < block.start_time) return "upcoming";
  if (currentTime > block.end_time) return "past";
  return "current";
}

export default function TodaySchedule({ date }: Props) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(getCurrentTime);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const dayOfWeek = useMemo(() => getDayOfWeek(date), [date]);

  const loadBlocks = useCallback(async () => {
    try {
      // Fetch blocks and completions in parallel
      const [blocksData, completionsData] = await Promise.all([
        fetchApi<ScheduleResponse>("/api/schedule"),
        fetchApi<CompletionsResponse>(`/api/schedule/completions?date=${date}`),
      ]);

      // Filter to only blocks for today's day of week
      const todayBlocks = blocksData.blocks.filter((b) =>
        b.days_of_week.includes(dayOfWeek)
      );
      // Sort by start time
      todayBlocks.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setBlocks(todayBlocks);

      // Build set of completed block IDs
      const completed = new Set(completionsData.completions.map((c) => c.block_id));
      setCompletedIds(completed);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [dayOfWeek, date]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const toggleCompletion = useCallback(async (blockId: string) => {
    setTogglingId(blockId);
    try {
      await fetchApi<ToggleResponse>("/api/schedule/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId, date }),
      });

      // Toggle local state
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(blockId)) {
          next.delete(blockId);
        } else {
          next.add(blockId);
        }
        return next;
      });

      // Dispatch profile update event
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setTogglingId(null);
    }
  }, [date]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--accent-primary)]">Error: {error}</p>;
  }

  if (blocks.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-[var(--text-muted)]">
        <Calendar size={16} />
        <span className="text-sm">No scheduled blocks today</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((block) => {
        const status = getBlockStatus(block, currentTime);
        const isCompleted = completedIds.has(block.id);
        const isToggling = togglingId === block.id;

        return (
          <div
            key={block.id}
            className={cn(
              "rounded-lg p-3 border-l-4 transition-all",
              status === "past" && !isCompleted && "opacity-50",
              status === "current" && "ring-1 ring-[var(--accent-primary)]",
              isCompleted && "opacity-70"
            )}
            style={{
              backgroundColor: `${block.color}15`,
              borderLeftColor: block.color,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Completion checkbox for completable blocks */}
              {block.is_completable && (
                <button
                  onClick={() => toggleCompletion(block.id)}
                  disabled={isToggling}
                  className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isCompleted
                      ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                      : "border-[var(--text-muted)] hover:border-[var(--accent-success)]",
                    isToggling && "opacity-50"
                  )}
                >
                  {isCompleted && <Check size={14} className="text-white" />}
                </button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {status === "current" && !isCompleted && (
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--accent-primary)]">
                      Now
                    </span>
                  )}
                  <h3
                    className={cn(
                      "font-medium truncate",
                      isCompleted && "line-through",
                      status === "past" || isCompleted
                        ? "text-[var(--text-muted)]"
                        : "text-[var(--text-primary)]"
                    )}
                  >
                    {block.title}
                  </h3>
                  {/* XP badge for completable blocks */}
                  {block.is_completable && block.xp_value && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-xs font-mono",
                        isCompleted
                          ? "text-[var(--accent-success)]"
                          : "text-[var(--accent-highlight)]"
                      )}
                    >
                      <Zap size={10} />
                      {isCompleted ? "+" : ""}{block.xp_value}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Clock size={12} />
                    <span className="font-mono">
                      {formatTime(block.start_time)} - {formatTime(block.end_time)}
                    </span>
                  </div>

                  {block.location && (
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <MapPin size={12} />
                      <span>{block.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
