// =============================================================================
// MONTHLY HABIT GRID
// GitHub contribution graph style: dense square cells, 5-level intensity summary.
// Inspired by GitHub's heatmap + Dominic Hartt's monthly grid approach.
// =============================================================================

"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import anime from "animejs";
import { cn } from "@/app/lib/cn";
import { isActiveDay, getTodayISO, toISODateString } from "@/app/lib/date-utils";
import type { Habit, Id, ISODateString, DayOfWeek } from "@/app/lib/types";

type Props = {
  year: number;
  month: number; // 0-indexed
  habits: Habit[];
  completions: Record<Id, ISODateString[]>;
  onToggle: (habitId: Id, date: ISODateString) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

type CellData = {
  status: "completed" | "active" | "inactive";
};

type DayColumn = {
  date: ISODateString;
  dayOfMonth: number;
  dayOfWeek: number; // 0=Mon, 6=Sun
  dayName: string;
  isToday: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  summaryPercent: number;
  isPerfect: boolean;
  scheduledCount: number;
  completedCount: number;
  cells: Record<Id, CellData>;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export default function MonthlyHabitGrid({
  year,
  month,
  habits,
  completions,
  onToggle,
  onPrevMonth,
  onNextMonth,
  onToday,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);
  const [expandedHabitId, setExpandedHabitId] = useState<Id | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    dayIdx: number;
    habitId: Id | null;
  }>({ visible: false, x: 0, y: 0, dayIdx: 0, habitId: null });
  const prevMonthRef = useRef(`${year}-${month}`);
  const prefersReducedMotionHook = useReducedMotion();

  const today = getTodayISO();
  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth();

  // Compute the grid data
  const { days, monthLabel } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const label = `${monthNames[month]} ${year}`;

    const result: DayColumn[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` as ISODateString;
      const dateObj = new Date(year, month, d);
      const jsDay = dateObj.getDay(); // 0=Sun
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, 6=Sun
      const dayName = DAY_NAMES[dayOfWeek];
      const isToday = dateStr === today;
      const isFuture = dateStr > today;
      const isWeekend = dayOfWeek >= 5; // Sat=5, Sun=6

      const cells: Record<Id, CellData> = {};
      let dayScheduled = 0;
      let dayCompleted = 0;

      for (const habit of habits) {
        const habitCreatedDate = toISODateString(new Date(habit.created_at));
        const activeDays = habit.active_days ?? [1, 2, 3, 4, 5, 6, 7];
        const active = dateStr >= habitCreatedDate && isActiveDay(dateStr, activeDays);

        if (!active) {
          cells[habit.id] = { status: "inactive" };
          continue;
        }

        dayScheduled++;
        const completed = completions[habit.id]?.includes(dateStr) ?? false;
        if (completed) dayCompleted++;

        cells[habit.id] = { status: completed ? "completed" : "active" };
      }

      const summaryPercent = dayScheduled > 0 ? dayCompleted / dayScheduled : 0;
      const isPerfect = dayScheduled > 0 && dayCompleted === dayScheduled;

      result.push({
        date: dateStr,
        dayOfMonth: d,
        dayOfWeek,
        dayName,
        isToday,
        isFuture,
        isWeekend,
        summaryPercent,
        isPerfect,
        scheduledCount: dayScheduled,
        completedCount: dayCompleted,
        cells,
      });
    }

    return { days: result, monthLabel: label };
  }, [year, month, habits, completions, today]);

  // Diagonal wave stagger on mount and month change
  useEffect(() => {
    const monthKey = `${year}-${month}`;
    if (prevMonthRef.current !== monthKey) {
      prevMonthRef.current = monthKey;
      hasAnimatedRef.current = false;
    }

    if (hasAnimatedRef.current || prefersReducedMotionHook || !gridRef.current) return;

    const cells = gridRef.current.querySelectorAll(".habit-grid-cell");
    if (cells.length === 0) return;

    const cols = days.length;

    anime({
      targets: cells,
      scale: [0.4, 1],
      opacity: [0, 1],
      easing: "easeOutBack",
      duration: 300,
      delay: (_el: Element, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (row + col) * 12 + 50;
      },
    });

    hasAnimatedRef.current = true;
  }, [prefersReducedMotionHook, days.length, habits.length, year, month]);

  // Summary row: 5-level GitHub-style intensity (bumped for contrast)
  const getSummaryColor = useCallback((percent: number, isPerfect: boolean, isFuture: boolean): string => {
    if (isFuture) return "bg-[var(--heatmap-empty)] opacity-40";
    if (percent === 0) return "bg-[var(--heatmap-empty)]";
    if (isPerfect) return "bg-[var(--accent-success)]";
    if (percent <= 0.25) return "bg-[var(--accent-success)]/30";
    if (percent <= 0.5) return "bg-[var(--accent-success)]/50";
    if (percent <= 0.75) return "bg-[var(--accent-success)]/70";
    return "bg-[var(--accent-success)]/85";
  }, []);

  // Sparse date labels: 1st, every 5th, last day, and today
  const showDateLabel = useCallback((day: DayColumn, daysInMonth: number): boolean => {
    if (day.isToday) return true;
    if (day.dayOfMonth === 1) return true;
    if (day.dayOfMonth % 5 === 0) return true;
    if (day.dayOfMonth === daysInMonth) return true;
    return false;
  }, []);

  // Compute per-habit stats for expanded detail
  const getHabitDetail = useCallback((habitId: Id) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return null;

    const completedDates = completions[habitId] ?? [];
    let scheduled = 0;
    const activeDays = habit.active_days ?? [1, 2, 3, 4, 5, 6, 7] as DayOfWeek[];
    const habitCreated = toISODateString(new Date(habit.created_at));

    for (const day of days) {
      if (day.isFuture) continue;
      if (day.date < habitCreated) continue;
      if (isActiveDay(day.date, activeDays)) scheduled++;
    }

    const completed = completedDates.length;
    const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

    return {
      completed,
      scheduled,
      rate,
      streak: habit.current_streak,
      longestStreak: habit.longest_streak,
    };
  }, [habits, completions, days]);

  const showTooltip = useCallback(
    (dayIdx: number, habitId: Id | null, e: React.MouseEvent | React.TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setTooltip({ visible: true, x: clientX, y: clientY - 8, dayIdx, habitId });
    },
    []
  );

  const hideTooltip = useCallback(() => {
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  // Compute stats footer data
  const gridStats = useMemo(() => {
    const tracked = days.filter((d) => !d.isFuture && d.scheduledCount > 0);
    const perfectDays = tracked.filter((d) => d.isPerfect);

    // Current perfect-day streak (consecutive from most recent tracked day backward)
    let currentPerfectStreak = 0;
    for (let i = tracked.length - 1; i >= 0; i--) {
      if (tracked[i].isPerfect) currentPerfectStreak++;
      else break;
    }

    // Best perfect-day streak this month
    let bestPerfectStreak = 0;
    let runningStreak = 0;
    for (const d of tracked) {
      if (d.isPerfect) {
        runningStreak++;
        if (runningStreak > bestPerfectStreak) bestPerfectStreak = runningStreak;
      } else {
        runningStreak = 0;
      }
    }

    return {
      daysTracked: tracked.length,
      perfectCount: perfectDays.length,
      currentPerfectStreak,
      bestPerfectStreak,
    };
  }, [days]);

  const daysInMonth = days.length;

  return (
    <div
      className={cn(
        "rounded-xl glass-card hover-lift-glow",
        "bg-[var(--bg-card)]",
        "border border-[var(--border-subtle)]",
        "p-5 sm:p-6"
      )}
    >
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onPrevMonth}
          className={cn(
            "p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors",
            "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
            "flex items-center justify-center"
          )}
        >
          <ChevronLeft size={18} className="text-[var(--text-muted)]" />
        </button>

        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {monthLabel}
          </h3>
          {!isCurrentMonth && (
            <button
              onClick={onToday}
              className={cn(
                "text-xs px-2 py-1 rounded-md",
                "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
                "hover:bg-[var(--accent-primary)]/20 transition-colors",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
              )}
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={onNextMonth}
          disabled={isCurrentMonth}
          className={cn(
            "p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors",
            "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
            "flex items-center justify-center",
            isCurrentMonth && "opacity-30 cursor-not-allowed"
          )}
        >
          <ChevronRight size={18} className="text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Grid */}
      <div ref={gridRef} className="overflow-x-auto pb-2">
        <div className="min-w-max">
          {/* Day-of-week letter row */}
          <div className="flex items-center gap-3 mb-0.5">
            <div className="w-28 sm:w-36 flex-shrink-0" />
            <div className="flex gap-1 items-center">
              {days.map((day) => (
                <div
                  key={`dow-${day.date}`}
                  className={cn(
                    "w-3.5 text-center text-[8px] leading-none select-none",
                    day.dayOfMonth % 7 === 0 && "ml-1",
                    day.isToday
                      ? "font-bold text-[var(--accent-primary)]"
                      : day.isWeekend
                        ? "text-[var(--text-muted)] opacity-50"
                        : "text-[var(--text-muted)]"
                  )}
                >
                  {DOW_LETTERS[day.dayOfWeek]}
                </div>
              ))}
            </div>
          </div>

          {/* Date number header row */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-28 sm:w-36 flex-shrink-0" />
            <div className="flex gap-1 items-center">
              {days.map((day) => (
                <div
                  key={`date-${day.date}`}
                  className={cn(
                    "w-3.5 text-center text-[9px] leading-none",
                    day.dayOfMonth % 7 === 0 && "ml-1",
                    day.isToday
                      ? "font-bold text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  )}
                >
                  {showDateLabel(day, daysInMonth) ? day.dayOfMonth : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Summary row (color intensity) */}
          <div className="flex items-center gap-3 pb-2 mb-1 border-b border-[var(--border-subtle)]">
            <div className="w-28 sm:w-36 flex-shrink-0">
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <span className="text-[var(--accent-primary)]">&#9679;</span> Summary
              </span>
            </div>
            <div className="flex gap-1 items-center">
              {days.map((day, idx) => (
                <div
                  key={`summary-${day.date}`}
                  className={cn(
                    day.dayOfMonth % 7 === 0 && "ml-1"
                  )}
                >
                  <div
                    className={cn(
                      "habit-grid-cell w-3.5 h-3.5 rounded-[2px]",
                      getSummaryColor(day.summaryPercent, day.isPerfect, day.isFuture),
                      day.isToday && "ring-1 ring-[var(--accent-primary)]",
                      day.isWeekend && !day.isToday && "ring-inset ring-[0.5px] ring-[var(--border-subtle)]"
                    )}
                    style={{ opacity: prefersReducedMotionHook ? 1 : 0 }}
                    onMouseEnter={(e) => !day.isFuture && showTooltip(idx, null, e)}
                    onMouseLeave={hideTooltip}
                    onTouchStart={(e) => !day.isFuture && showTooltip(idx, null, e)}
                    onTouchEnd={hideTooltip}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Habit rows */}
          {habits.map((habit) => (
            <div key={habit.id}>
              <div className="flex items-center gap-3 py-[3px] min-h-[44px] sm:min-h-0">
                {/* Habit name - sticky on mobile */}
                <button
                  onClick={() =>
                    setExpandedHabitId(expandedHabitId === habit.id ? null : habit.id)
                  }
                  className={cn(
                    "w-28 sm:w-36 flex-shrink-0 flex items-center gap-1.5 text-left",
                    "sticky left-0 z-10 bg-[var(--bg-card)]",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "hover:text-[var(--accent-primary)] transition-colors"
                  )}
                >
                  <span className="text-xs text-[var(--text-secondary)] truncate">
                    {habit.title}
                  </span>
                  {habit.current_streak > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-[var(--accent-streak)] flex-shrink-0">
                      <Flame size={10} />
                      {habit.current_streak}
                    </span>
                  )}
                </button>

                {/* Day cells — tight grid */}
                <div className="flex gap-1 items-center">
                  {days.map((day, dayIdx) => {
                    const cell = day.cells[habit.id];
                    if (!cell) return (
                      <div
                        key={day.date}
                        className={cn(
                          "w-3.5 h-3.5",
                          day.dayOfMonth % 7 === 0 && "ml-1"
                        )}
                      />
                    );

                    const canToggle = day.isToday && cell.status !== "inactive";

                    return (
                      <button
                        key={day.date}
                        disabled={!canToggle}
                        onClick={() => canToggle && onToggle(habit.id, day.date)}
                        onMouseEnter={(e) => showTooltip(dayIdx, habit.id, e)}
                        onMouseLeave={hideTooltip}
                        onTouchStart={(e) => {
                          if (!canToggle) showTooltip(dayIdx, habit.id, e);
                        }}
                        onTouchEnd={hideTooltip}
                        className={cn(
                          "habit-grid-cell w-3.5 h-3.5 rounded-[2px] transition-all duration-150",
                          // Completed: solid green square
                          cell.status === "completed" &&
                            "bg-[var(--accent-success)]",
                          // Missed (active but not done): amber fill — traffic-light semantics
                          cell.status === "active" && !day.isFuture &&
                            "bg-[var(--habit-missed)]",
                          // Active but future: empty with reduced opacity
                          cell.status === "active" && day.isFuture &&
                            "bg-[var(--heatmap-empty)] opacity-40",
                          // Not scheduled: standard empty
                          cell.status === "inactive" &&
                            "bg-[var(--heatmap-empty)]",
                          // Today accent ring
                          day.isToday && cell.status !== "inactive" &&
                            "ring-1 ring-[var(--accent-primary)]",
                          // Weekend distinction
                          day.isWeekend && !(day.isToday && cell.status !== "inactive") &&
                            "ring-inset ring-[0.5px] ring-[var(--border-subtle)]",
                          // Week separator
                          day.dayOfMonth % 7 === 0 && "ml-1",
                          // Interaction
                          canToggle &&
                            "cursor-pointer hover:scale-125 active:scale-95",
                          !canToggle && "cursor-default"
                        )}
                        style={{ opacity: prefersReducedMotionHook ? undefined : 0 }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Expanded detail panel */}
              <AnimatePresence>
                {expandedHabitId === habit.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="overflow-hidden"
                  >
                    {(() => {
                      const detail = getHabitDetail(habit.id);
                      if (!detail) return null;
                      return (
                        <div className="ml-28 sm:ml-36 my-1">
                          <div className="flex gap-5 bg-[var(--bg-elevated)] rounded-lg px-4 py-3 text-xs">
                            <div className="text-center">
                              <p className="font-mono font-bold text-[var(--accent-success)]">
                                {detail.rate}%
                              </p>
                              <p className="text-[var(--text-muted)]">rate</p>
                            </div>
                            <div className="text-center">
                              <p className="font-mono font-bold text-[var(--accent-streak)]">
                                {detail.streak}
                              </p>
                              <p className="text-[var(--text-muted)]">streak</p>
                            </div>
                            <div className="text-center">
                              <p className="font-mono font-bold text-[var(--accent-highlight)]">
                                {detail.longestStreak}
                              </p>
                              <p className="text-[var(--text-muted)]">best</p>
                            </div>
                            <div className="text-center">
                              <p className="font-mono font-bold text-[var(--text-secondary)]">
                                {detail.completed}/{detail.scheduled}
                              </p>
                              <p className="text-[var(--text-muted)]">this month</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Stats footer */}
      {gridStats.daysTracked > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 mt-4 mb-1 text-xs text-[var(--text-secondary)]">
          <span><span className="font-mono font-semibold text-[var(--text-primary)]">{gridStats.daysTracked}</span> days tracked</span>
          <span className="text-[var(--text-muted)]">&middot;</span>
          <span><span className="font-mono font-semibold text-[var(--accent-success)]">{gridStats.perfectCount}</span> perfect</span>
          <span className="text-[var(--text-muted)]">&middot;</span>
          <span><span className="font-mono font-semibold text-[var(--accent-streak)]">{gridStats.currentPerfectStreak}</span> streak now</span>
          <span className="text-[var(--text-muted)]">&middot;</span>
          <span>Best: <span className="font-mono font-semibold text-[var(--accent-highlight)]">{gridStats.bestPerfectStreak}</span></span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-xs text-[var(--text-muted)]">
        {/* Per-habit legend */}
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-[2px] bg-[var(--accent-success)]" />
          <span>Done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-[2px] bg-[var(--habit-missed)]" />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-[2px] bg-[var(--heatmap-empty)]" />
          <span>Not scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-[2px] bg-[var(--heatmap-empty)] opacity-40" />
          <span>Future</span>
        </div>

        {/* Summary scale */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px]">Less</span>
          <div className="w-3 h-3 rounded-[2px] bg-[var(--heatmap-empty)]" />
          <div className="w-3 h-3 rounded-[2px] bg-[var(--accent-success)]/30" />
          <div className="w-3 h-3 rounded-[2px] bg-[var(--accent-success)]/50" />
          <div className="w-3 h-3 rounded-[2px] bg-[var(--accent-success)]/70" />
          <div className="w-3 h-3 rounded-[2px] bg-[var(--accent-success)]" />
          <span className="text-[10px]">More</span>
        </div>
      </div>

      {/* Custom tooltip — fixed position escapes overflow-x-auto */}
      {tooltip.visible && days[tooltip.dayIdx] && (() => {
        const day = days[tooltip.dayIdx];
        const monthName = monthLabel.split(" ")[0];
        let content: string;

        if (tooltip.habitId === null) {
          // Summary cell
          content = `${day.dayName}, ${monthName} ${day.dayOfMonth} \u2014 ${day.completedCount}/${day.scheduledCount} habits (${Math.round(day.summaryPercent * 100)}%)${day.isPerfect ? " \u2014 Perfect day!" : ""}`;
        } else {
          // Habit cell
          const cell = day.cells[tooltip.habitId];
          const habit = habits.find((h) => h.id === tooltip.habitId);
          const statusLabel = cell?.status === "completed"
            ? "Done"
            : cell?.status === "active" && !day.isFuture
              ? "Missed"
              : cell?.status === "active" && day.isFuture
                ? "Upcoming"
                : "Not scheduled";
          content = `${day.dayName}, ${monthName} ${day.dayOfMonth} \u2014 ${habit?.title ?? ""} \u2014 ${statusLabel}`;
        }

        return (
          <div
            className={cn(
              "fixed z-50 pointer-events-none",
              "px-3 py-1.5 rounded-lg text-xs",
              "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
              "text-[var(--text-primary)] shadow-lg",
              "max-w-[260px] whitespace-nowrap"
            )}
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {content}
          </div>
        );
      })()}
    </div>
  );
}
