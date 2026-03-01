"use client";

// =============================================================================
// ACTIVITY HEATMAP COMPONENT
// GitHub-style activity grid showing daily activity levels.
// Enhanced with anime.js-style diagonal wave reveal, hover pulse, and blur-clear panels.
// Supports full-year mode (Jan 1 → Dec 31) with ghost cells for future dates.
// =============================================================================

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import anime from "animejs";
import { cn } from "@/app/lib/cn";

type ActivityDay = {
  date: string;
  count: number;
  tasks?: number;
  habits?: number;
  focusMinutes?: number;
  isFuture?: boolean;
};

type Props = {
  data: Array<ActivityDay>;
  onDayClick?: (day: ActivityDay) => void;
  fullYear?: boolean;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse "YYYY-MM-DD" into a local-time Date, avoiding UTC timezone shift. */
function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as "YYYY-MM-DD". */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Cell dimensions
const CELL_SIZE = 14;
const CELL_GAP = 3;
const DAY_LABEL_WIDTH = 30;
const LEGEND_CELL_SIZE = 12;
const MONTH_LABEL_MIN_SPACING = 30;

export default function ActivityHeatmap({ data, onDayClick, fullYear = false }: Props) {
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);
  const [selectedDay, setSelectedDay] = useState<ActivityDay | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotionHook = useReducedMotion();

  const maxActivity = Math.max(...data.map((d) => d.count), 1);

  const getActivityLevel = useCallback((count: number): number => {
    if (count === 0) return 0;
    const ratio = count / maxActivity;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }, [maxActivity]);

  function getColor(level: number): string {
    switch (level) {
      case 0: return "bg-[var(--heatmap-empty)]";
      case 1: return "bg-[var(--accent-success)]/15";
      case 2: return "bg-[var(--accent-success)]/35";
      case 3: return "bg-[var(--accent-success)]/60";
      case 4: return "bg-[var(--accent-success)]";
      default: return "bg-[var(--heatmap-empty)]";
    }
  }

  function formatDate(dateStr: string): string {
    const date = parseDate(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Group data by weeks and calculate month label positions
  const { weeks, monthLabels } = useMemo(() => {
    if (fullYear) {
      // Full-year mode: build grid from Jan 1 → Dec 31
      const year = new Date().getFullYear();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build lookup from data
      const dataMap = new Map<string, ActivityDay>();
      for (const d of data) {
        dataMap.set(d.date, d);
      }

      const weekGroups: Array<Array<ActivityDay & { isEmpty?: boolean }>> = [];
      let currentWeek: Array<ActivityDay & { isEmpty?: boolean }> = [];
      const months: Array<{ label: string; weekIndex: number }> = [];
      let lastMonth = -1;

      const jan1 = new Date(year, 0, 1);
      const dec31 = new Date(year, 11, 31);

      // Pad first week with empty cells if Jan 1 doesn't start on Sunday
      const jan1Day = jan1.getDay();
      if (jan1Day > 0) {
        currentWeek = Array(jan1Day).fill({ date: "", count: -1, isEmpty: true });
      }

      for (let d = new Date(jan1); d <= dec31; d.setDate(d.getDate() + 1)) {
        const dateStr = formatDateKey(d);
        const dayOfWeek = d.getDay();
        const month = d.getMonth();

        if (month !== lastMonth) {
          months.push({ label: MONTH_NAMES[month], weekIndex: weekGroups.length });
          lastMonth = month;
        }

        if (dayOfWeek === 0 && currentWeek.length > 0) {
          weekGroups.push(currentWeek);
          currentWeek = [];
        }

        const isFuture = d > today;
        const existing = dataMap.get(dateStr);

        if (isFuture) {
          currentWeek.push({ date: dateStr, count: 0, isFuture: true });
        } else if (existing) {
          currentWeek.push({ ...existing, isFuture: false });
        } else {
          currentWeek.push({ date: dateStr, count: 0, isFuture: false });
        }
      }

      if (currentWeek.length > 0) {
        weekGroups.push(currentWeek);
      }

      return { weeks: weekGroups, monthLabels: months };
    }

    // Default mode: iterate data array only
    const weekGroups: Array<Array<ActivityDay & { isEmpty?: boolean }>> = [];
    let currentWeek: Array<ActivityDay & { isEmpty?: boolean }> = [];
    const months: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (let i = 0; i < data.length; i++) {
      const day = data[i];
      const date = parseDate(day.date);
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

    // Pad first week with empty cells
    if (weekGroups.length > 0) {
      const firstDayOfWeek = parseDate(weekGroups[0][0].date).getDay();
      if (firstDayOfWeek > 0) {
        const padding = Array(firstDayOfWeek).fill({ date: "", count: -1, isEmpty: true });
        weekGroups[0] = [...padding, ...weekGroups[0]];
      }
    }

    return { weeks: weekGroups, monthLabels: months };
  }, [data, fullYear]);

  const handleDayClick = (day: ActivityDay) => {
    if (day.count >= 0 && !day.isFuture) {
      setSelectedDay(day);
      onDayClick?.(day);
    }
  };

  // Diagonal wave stagger animation
  useEffect(() => {
    if (hasAnimated || prefersReducedMotionHook || !gridRef.current) return;

    const pastCells = gridRef.current.querySelectorAll(".heatmap-cell:not([data-future])");
    const futureCells = gridRef.current.querySelectorAll(".heatmap-cell[data-future]");
    const rows = 7;

    if (pastCells.length > 0) {
      anime({
        targets: pastCells,
        scale: [0.4, 1],
        opacity: [0, 1],
        easing: "easeOutBack",
        duration: 300,
        delay: (_el, i) => {
          const weekIndex = Math.floor(i / rows);
          const dayIndex = i % rows;
          const diagonalIndex = weekIndex + dayIndex;
          return diagonalIndex * 15 + 50;
        },
      });
    }

    if (futureCells.length > 0) {
      anime({
        targets: futureCells,
        scale: [0.4, 1],
        opacity: [0, 0.3],
        easing: "easeOutBack",
        duration: 300,
        delay: (_el, i) => {
          const weekIndex = Math.floor(i / rows);
          const dayIndex = i % rows;
          const diagonalIndex = weekIndex + dayIndex;
          return diagonalIndex * 15 + 50;
        },
      });
    }

    if (legendRef.current) {
      const legendItems = legendRef.current.querySelectorAll(".legend-item");
      anime({
        targets: legendItems,
        scale: [0.6, 1],
        opacity: [0, 1],
        easing: "easeOutBack",
        duration: 250,
        delay: (_el, i) => i * 50 + 400,
      });
    }

    queueMicrotask(() => setHasAnimated(true));
  }, [hasAnimated, prefersReducedMotionHook, weeks.length]);

  const totalGridWidth = DAY_LABEL_WIDTH + weeks.length * (CELL_SIZE + CELL_GAP);

  return (
    <div className="space-y-2">
      {/* Month Labels — absolutely positioned with minimum spacing to prevent overlap */}
      <div className="overflow-x-auto pb-1 heatmap-scroll">
        <div className="relative h-5" style={{ minWidth: totalGridWidth }}>
          {(() => {
            let lastRenderedOffset = -Infinity;
            return monthLabels.map((m, i) => {
              const offset = DAY_LABEL_WIDTH + m.weekIndex * (CELL_SIZE + CELL_GAP);
              if (offset - lastRenderedOffset < MONTH_LABEL_MIN_SPACING) return null;
              lastRenderedOffset = offset;
              return (
                <span
                  key={`${m.label}-${i}`}
                  className="absolute text-xs font-medium text-[var(--text-muted)] whitespace-nowrap"
                  style={{
                    left: offset,
                    top: 0,
                    opacity: prefersReducedMotionHook ? 1 : undefined,
                  }}
                >
                  {m.label}
                </span>
              );
            });
          })()}
        </div>
      </div>

      {/* Heatmap Grid with Day Labels */}
      <div className="overflow-x-auto pb-2 heatmap-scroll">
        <div
          ref={gridRef}
          className="flex"
          style={{ gap: CELL_GAP, minWidth: totalGridWidth }}
        >
          {/* Day of week labels */}
          <div className="flex flex-col flex-shrink-0" style={{ gap: CELL_GAP, width: DAY_LABEL_WIDTH }}>
            {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
              <div
                key={i}
                className="text-[10px] text-[var(--text-muted)] flex items-center"
                style={{ height: CELL_SIZE }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col" style={{ gap: CELL_GAP }}>
              {week.map((day, dayIndex) => {
                if (day.isEmpty || day.count === -1) {
                  return (
                    <div
                      key={dayIndex}
                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                    />
                  );
                }

                // Future cell — ghost appearance, non-interactive
                if (day.isFuture) {
                  return (
                    <div
                      key={day.date}
                      className="heatmap-cell rounded-[3px] bg-[var(--heatmap-empty)]"
                      data-future=""
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        opacity: prefersReducedMotionHook ? 0.3 : 0,
                      }}
                      title={formatDate(day.date)}
                    />
                  );
                }

                const level = getActivityLevel(day.count);
                const isSelected = selectedDay?.date === day.date;
                const isHovered = hoveredDay?.date === day.date;

                return (
                  <motion.div
                    key={day.date}
                    className={cn(
                      "heatmap-cell rounded-[3px] cursor-pointer transition-all",
                      getColor(level),
                      (isSelected || isHovered) && "ring-1 ring-[var(--text-primary)]",
                      "cell-hover-pulse"
                    )}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      opacity: prefersReducedMotionHook ? 1 : 0,
                    }}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                    title={`${formatDate(day.date)}: ${day.count} activities`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend and Tooltip */}
      <div className="flex items-center justify-between">
        <div ref={legendRef} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="legend-item" style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn("legend-item rounded-[3px]", getColor(level))}
                style={{
                  width: LEGEND_CELL_SIZE,
                  height: LEGEND_CELL_SIZE,
                  opacity: prefersReducedMotionHook ? 1 : 0,
                }}
              />
            ))}
          </div>
          <span className="legend-item" style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}>More</span>
        </div>

        <AnimatePresence>
          {hoveredDay && !selectedDay && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="text-xs text-[var(--text-secondary)]"
            >
              <span className="font-medium">{formatDate(hoveredDay.date)}</span>
              {": "}
              <span className="font-mono text-[var(--accent-success)]">
                {hoveredDay.count} {hoveredDay.count === 1 ? "activity" : "activities"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Day Detail Panel */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: -15, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className={cn(
              "p-4 rounded-xl",
              "bg-[var(--bg-elevated)]",
              "border border-[var(--border-subtle)]"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h4 className="font-medium text-[var(--text-primary)]">
                  {formatDate(selectedDay.date)}
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedDay.count} total activities
                </p>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={14} className="text-[var(--text-muted)]" />
              </motion.button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  value: selectedDay.tasks ?? Math.floor(selectedDay.count * 0.5),
                  label: "Tasks",
                  color: "text-[var(--accent-primary)]",
                  delay: 0.1,
                },
                {
                  value: selectedDay.habits ?? Math.floor(selectedDay.count * 0.3),
                  label: "Habits",
                  color: "text-[var(--accent-success)]",
                  delay: 0.15,
                },
                {
                  value: `${selectedDay.focusMinutes ?? Math.floor(selectedDay.count * 10)}m`,
                  label: "Focus",
                  color: "text-[var(--accent-streak)]",
                  delay: 0.2,
                },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: stat.delay, type: "spring", stiffness: 100 }}
                  className="text-center p-2 rounded-lg bg-[var(--bg-card)]"
                >
                  <p className={cn("text-lg font-mono font-bold", stat.color)}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
