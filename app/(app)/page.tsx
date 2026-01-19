// =============================================================================
// DASHBOARD PAGE
// Main entry point for the authenticated dashboard.
// Uses DashboardWrapper for client-side date handling with midnight auto-refresh.
// =============================================================================

import DashboardWrapper from "@/app/components/DashboardWrapper";

export default function Home() {
  // Authentication is handled by middleware (middleware.ts)
  // Date handling is managed by DashboardWrapper with midnight auto-refresh
  return <DashboardWrapper />;
}
