// =============================================================================
// HABITS TAB CONTENT
// Orchestrator for the Habits tab within analytics.
// Manages month state, data fetching, and composes stats + grid + ranking +
// day-of-week chart + trend chart. Computes derived insights client-side.
// =============================================================================

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { getTodayISO, isActiveDay, toISODateString } from "@/app/lib/date-utils";
import { useProfile } from "@/app/components/ProfileProvider";
import { useCelebration } from "@/app/components/CelebrationOverlay";
import HabitStats from "./HabitStats";
import MonthlyHabitGrid from "./MonthlyHabitGrid";
import HabitTrendChart from "./HabitTrendChart";
import HabitRanking from "./HabitRanking";
import DayOfWeekChart from "./DayOfWeekChart";
import type { HabitHistoryResponse, Id, ISODateString } from "@/app/lib/types";
import type { HabitPerformance } from "./HabitRanking";
import type { DayOfWeekData } from "./DayOfWeekChart";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HabitsTabContent() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<HabitHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { refreshProfile, profile } = useProfile();
  const { showXpGain, showLevelUp, showStreakMilestone } = useCelebration();

  const monthParam = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchApi<HabitHistoryResponse>(
        `/api/habits/history?month=${monthParam}`
      );
      setData(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [monthParam]);

  useEffect(() => {
    fetchMonthData();
  }, [fetchMonthData]);

  // Compute daily completion % for the trend chart
  const trendData = useMemo(() => {
    if (!data) return [];

    const today = getTodayISO();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const points: Array<{ day: number; label: string; percent: number }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` as ISODateString;
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

      if (scheduled > 0) {
        points.push({
          day: d,
          label: String(d),
          percent: Math.round((completed / scheduled) * 100),
        });
      }
    }

    return points;
  }, [data, currentYear, currentMonth]);

  // Average completion % for trend chart reference line
  const avgPercent = useMemo(() => {
    if (trendData.length === 0) return 0;
    const sum = trendData.reduce((acc, p) => acc + p.percent, 0);
    return Math.round(sum / trendData.length);
  }, [trendData]);

  // Per-habit performance for HabitRanking (with trend computation)
  const habitPerformance = useMemo((): HabitPerformance[] => {
    if (!data) return [];

    const today = getTodayISO();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const midpoint = Math.ceil(daysInMonth / 2);

    return data.habits
      .map((habit) => {
        const habitCreated = toISODateString(new Date(habit.created_at));
        const activeDays = habit.active_days ?? [1, 2, 3, 4, 5, 6, 7];

        let scheduled = 0;
        let completed = 0;
        let firstHalfScheduled = 0;
        let firstHalfCompleted = 0;
        let secondHalfScheduled = 0;
        let secondHalfCompleted = 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` as ISODateString;
          if (dateStr > today) break;
          if (dateStr < habitCreated) continue;
          if (!isActiveDay(dateStr, activeDays)) continue;

          scheduled++;
          const done = data.completions[habit.id]?.includes(dateStr) ?? false;
          if (done) completed++;

          if (d <= midpoint) {
            firstHalfScheduled++;
            if (done) firstHalfCompleted++;
          } else {
            secondHalfScheduled++;
            if (done) secondHalfCompleted++;
          }
        }

        const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

        // Compute trend: first-half vs second-half rate
        let trend: "up" | "down" | "flat" | null = null;
        if (scheduled >= 4 && firstHalfScheduled > 0 && secondHalfScheduled > 0) {
          const firstRate = (firstHalfCompleted / firstHalfScheduled) * 100;
          const secondRate = (secondHalfCompleted / secondHalfScheduled) * 100;
          const delta = secondRate - firstRate;
          if (delta >= 10) trend = "up";
          else if (delta <= -10) trend = "down";
          else trend = "flat";
        }

        return {
          id: habit.id,
          title: habit.title,
          rate,
          currentStreak: habit.current_streak,
          longestStreak: habit.longest_streak,
          completed,
          scheduled,
          trend,
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [data, currentYear, currentMonth]);

  // Day-of-week breakdown for DayOfWeekChart
  const dayOfWeekData = useMemo((): DayOfWeekData[] => {
    if (!data) return [];

    const today = getTodayISO();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Initialize 7 groups
    const groups = DAY_NAMES.map((name) => ({
      day: name,
      scheduled: 0,
      completed: 0,
      count: 0,
    }));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` as ISODateString;
      if (dateStr > today) break;

      const dateObj = new Date(currentYear, currentMonth, d);
      const jsDay = dateObj.getDay(); // 0=Sun
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon

      let dayScheduled = 0;
      let dayCompleted = 0;

      for (const habit of data.habits) {
        const habitCreated = toISODateString(new Date(habit.created_at));
        if (dateStr < habitCreated) continue;
        const activeDays = habit.active_days ?? [1, 2, 3, 4, 5, 6, 7];
        if (!isActiveDay(dateStr, activeDays)) continue;
        dayScheduled++;
        if (data.completions[habit.id]?.includes(dateStr)) dayCompleted++;
      }

      if (dayScheduled > 0) {
        groups[dayIdx].scheduled += dayScheduled;
        groups[dayIdx].completed += dayCompleted;
        groups[dayIdx].count++;
      }
    }

    const withRates = groups.map((g) => ({
      day: g.day,
      rate: g.scheduled > 0 ? Math.round((g.completed / g.scheduled) * 100) : 0,
      count: g.count,
      isBest: false,
      isWorst: false,
    }));

    // Only mark best/worst among days that have data
    const tracked = withRates.filter((d) => d.count > 0);
    if (tracked.length >= 2) {
      const maxRate = Math.max(...tracked.map((d) => d.rate));
      const minRate = Math.min(...tracked.map((d) => d.rate));
      if (maxRate !== minRate) {
        const bestIdx = withRates.findIndex((d) => d.count > 0 && d.rate === maxRate);
        const worstIdx = withRates.findIndex((d) => d.count > 0 && d.rate === minRate);
        if (bestIdx >= 0) withRates[bestIdx].isBest = true;
        if (worstIdx >= 0) withRates[worstIdx].isWorst = true;
      }
    }

    return withRates;
  }, [data, currentYear, currentMonth]);

  // Week-over-week delta for HabitStats
  const weekDelta = useMemo((): number | null => {
    if (trendData.length < 8) return null;

    const recent7 = trendData.slice(-7);
    const previous7 = trendData.slice(-14, -7);

    if (previous7.length === 0) return null;

    const recentAvg = Math.round(
      recent7.reduce((s, p) => s + p.percent, 0) / recent7.length
    );
    const prevAvg = Math.round(
      previous7.reduce((s, p) => s + p.percent, 0) / previous7.length
    );

    return recentAvg - prevAvg;
  }, [trendData]);

  // Best and worst day of week
  const { bestDay, worstDay } = useMemo(() => {
    const tracked = dayOfWeekData.filter((d) => d.count > 0);
    if (tracked.length < 2) return { bestDay: null, worstDay: null };

    const best = tracked.find((d) => d.isBest);
    const worst = tracked.find((d) => d.isWorst);

    return {
      bestDay: best ? { day: best.day, rate: best.rate } : null,
      worstDay: worst ? { day: worst.day, rate: worst.rate } : null,
    };
  }, [dayOfWeekData]);

  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    const now = new Date();
    const isCurrentMonth =
      currentYear === now.getFullYear() && currentMonth === now.getMonth();
    if (isCurrentMonth) return;

    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function handleToday() {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  }

  async function handleGridToggle(habitId: Id, date: ISODateString) {
    try {
      const res = await fetch("/api/habits/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date }),
      });

      if (!res.ok) {
        setError("Failed to toggle habit");
        return;
      }

      const result = await res.json();

      // Show celebrations
      if (result.xpGained) showXpGain(result.xpGained);
      if (result.newLevel) showLevelUp(result.newLevel);
      if (
        result.newStreak &&
        [7, 14, 21, 30, 60, 90, 100, 150, 180, 200, 365].includes(result.newStreak)
      ) {
        showStreakMilestone(result.newStreak);
      }

      refreshProfile();
      await fetchMonthData();
    } catch {
      setError("Failed to toggle habit");
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
        <div className="h-64 animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-56 animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
          <div className="h-56 animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
        </div>
        <div className="h-48 animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <p className="text-[var(--accent-primary)]">Error: {error}</p>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="space-y-6"
    >
      {/* Stats Section — command center */}
      <HabitStats
        stats={data.stats}
        currentStreak={profile?.current_streak ?? 0}
        weekDelta={weekDelta}
        bestDay={bestDay}
        worstDay={worstDay}
      />

      {/* Monthly Grid — hero visualization */}
      <MonthlyHabitGrid
        year={currentYear}
        month={currentMonth}
        habits={data.habits}
        completions={data.completions}
        onToggle={handleGridToggle}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />

      {/* Ranking + Day-of-Week — side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HabitRanking habits={habitPerformance} />
        <DayOfWeekChart data={dayOfWeekData} />
      </div>

      {/* Consistency Trend Chart */}
      {trendData.length > 1 && (
        <HabitTrendChart data={trendData} avgPercent={avgPercent} />
      )}
    </motion.div>
  );
}
