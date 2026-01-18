"use client";

// =============================================================================
// DASHBOARD CONTENT COMPONENT
// Client wrapper for dashboard that coordinates state updates between
// DashboardStats and TodayClient when tasks/habits are modified.
// =============================================================================

import { useState, useCallback } from "react";
import TodayClient from "./TodayClient";
import HabitsClient from "./HabitsClient";
import DashboardStats from "./DashboardStats";
import FocusLauncher from "./FocusLauncher";
import type { ISODateString } from "@/app/lib/types";

type Props = {
  date: ISODateString;
};

export default function DashboardContent({ date }: Props) {
  const [statsTrigger, setStatsTrigger] = useState(0);

  const refreshStats = useCallback(() => {
    setStatsTrigger((k) => k + 1);
  }, []);

  return (
    <>
      {/* Stats Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
          Overview
        </h2>
        <DashboardStats date={date} refreshTrigger={statsTrigger} />
      </section>

      {/* Focus + Habits row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Session */}
        <section>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
            Focus
          </h2>
          <FocusLauncher />
        </section>

        {/* Daily Habits Section */}
        <section>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
            Daily Habits
          </h2>
          <HabitsClient date={date} onHabitToggle={refreshStats} />
        </section>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-subtle)]" />

      {/* Today's Timeline Section (full width) */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Today&apos;s Timeline
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">{date}</span>
        </div>
        <TodayClient date={date} onTaskAction={refreshStats} />
      </section>
    </>
  );
}
