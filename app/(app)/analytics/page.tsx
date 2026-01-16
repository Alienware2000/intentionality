import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Analytics
        </h1>
        <div className="mt-2 h-[2px] w-20 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Track your progress and visualize your productivity.
        </p>
      </header>

      <AnalyticsClient />
    </div>
  );
}
