// =============================================================================
// USE CURRENT DATE HOOK
// Provides current date and auto-updates at midnight.
// Solves the issue of server-rendered dates becoming stale.
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { getTodayISO } from "@/app/lib/date-utils";
import type { ISODateString } from "@/app/lib/types";

/**
 * Hook that provides current date and auto-updates at midnight.
 * Solves the issue of server-rendered dates becoming stale.
 *
 * @returns Current date in ISO format (YYYY-MM-DD)
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const today = useCurrentDate();
 *   return <DayTimeline date={today} />;
 * }
 * ```
 */
export function useCurrentDate(): ISODateString {
  const [date, setDate] = useState<ISODateString>(getTodayISO());

  useEffect(() => {
    // Intentional: correct stale server-rendered date on hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(getTodayISO());

    // Calculate ms until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // Set timeout for midnight, then interval for subsequent days
    const midnightTimeout = setTimeout(() => {
      setDate(getTodayISO());

      // Set up daily interval after first midnight
      const dailyInterval = setInterval(() => {
        setDate(getTodayISO());
      }, 24 * 60 * 60 * 1000);

      // Cleanup daily interval when component unmounts
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, []);

  return date;
}
