import TodayClient from "@/app/components/TodayClient";
import HabitsClient from "@/app/components/HabitsClient";
import DashboardStats from "@/app/components/DashboardStats";
import FocusLauncher from "@/app/components/FocusLauncher";
import { getTodayISO } from "@/app/lib/date-utils";

export default async function Home() {
  // Authentication is handled by middleware (middleware.ts)
  const today = getTodayISO();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Command Center
        </h1>
        <div className="mt-2 h-[2px] w-32 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
      </header>

      {/* Stats Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
          Stats
        </h2>
        <DashboardStats date={today} />
      </section>

      {/* Focus Session */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
          Focus
        </h2>
        <FocusLauncher />
      </section>

      {/* Divider */}
      <div className="h-px bg-[var(--border-subtle)]" />

      {/* Two-column layout for habits and timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Habits Section */}
        <section>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
            Daily Habits
          </h2>
          <HabitsClient date={today} />
        </section>

        {/* Today's Timeline Section (unified tasks + schedule) */}
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
    </div>
  );
}
