import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Analytics
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Track your progress and visualize your productivity.
        </p>
      </header>

      <AnalyticsClient />
    </div>
  );
}
