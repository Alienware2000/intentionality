"use client";

// =============================================================================
// ACTIVITY HEATMAP COMPONENT
// GitHub-style activity grid showing daily activity levels.
// Enhanced with anime.js-style diagonal wave reveal, hover pulse, and blur-clear panels.
// =============================================================================

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import anime from "animejs";
import { cn } from "@/app/lib/cn";

type ActivityDay = {
  date: string;
  count: number;
  // Optional breakdown details
  tasks?: number;
  habits?: number;
  focusMinutes?: number;
};

type Props = {
  data: Array<ActivityDay>;
  onDayClick?: (day: ActivityDay) => void;
};

// Month names for labels
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ActivityHeatmap({ data, onDayClick }: Props) {
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);
  const [selectedDay, setSelectedDay] = useState<ActivityDay | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const monthLabelsRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotionHook = useReducedMotion();

  // Calculate max activity for color scaling
  const maxActivity = Math.max(...data.map((d) => d.count), 1);

  // Get activity level (0-4) for color intensity
  const getActivityLevel = useCallback((count: number): number => {
    if (count === 0) return 0;
    const ratio = count / maxActivity;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }, [maxActivity]);

  // Get color based on activity level
  function getColor(level: number): string {
    switch (level) {
      case 0:
        return "bg-[var(--heatmap-empty)]";
      case 1:
        return "bg-[var(--accent-success)]/20";
      case 2:
        return "bg-[var(--accent-success)]/40";
      case 3:
        return "bg-[var(--accent-success)]/60";
      case 4:
        return "bg-[var(--accent-success)]";
      default:
        return "bg-[var(--heatmap-empty)]";
    }
  }

  // Format date for tooltip
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Group data by weeks and calculate month positions
  const { weeks, monthLabels } = useMemo(() => {
    const weekGroups: Array<Array<ActivityDay & { isEmpty?: boolean }>> = [];
    let currentWeek: Array<ActivityDay & { isEmpty?: boolean }> = [];
    const months: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (let i = 0; i < data.length; i++) {
      const day = data[i];
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const month = date.getMonth();

      // Track month changes for labels
      if (month !== lastMonth) {
        months.push({ label: MONTH_NAMES[month], weekIndex: weekGroups.length });
        lastMonth = month;
      }

      // Start new week on Sunday (day 0)
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(day);
    }

    // Push last week if it has data
    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    // Pad first week with empty cells if needed
    if (weekGroups.length > 0) {
      const firstDayOfWeek = new Date(weekGroups[0][0].date).getDay();
      if (firstDayOfWeek > 0) {
        const padding = Array(firstDayOfWeek).fill({ date: "", count: -1, isEmpty: true });
        weekGroups[0] = [...padding, ...weekGroups[0]];
      }
    }

    return { weeks: weekGroups, monthLabels: months };
  }, [data]);

  const handleDayClick = (day: ActivityDay) => {
    if (day.count >= 0) {
      setSelectedDay(day);
      onDayClick?.(day);
    }
  };

  // Diagonal wave stagger animation for grid cells
  useEffect(() => {
    if (hasAnimated || prefersReducedMotionHook || !gridRef.current) return;

    const cells = gridRef.current.querySelectorAll(".heatmap-cell");
    if (cells.length === 0) return;

    // Calculate diagonal delay based on position (row + col)
    const cols = weeks.length;
    const rows = 7;

    anime({
      targets: cells,
      scale: [0.4, 1],
      opacity: [0, 1],
      easing: "easeOutBack",
      duration: 300,
      delay: (el, i) => {
        // Calculate row and col from index
        const weekIndex = Math.floor(i / rows);
        const dayIndex = i % rows;
        // Diagonal distance from top-left
        const diagonalIndex = weekIndex + dayIndex;
        return diagonalIndex * 15 + 50;
      },
    });

    // Month labels stagger animation
    if (monthLabelsRef.current) {
      const labels = monthLabelsRef.current.querySelectorAll(".month-label");
      anime({
        targets: labels,
        opacity: [0, 1],
        translateY: [-8, 0],
        easing: "easeOutCubic",
        duration: 300,
        delay: (el, i) => i * 40 + 200,
      });
    }

    // Legend stagger animation
    if (legendRef.current) {
      const legendItems = legendRef.current.querySelectorAll(".legend-item");
      anime({
        targets: legendItems,
        scale: [0.6, 1],
        opacity: [0, 1],
        easing: "easeOutBack",
        duration: 250,
        delay: (el, i) => i * 50 + 400,
      });
    }

    queueMicrotask(() => setHasAnimated(true));
  }, [hasAnimated, prefersReducedMotionHook, weeks.length]);

  return (
    <div className="space-y-3">
      {/* Month Labels */}
      <div ref={monthLabelsRef} className="flex gap-1 overflow-x-auto pb-1 text-xs text-[var(--text-muted)]">
        <div className="w-6 flex-shrink-0" /> {/* Spacer for day labels */}
        {weeks.map((_, weekIndex) => {
          const monthLabel = monthLabels.find(m => m.weekIndex === weekIndex);
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

      {/* Heatmap Grid with Day Labels */}
      <div ref={gridRef} className="flex gap-1 overflow-x-auto pb-2">
        {/* Day of week labels */}
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
              if (day.isEmpty || day.count === -1) {
                return <div key={dayIndex} className="w-3 h-3" />;
              }

              const level = getActivityLevel(day.count);
              const isSelected = selectedDay?.date === day.date;
              const isHovered = hoveredDay?.date === day.date;

              return (
                <motion.div
                  key={day.date}
                  className={cn(
                    "heatmap-cell w-3 h-3 rounded-sm cursor-pointer transition-all",
                    getColor(level),
                    (isSelected || isHovered) && "ring-1 ring-[var(--text-primary)]",
                    "cell-hover-pulse"
                  )}
                  style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
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

      {/* Legend and Tooltip */}
      <div className="flex items-center justify-between">
        <div ref={legendRef} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="legend-item" style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn("legend-item w-3 h-3 rounded-sm", getColor(level))}
                style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
              />
            ))}
          </div>
          <span className="legend-item" style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}>More</span>
        </div>

        {/* Hover Tooltip */}
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

      {/* Selected Day Detail Panel - blur-clear entrance */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: -15, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
            }}
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
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: stat.delay,
                    type: "spring",
                    stiffness: 100,
                  }}
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
