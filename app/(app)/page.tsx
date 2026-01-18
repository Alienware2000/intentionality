import QuickActions from "@/app/components/QuickActions";
import DashboardSync from "@/app/components/DashboardSync";
import DashboardContent from "@/app/components/DashboardContent";
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

      {/* Dashboard Content (client component for coordinated state updates) */}
      <DashboardContent date={today} />
    </div>
  );
}
