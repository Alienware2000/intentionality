import { Suspense } from "react";
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

      <Suspense fallback={
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
            ))}
          </div>
          <div className="h-64 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
        </div>
      }>
        <AnalyticsClient />
      </Suspense>
    </div>
  );
}
