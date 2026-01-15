import { getWeekRange } from "@/app/lib/date-utils";
import WeekClient from "./WeekClient";

export default async function WeekPage() {
  // Authentication is handled by middleware (middleware.ts)
  const { start, end } = getWeekRange(new Date());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          This Week
        </h1>
        <div className="mt-2 h-[2px] w-24 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
        <p className="text-[var(--text-secondary)] text-sm mt-3 font-mono">
          {start} → {end}
        </p>
      </header>

      <WeekClient start={start} end={end} />
    </div>
  );
}
