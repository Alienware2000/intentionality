// =============================================================================
// DASHBOARD SYNC COMPONENT
// Client component that manages auto-sync and displays sync status.
// Used in the dashboard header to show sync progress for integrations.
// =============================================================================

"use client";

import { useAutoSync } from "@/app/hooks/useAutoSync";
import SyncStatusIndicator from "./SyncStatusIndicator";

/**
 * DashboardSync handles automatic syncing of Canvas and Google Calendar
 * and displays the current sync status in the dashboard header.
 */
export default function DashboardSync() {
  const syncState = useAutoSync();

  return <SyncStatusIndicator state={syncState} />;
}
