// =============================================================================
// HABIT CONSISTENCY CARD
// Compact preview card for the Overview tab.
// Shows consistency rate, today's completion, and mini summary squares.
// Uses same square cell style as MonthlyHabitGrid for visual consistency.
// =============================================================================

"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/cn";
import { fetchApi } from "@/app/lib/api";
import { getTodayISO, isActiveDay, toISODateString } from "@/app/lib/date-utils";
import type { HabitHistoryResponse, ISODateString } from "@/app/lib/types";

type Props = {
  onViewFull: () => void;
};

export default function HabitConsistencyCard({ onViewFull }: Props) {
  const [data, setData] = useState<HabitHistoryResponse | null>(null);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    fetchApi<HabitHistoryResponse>(`/api/habits/history?month=${month}`)
      .then(setData)
      .catch(() => {}); // Silently fail — card is optional
  }, []);

  // Compute mini summary dots for the current month
  const miniDots = useMemo(() => {
    if (!data) return [];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = getTodayISO();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dots: Array<{ date: ISODateString; percent: number }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` as ISODateString;
      if (dateStr > today) break;

      let scheduled = 0;
      let completed = 0;

      for (const habit of data.habits) {
        const habitCreated = toISODateString(new Date(habit.created_at));
        if (dateStr < habitCreated) continue;
        const activeDays = habit.active_days ?? [1, 2, 3, 4, 5, 6, 7];
        if (!isActiveDay(dateStr, activeDays)) continue;
        scheduled++;
        if (data.completions[habit.id]?.includes(dateStr)) completed++;
      }

      dots.push({
        date: dateStr,
        percent: scheduled > 0 ? completed / scheduled : 0,
      });
    }

    return dots;
  }, [data]);

  if (!data || data.habits.length === 0) return null;

  const { stats } = data;

  function getDotColor(percent: number): string {
    if (percent === 0) return "bg-[var(--heatmap-empty)]";
    if (percent === 1) return "bg-[var(--accent-success)]";
    return "bg-[var(--accent-success)]/50";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={cn(
        "rounded-xl glass-card",
        "bg-[var(--bg-card)]",
        "border border-[var(--border-subtle)]",
        "hover:border-[var(--border-default)] transition-colors",
        "p-5"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Habit Consistency
          </h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-mono font-bold text-[var(--accent-success)]">
              {stats.consistencyRate}%
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {stats.todayDone}/{stats.todayTotal} today
            </span>
          </div>
        </div>
        <button
          onClick={onViewFull}
          className={cn(
            "flex items-center gap-1 text-xs text-[var(--text-muted)]",
            "hover:text-[var(--accent-primary)] transition-colors",
            "min-h-[44px] sm:min-h-0",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
          )}
        >
          View full <ArrowRight size={12} />
        </button>
      </div>

      {/* Mini summary squares — matches MonthlyHabitGrid style */}
      <div className="flex gap-1 flex-wrap">
        {miniDots.map((dot) => (
          <div
            key={dot.date}
            className={cn("w-3 h-3 rounded-[2px]", getDotColor(dot.percent))}
            title={`${dot.date}: ${Math.round(dot.percent * 100)}%`}
          />
        ))}
      </div>
    </motion.div>
  );
}
