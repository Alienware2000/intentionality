"use client";

// =============================================================================
// ACTIVITY HEATMAP COMPONENT
// GitHub-style activity grid showing daily activity levels.
// =============================================================================

import { useState, useMemo } from "react";
import { cn } from "@/app/lib/cn";

type Props = {
  data: Array<{ date: string; count: number }>;
};

export default function ActivityHeatmap({ data }: Props) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  // Calculate max activity for color scaling
  const maxActivity = Math.max(...data.map((d) => d.count), 1);

  // Get activity level (0-4) for color intensity
  function getActivityLevel(count: number): number {
    if (count === 0) return 0;
    const ratio = count / maxActivity;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

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

  // Group data by weeks for display (memoized to prevent recalc on each render)
  const weeks = useMemo(() => {
    const result: Array<Array<{ date: string; count: number }>> = [];
    let currentWeek: Array<{ date: string; count: number }> = [];

    for (const day of data) {
      const dayOfWeek = new Date(day.date).getDay();

      // Start new week on Sunday (day 0)
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        result.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(day);
    }

    // Push last week if it has data
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    // Pad first week with empty cells if needed
    if (result.length > 0) {
      const firstDayOfWeek = new Date(result[0][0].date).getDay();
      if (firstDayOfWeek > 0) {
        const padding = Array(firstDayOfWeek).fill({ date: "", count: -1 });
        result[0] = [...padding, ...result[0]];
      }
    }

    return result;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Heatmap Grid */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => {
              if (day.count === -1) {
                // Empty padding cell
                return <div key={dayIndex} className="w-3 h-3" />;
              }

              const level = getActivityLevel(day.count);
              return (
                <div
                  key={day.date}
                  className={cn(
                    "w-3 h-3 rounded-sm cursor-pointer transition-all",
                    getColor(level),
                    hoveredDay?.date === day.date && "ring-1 ring-[var(--text-primary)]"
                  )}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={`${formatDate(day.date)}: ${day.count} activities`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={cn("w-3 h-3 rounded-sm", getColor(level))}
              />
            ))}
          </div>
          <span>More</span>
        </div>

        {/* Tooltip */}
        {hoveredDay && (
          <div className="text-xs text-[var(--text-secondary)]">
            <span className="font-medium">{formatDate(hoveredDay.date)}</span>
            {": "}
            <span className="font-mono text-[var(--accent-success)]">
              {hoveredDay.count} {hoveredDay.count === 1 ? "activity" : "activities"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
