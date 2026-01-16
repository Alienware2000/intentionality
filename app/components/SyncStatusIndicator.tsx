// =============================================================================
// SYNC STATUS INDICATOR COMPONENT
// Shows the current sync status for Canvas and Google Calendar integrations.
// Displays syncing animation, last sync time, or error state.
// =============================================================================

"use client";

import { Cloud, RefreshCw, AlertTriangle, Check } from "lucide-react";
import type { AutoSyncState } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SyncStatusIndicatorProps = {
  state: AutoSyncState;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * SyncStatusIndicator displays the current sync status for integrations.
 *
 * States:
 * - Syncing: spinning icon + "Syncing..."
 * - Success: cloud icon + "Synced X ago"
 * - Error: warning icon + "Sync error" (tooltip shows details)
 * - Hidden: no connected integrations
 */
export default function SyncStatusIndicator({ state }: SyncStatusIndicatorProps) {
  const { canvas, googleCalendar, isAnySyncing } = state;

  // Don't show if no integrations are connected
  if (!canvas.connected && !googleCalendar.connected) {
    return null;
  }

  // Check for any errors
  const hasError = canvas.error || googleCalendar.error;
  const errorMessage = [canvas.error, googleCalendar.error]
    .filter(Boolean)
    .join("; ");

  // Get the most recent sync time
  const lastSyncedAt = getLatestSyncTime(
    canvas.lastSyncedAt,
    googleCalendar.lastSyncedAt
  );

  // Determine display state
  if (isAnySyncing) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <RefreshCw
          size={14}
          className="animate-spin text-[var(--accent-primary)]"
        />
        <span className="text-xs font-mono">Syncing...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className="flex items-center gap-2 text-[var(--priority-high)] cursor-help"
        title={errorMessage}
      >
        <AlertTriangle size={14} />
        <span className="text-xs font-mono">Sync error</span>
      </div>
    );
  }

  if (lastSyncedAt) {
    const timeAgo = formatTimeAgo(lastSyncedAt);
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Cloud size={14} className="text-[var(--accent-success)]" />
        <span className="text-xs font-mono">Synced {timeAgo}</span>
      </div>
    );
  }

  // Connected but never synced (or no items to sync)
  return (
    <div className="flex items-center gap-2 text-[var(--text-muted)]">
      <Check size={14} className="text-[var(--text-muted)]" />
      <span className="text-xs font-mono">Connected</span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Returns the more recent of two sync timestamps.
 */
function getLatestSyncTime(
  time1: string | null,
  time2: string | null
): string | null {
  if (!time1 && !time2) return null;
  if (!time1) return time2;
  if (!time2) return time1;

  const date1 = new Date(time1);
  const date2 = new Date(time2);
  return date1 > date2 ? time1 : time2;
}

/**
 * Formats a timestamp as a human-readable "time ago" string.
 * Examples: "just now", "2m ago", "1h ago", "5h ago"
 */
function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return "just now";
  }

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }

  // More than 24 hours - show date
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
