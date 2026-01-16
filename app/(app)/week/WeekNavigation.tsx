"use client";

// =============================================================================
// WEEK NAVIGATION COMPONENT
// Navigation controls for viewing different weeks in the Week view.
// =============================================================================

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { ISODateString } from "@/app/lib/types";
import { formatWeekRange, isCurrentWeek, addDaysISO } from "@/app/lib/date-utils";

type Props = {
  start: ISODateString;
  end: ISODateString;
  onNavigate: (weekStart: ISODateString | null) => void;
};

/**
 * WeekNavigation provides controls to navigate between weeks.
 * Shows previous/next buttons, a "Today" button when not on current week,
 * and displays the current week range.
 */
export default function WeekNavigation({ start, end, onNavigate }: Props) {
  const isCurrent = isCurrentWeek(start);

  function handlePrevious() {
    const prevWeekStart = addDaysISO(start, -7);
    onNavigate(prevWeekStart);
  }

  function handleNext() {
    const nextWeekStart = addDaysISO(start, 7);
    onNavigate(nextWeekStart);
  }

  function handleToday() {
    onNavigate(null); // null signals to return to current week
  }

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Week Range Display */}
      <span className="text-sm font-mono text-[var(--text-secondary)]">
        {formatWeekRange(start, end)}
      </span>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Week Button */}
        <button
          type="button"
          onClick={handlePrevious}
          className={cn(
            "flex items-center justify-center",
            "w-8 h-8 rounded-lg",
            "border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
            "transition-colors"
          )}
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Today Button - Only shown when not on current week */}
        {!isCurrent && (
          <button
            type="button"
            onClick={handleToday}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm",
              "border border-[var(--border-subtle)] bg-[var(--bg-card)]",
              "text-[var(--text-secondary)]",
              "hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
              "transition-colors"
            )}
          >
            Today
          </button>
        )}

        {/* Next Week Button */}
        <button
          type="button"
          onClick={handleNext}
          className={cn(
            "flex items-center justify-center",
            "w-8 h-8 rounded-lg",
            "border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
            "transition-colors"
          )}
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
