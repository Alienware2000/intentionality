import TodayClient from "@/app/components/TodayClient";
import DashboardStats from "@/app/components/DashboardStats";
import { getTodayISO } from "@/app/lib/date-utils";

export default async function Home() {
  // Authentication is handled by middleware (middleware.ts)
  const today = getTodayISO();

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Command Center
        </h1>
        <div className="mt-2 h-[2px] w-32 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
      </header>

      {/* Stats Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Stats
        </h2>
        <DashboardStats date={today} />
      </section>

      {/* Divider */}
      <div className="h-px bg-[var(--border-subtle)]" />

      {/* Today Section */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Today
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">{today}</span>
        </div>

        <TodayClient date={today} />
      </section>
    </div>
  );
}
