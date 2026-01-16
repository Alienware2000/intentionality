"use client";

// =============================================================================
// WEEK PAGE
// Weekly view showing tasks and schedule blocks for any week.
// Supports URL-based navigation: /week?week=2026-01-20
// =============================================================================

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { getWeekRange, getWeekRangeFromISO } from "@/app/lib/date-utils";
import type { ISODateString } from "@/app/lib/types";
import WeekClient from "./WeekClient";
import WeekNavigation from "./WeekNavigation";

export default function WeekPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get week from URL param, or default to current week
  const weekParam = searchParams.get("week") as ISODateString | null;

  const { start, end } = useMemo(() => {
    if (weekParam) {
      // Validate and get the week range for the given date
      // getWeekRangeFromISO will normalize any date to its week's Monday-Sunday
      return getWeekRangeFromISO(weekParam);
    }
    return getWeekRange(new Date());
  }, [weekParam]);

  function handleNavigate(weekStart: ISODateString | null) {
    if (weekStart === null) {
      // Return to current week - clean URL
      router.push("/week");
    } else {
      router.push(`/week?week=${weekStart}`);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Week View
        </h1>
        <div className="mt-2 h-[2px] w-24 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
      </header>

      {/* Week Navigation */}
      <WeekNavigation start={start} end={end} onNavigate={handleNavigate} />

      {/* Week Content - key forces remount on week change */}
      <WeekClient key={start} start={start} end={end} />
    </div>
  );
}
