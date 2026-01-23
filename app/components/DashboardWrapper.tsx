// =============================================================================
// DASHBOARD WRAPPER
// Client component that provides dynamic date handling with midnight auto-refresh.
// Wraps DashboardContent to ensure the date stays current.
// =============================================================================

"use client";

import { useCurrentDate } from "@/app/lib/hooks/useCurrentDate";
import { formatDisplayDate } from "@/app/lib/date-utils";
import QuickActions from "./QuickActions";
import DashboardSync from "./DashboardSync";
import DashboardContent from "./DashboardContent";

/**
 * Client-side wrapper for the dashboard that handles dynamic date updates.
 * Uses useCurrentDate hook to automatically update at midnight.
 */
export default function DashboardWrapper() {
  const today = useCurrentDate();
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
          <div className="mt-2 h-[2px] w-24 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
        </div>
        <QuickActions />
      </header>

      {/* Dashboard Content (client component for coordinated state updates) */}
      <DashboardContent date={today} />
    </div>
  );
}
