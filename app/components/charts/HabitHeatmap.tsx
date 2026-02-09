"use client";

// =============================================================================
// HABIT HEATMAP COMPONENT
// Shows completion history for individual habits with streak highlighting.
// Enhanced with anime.js-style grid re-animation and streak pulse effects.
// =============================================================================

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import anime from "animejs";
import { cn } from "@/app/lib/cn";

type HabitCompletion = {
  date: string;
  completed: boolean;
};

type Habit = {
  id: string;
  title: string;
  completions: HabitCompletion[];
  currentStreak: number;
};

type Props = {
  habits: Habit[];
};

// Month names for labels
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function HabitHeatmap({ habits }: Props) {
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
    habits.length > 0 ? habits[0].id : null
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const monthLabelsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotionHook = useReducedMotion();

  const selectedHabit = habits.find((h) => h.id === selectedHabitId);

  // Trigger re-animation when habit selection changes
  const handleHabitChange = (newHabitId: string) => {
    setSelectedHabitId(newHabitId);
    setAnimationKey((k) => k + 1);
  };

  // Create a map of date -> completed for quick lookup
  const completionMap = useMemo(() => {
    if (!selectedHabit) return new Map<string, boolean>();
    return new Map(selectedHabit.completions.map((c) => [c.date, c.completed]));
  }, [selectedHabit]);

  // Generate last 90 days of data
  const { weeks, monthLabels } = useMemo(() => {
    const days: Array<{ date: string; completed: boolean; isStreak: boolean }> = [];
    const today = new Date();

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const completed = completionMap.get(dateStr) ?? false;

      days.push({
        date: dateStr,
        completed,
        isStreak: false, // Will calculate streak highlighting below
      });
    }

    // Mark streak days (consecutive completions from today backwards)
    if (selectedHabit && selectedHabit.currentStreak > 0) {
      for (let i = days.length - 1; i >= 0 && i >= days.length - selectedHabit.currentStreak; i--) {
        if (days[i].completed) {
          days[i].isStreak = true;
        } else {
          break;
        }
      }
    }

    // Group into weeks
    const weekGroups: Array<Array<typeof days[0] & { isEmpty?: boolean }>> = [];
    let currentWeek: Array<typeof days[0] & { isEmpty?: boolean }> = [];
    const months: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (const day of days) {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const month = date.getMonth();

      if (month !== lastMonth) {
        months.push({ label: MONTH_NAMES[month], weekIndex: weekGroups.length });
        lastMonth = month;
      }

      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(day);
    }

    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    // Pad first week
    if (weekGroups.length > 0) {
      const firstDayOfWeek = new Date(weekGroups[0][0].date).getDay();
      if (firstDayOfWeek > 0) {
        const padding = Array(firstDayOfWeek).fill({ date: "", completed: false, isEmpty: true });
        weekGroups[0] = [...padding, ...weekGroups[0]];
      }
    }

    return { weeks: weekGroups, monthLabels: months };
  }, [completionMap, selectedHabit]);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function getColor(completed: boolean, isStreak: boolean): string {
    if (!completed) return "bg-[var(--heatmap-empty)]";
    if (isStreak) return "bg-[var(--accent-streak)]";
    return "bg-[var(--accent-success)]";
  }

  // Grid re-animation on habit selection change
  useEffect(() => {
    if (prefersReducedMotionHook || !gridRef.current) return;

    const cells = gridRef.current.querySelectorAll(".habit-heatmap-cell");
    const rows = 7;

    // Diagonal wave animation
    anime({
      targets: cells,
      scale: [0.4, 1],
      opacity: [0, 1],
      easing: "easeOutBack",
      duration: 300,
      delay: (el, i) => {
        const weekIndex = Math.floor(i / rows);
        const dayIndex = i % rows;
        const diagonalIndex = weekIndex + dayIndex;
        return diagonalIndex * 12 + 50;
      },
    });

    // Streak cells pulse animation
    const streakCells = gridRef.current.querySelectorAll(".streak-cell");
    if (streakCells.length > 0) {
      anime({
        targets: streakCells,
        boxShadow: [
          "0 0 0px rgba(var(--accent-streak-rgb), 0)",
          "0 0 8px rgba(var(--accent-streak-rgb), 0.5)",
          "0 0 0px rgba(var(--accent-streak-rgb), 0)",
        ],
        easing: "easeInOutSine",
        duration: 800,
        delay: (el, i) => i * 30 + 400,
      });
    }

    // Month labels stagger
    if (monthLabelsRef.current) {
      const labels = monthLabelsRef.current.querySelectorAll(".month-label");
      anime({
        targets: labels,
        opacity: [0, 1],
        translateY: [-6, 0],
        easing: "easeOutCubic",
        duration: 250,
        delay: (el, i) => i * 40 + 100,
      });
    }

    // Legend stagger
    if (legendRef.current) {
      const legendItems = legendRef.current.querySelectorAll(".legend-item");
      anime({
        targets: legendItems,
        opacity: [0, 1],
        translateX: [-10, 0],
        easing: "easeOutCubic",
        duration: 250,
        delay: (el, i) => i * 60 + 300,
      });
    }
  }, [animationKey, prefersReducedMotionHook, weeks.length]);

  if (habits.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <p className="text-sm">No habits to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Habit Selector with animated transition */}
      <div className="relative">
        <select
          value={selectedHabitId || ""}
          onChange={(e) => handleHabitChange(e.target.value)}
          className={cn(
            "w-full appearance-none px-4 py-2.5 pr-10 rounded-xl",
            "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
            "text-[var(--text-primary)] text-sm font-medium",
            "focus:outline-none focus:border-[var(--accent-primary)]",
            "cursor-pointer transition-colors"
          )}
        >
          {habits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.title} (Streak: {habit.currentStreak})
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
      </div>

      {/* Streak Info */}
      {selectedHabit && selectedHabit.currentStreak > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-muted)]">Current streak:</span>
          <span className="font-mono font-bold text-[var(--accent-streak)]">
            {selectedHabit.currentStreak} days
          </span>
        </div>
      )}

      {/* Month Labels */}
      <div ref={monthLabelsRef} className="flex gap-1 overflow-x-auto pb-1 text-xs text-[var(--text-muted)]">
        <div className="w-6 flex-shrink-0" />
        {weeks.map((_, weekIndex) => {
          const monthLabel = monthLabels.find((m) => m.weekIndex === weekIndex);
          return (
            <div key={weekIndex} className="w-3 flex-shrink-0 text-center">
              {monthLabel ? (
                <span
                  className="month-label font-medium"
                  style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
                >
                  {monthLabel.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Heatmap Grid */}
      <div ref={gridRef} key={animationKey} className="flex gap-1 overflow-x-auto pb-2">
        {/* Day labels */}
        <div className="flex flex-col gap-1 flex-shrink-0 pr-1">
          {["", "M", "", "W", "", "F", ""].map((label, i) => (
            <div key={i} className="w-4 h-3 text-[10px] text-[var(--text-muted)] flex items-center">
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => {
              if (day.isEmpty) {
                return <div key={dayIndex} className="w-3 h-3" />;
              }

              const isHovered = hoveredDate === day.date;

              return (
                <motion.div
                  key={day.date}
                  className={cn(
                    "habit-heatmap-cell w-3 h-3 rounded-sm cursor-pointer transition-all",
                    getColor(day.completed, day.isStreak),
                    day.isStreak && "streak-cell",
                    isHovered && "ring-1 ring-[var(--text-primary)]",
                    "cell-hover-pulse"
                  )}
                  style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
                  onMouseEnter={() => setHoveredDate(day.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  whileHover={{ scale: 1.3 }}
                  title={`${formatDate(day.date)}: ${day.completed ? "Completed" : "Missed"}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div ref={legendRef} className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <div
            className="legend-item flex items-center gap-1.5"
            style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
          >
            <div className="w-3 h-3 rounded-sm bg-[var(--heatmap-empty)]" />
            <span>Missed</span>
          </div>
          <div
            className="legend-item flex items-center gap-1.5"
            style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
          >
            <div className="w-3 h-3 rounded-sm bg-[var(--accent-success)]" />
            <span>Completed</span>
          </div>
          <div
            className="legend-item flex items-center gap-1.5"
            style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
          >
            <div className="w-3 h-3 rounded-sm bg-[var(--accent-streak)]" />
            <span>Current Streak</span>
          </div>
        </div>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoveredDate && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-[var(--text-secondary)]"
            >
              {formatDate(hoveredDate)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
