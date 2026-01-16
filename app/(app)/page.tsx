import TodayClient from "@/app/components/TodayClient";
import HabitsClient from "@/app/components/HabitsClient";
import DashboardStats from "@/app/components/DashboardStats";
import FocusLauncher from "@/app/components/FocusLauncher";
import QuickActions from "@/app/components/QuickActions";
import DashboardSync from "@/app/components/DashboardSync";
import { getTodayISO, formatDisplayDate } from "@/app/lib/date-utils";

export default async function Home() {
  // Authentication is handled by middleware (middleware.ts)
  const today = getTodayISO();
  const displayDate = formatDisplayDate(today);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header with date and quick actions */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
            Command Center
          </h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-sm text-[var(--text-muted)] font-mono">
              {displayDate}
            </p>
            <DashboardSync />
          </div>
          <div className="mt-2 h-[2px] w-32 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
        </div>
        <QuickActions />
      </header>

      {/* Stats Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
          Overview
        </h2>
        <DashboardStats date={today} />
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
          <HabitsClient date={today} />
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
          <span className="text-xs font-mono text-[var(--text-muted)]">{today}</span>
        </div>
        <TodayClient date={today} />
      </section>
    </div>
  );
}
