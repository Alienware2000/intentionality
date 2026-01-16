// =============================================================================
// USE AUTO-SYNC HOOK
// Automatically syncs Canvas and Google Calendar integrations on dashboard load.
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
    selected_courses?: string[];
    selected_calendars?: string[];
  } | null;
};

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

/**
 * Hook that manages automatic syncing of Canvas and Google Calendar.
 *
 * Features:
 * - Triggers sync on mount (respects cooldown)
 * - Triggers sync on window focus (respects cooldown + debounce)
 * - Tracks sync status for each integration
 * - Stores last sync timestamp in localStorage
 *
 * @returns AutoSyncState with current sync status for all integrations
 */
export function useAutoSync(): AutoSyncState {
  const [state, setState] = useState<AutoSyncState>({
    canvas: createDefaultStatus(),
    googleCalendar: createDefaultStatus(),
    isAnySyncing: false,
  });

  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // ---------------------------------------------------------------------------
  // Check connection status for both integrations
  // ---------------------------------------------------------------------------

  const checkConnections = useCallback(async () => {
    const [canvasRes, googleRes] = await Promise.allSettled([
      fetch("/api/integrations/canvas"),
      fetch("/api/calendar/google"),
    ]);

    const canvasData: ConnectionResponse | null =
      canvasRes.status === "fulfilled" && canvasRes.value.ok
        ? await canvasRes.value.json()
        : null;

    const googleData: ConnectionResponse | null =
      googleRes.status === "fulfilled" && googleRes.value.ok
        ? await googleRes.value.json()
        : null;

    return { canvasData, googleData };
  }, []);

  // ---------------------------------------------------------------------------
  // Sync a single integration
  // ---------------------------------------------------------------------------

  const syncIntegration = useCallback(
    async (
      type: "canvas" | "googleCalendar",
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
        [type]: { ...prev[type], syncing: true, error: null },
        isAnySyncing: true,
      }));

      try {
        const response = await fetch(endpoint, { method: "POST" });
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
      const { canvasData, googleData } = await checkConnections();

      if (!isMountedRef.current) return;

      // Update connection status
      const canvasConnected = canvasData?.connected ?? false;
      const googleConnected = googleData?.connected ?? false;

      const canvasHasSelection =
        canvasConnected &&
        (canvasData?.connection?.selected_courses?.length ?? 0) > 0;
      const googleHasSelection =
        googleConnected &&
        (googleData?.connection?.selected_calendars?.length ?? 0) > 0;

      // If nothing to sync, just update connection status
      if (!canvasHasSelection && !googleHasSelection) {
        setState({
          canvas: {
            connected: canvasConnected,
            syncing: false,
            lastSyncedAt: canvasData?.connection?.last_synced_at ?? null,
            error: null,
          },
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

      // Sync integrations in parallel
      const [canvasResult, googleResult] = await Promise.all([
        canvasHasSelection
          ? syncIntegration("canvas", "/api/integrations/canvas/sync", true)
          : Promise.resolve({
              connected: canvasConnected,
              syncing: false,
              lastSyncedAt: canvasData?.connection?.last_synced_at ?? null,
              error: null,
            } as IntegrationSyncStatus),
        googleHasSelection
          ? syncIntegration("googleCalendar", "/api/calendar/google/sync", true)
          : Promise.resolve({
              connected: googleConnected,
              syncing: false,
              lastSyncedAt: googleData?.connection?.last_synced_at ?? null,
              error: null,
            } as IntegrationSyncStatus),
      ]);

      if (!isMountedRef.current) return;

      setState({
        canvas: canvasResult,
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
