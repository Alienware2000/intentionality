// =============================================================================
// USE AUTO-SYNC HOOK
// Automatically syncs Google Calendar integration on dashboard load.
// Implements cooldown logic to prevent excessive API calls.
// =============================================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AutoSyncState, IntegrationSyncStatus } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Cooldown period between syncs (15 minutes) */
const SYNC_COOLDOWN_MS = 15 * 60 * 1000;

/** Debounce delay for window focus events */
const FOCUS_DEBOUNCE_MS = 2000;

/** LocalStorage key for last sync timestamp */
const LAST_SYNC_KEY = "intentionality_last_sync";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ConnectionResponse = {
  ok: boolean;
  connected: boolean;
  connection?: {
    last_synced_at: string | null;
    selected_calendars?: string[];
  } | null;
};

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

/**
 * Hook that manages automatic syncing of Google Calendar.
 *
 * Features:
 * - Triggers sync on mount (respects cooldown)
 * - Triggers sync on window focus (respects cooldown + debounce)
 * - Tracks sync status for the integration
 * - Stores last sync timestamp in localStorage
 *
 * @returns AutoSyncState with current sync status
 */
export function useAutoSync(): AutoSyncState {
  const [state, setState] = useState<AutoSyncState>({
    googleCalendar: createDefaultStatus(),
    isAnySyncing: false,
  });

  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ---------------------------------------------------------------------------
  // Check connection status for Google Calendar
  // ---------------------------------------------------------------------------

  const checkConnections = useCallback(async () => {
    const googleRes = await fetch("/api/calendar/google").catch(() => null);

    const googleData: ConnectionResponse | null =
      googleRes && googleRes.ok ? await googleRes.json() : null;

    return { googleData };
  }, []);

  // ---------------------------------------------------------------------------
  // Sync Google Calendar
  // ---------------------------------------------------------------------------

  const syncIntegration = useCallback(
    async (
      endpoint: string,
      hasSelection: boolean
    ): Promise<IntegrationSyncStatus> => {
      if (!hasSelection) {
        return {
          connected: true,
          syncing: false,
          lastSyncedAt: null,
          error: null,
        };
      }

      // Update state to show syncing
      setState((prev) => ({
        ...prev,
        googleCalendar: { ...prev.googleCalendar, syncing: true, error: null },
        isAnySyncing: true,
      }));

      try {
        // Pass timezone for Google Calendar sync to ensure correct event times
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          return {
            connected: true,
            syncing: false,
            lastSyncedAt: null,
            error: data.error || "Sync failed",
          };
        }

        return {
          connected: true,
          syncing: false,
          lastSyncedAt: new Date().toISOString(),
          error: null,
        };
      } catch {
        return {
          connected: true,
          syncing: false,
          lastSyncedAt: null,
          error: "Network error during sync",
        };
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Main sync function
  // ---------------------------------------------------------------------------

  const performSync = useCallback(
    async (force = false) => {
      // Check cooldown (unless forced)
      if (!force) {
        const lastSync = localStorage.getItem(LAST_SYNC_KEY);
        if (lastSync) {
          const elapsed = Date.now() - parseInt(lastSync, 10);
          if (elapsed < SYNC_COOLDOWN_MS) {
            return;
          }
        }
      }

      // Check connections
      const { googleData } = await checkConnections();

      if (!isMountedRef.current) return;

      // Update connection status
      const googleConnected = googleData?.connected ?? false;

      const googleHasSelection =
        googleConnected &&
        (googleData?.connection?.selected_calendars?.length ?? 0) > 0;

      // If nothing to sync, just update connection status
      if (!googleHasSelection) {
        setState({
          googleCalendar: {
            connected: googleConnected,
            syncing: false,
            lastSyncedAt: googleData?.connection?.last_synced_at ?? null,
            error: null,
          },
          isAnySyncing: false,
        });
        return;
      }

      // Record sync attempt timestamp
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

      // Sync Google Calendar
      const googleResult = await syncIntegration(
        "/api/calendar/google/sync",
        true
      );

      if (!isMountedRef.current) return;

      setState({
        googleCalendar: googleResult,
        isAnySyncing: false,
      });
    },
    [checkConnections, syncIntegration]
  );

  // ---------------------------------------------------------------------------
  // Handle window focus with debounce
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleFocus = () => {
      // Clear any pending focus timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }

      // Debounce the sync to prevent rapid triggers
      focusTimeoutRef.current = setTimeout(() => {
        performSync();
      }, FOCUS_DEBOUNCE_MS);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [performSync]);

  // ---------------------------------------------------------------------------
  // Initial sync on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    isMountedRef.current = true;

    // Use requestAnimationFrame to defer sync to after render
    // This avoids the lint warning about setState in effects
    const rafId = requestAnimationFrame(() => {
      performSync();
    });

    return () => {
      isMountedRef.current = false;
      cancelAnimationFrame(rafId);
    };
  }, [performSync]);

  return state;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function createDefaultStatus(): IntegrationSyncStatus {
  return {
    connected: false,
    syncing: false,
    lastSyncedAt: null,
    error: null,
  };
}
