"use client";

// =============================================================================
// GOOGLE CALENDAR CARD
// Manages Google Calendar OAuth connection and sync settings.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Link2,
  Link2Off,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import type { Quest, CalendarImportMode } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GoogleCalendar = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
};

type ConnectionStatus = {
  ok: true;
  connected: boolean;
  isConfigured: boolean;
  connection: {
    id: string;
    email: string | null;
    selected_calendars: string[];
    import_as: CalendarImportMode;
    target_quest_id: string | null;
    last_synced_at: string | null;
  } | null;
};

type CalendarsResponse = {
  ok: true;
  calendars: GoogleCalendar[];
  selectedCalendars: string[];
  importAs: CalendarImportMode;
  targetQuestId: string | null;
};

type SyncResult = {
  tasksCreated: number;
  tasksUpdated: number;
  scheduleBlocksCreated: number;
  scheduleBlocksUpdated: number;
  eventsProcessed: number;
  calendarsProcessed: number;
  errors: string[];
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function GoogleCalendarCard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connection, setConnection] = useState<ConnectionStatus["connection"]>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [importAs, setImportAs] = useState<CalendarImportMode>("smart");
  const [targetQuestId, setTargetQuestId] = useState<string>("");

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [statusData, questsData] = await Promise.all([
        fetchApi<ConnectionStatus>("/api/calendar/google"),
        fetchApi<{ ok: true; quests: Quest[] }>("/api/quests"),
      ]);

      setConnected(statusData.connected);
      setIsConfigured(statusData.isConfigured);
      setConnection(statusData.connection);
      setQuests(questsData.quests);

      if (statusData.connected) {
        // Load calendars
        const calData = await fetchApi<CalendarsResponse>("/api/calendar/google/calendars");
        setCalendars(calData.calendars);
        setSelectedCalendars(calData.selectedCalendars);
        setImportAs(calData.importAs);
        setTargetQuestId(calData.targetQuestId ?? "");
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);

    try {
      const { authUrl } = await fetchApi<{ ok: true; authUrl: string }>("/api/calendar/google/auth");
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (e) {
      setError(getErrorMessage(e));
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await fetchApi("/api/calendar/google", { method: "DELETE" });
      setConnected(false);
      setConnection(null);
      setCalendars([]);
      setSelectedCalendars([]);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleToggleCalendar(calendarId: string) {
    const newSelected = selectedCalendars.includes(calendarId)
      ? selectedCalendars.filter((id) => id !== calendarId)
      : [...selectedCalendars, calendarId];

    setSelectedCalendars(newSelected);

    try {
      await fetchApi("/api/calendar/google/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCalendars: newSelected }),
      });
    } catch (e) {
      setSelectedCalendars(selectedCalendars);
      setError(getErrorMessage(e));
    }
  }

  async function handleUpdateSettings() {
    try {
      await fetchApi("/api/calendar/google/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importAs, targetQuestId: targetQuestId || null }),
      });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      // Get the user's timezone from the browser
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const result = await fetchApi<SyncResult>("/api/calendar/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      setSyncResult(result);
      await loadData();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSyncing(false);
    }
  }

  function formatLastSynced(dateString: string | null): string {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="h-32 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
    );
  }

  return (
    <div className={cn(
      "rounded-xl bg-[var(--bg-card)] glass-card border border-[var(--border-subtle)]",
      "overflow-hidden"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              connected
                ? "bg-[var(--accent-success)]/10"
                : "bg-[var(--bg-hover)]"
            )}>
              <Calendar
                size={20}
                className={connected ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"}
              />
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">
                Google Calendar
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {connected
                  ? `Connected as ${connection?.email ?? "Unknown"}`
                  : "Sync events from Google Calendar"}
              </p>
            </div>
          </div>

          {connected ? (
            <button
              onClick={handleDisconnect}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium",
                "text-[var(--text-muted)] hover:text-[var(--priority-high)]",
                "hover:bg-[var(--bg-hover)] transition-colors"
              )}
            >
              <Link2Off size={14} />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting || !isConfigured}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium",
                "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
                "hover:bg-[var(--accent-primary)]/20 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Link2 size={14} />
              {connecting ? "Connecting..." : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* Not Configured Warning */}
      {!isConfigured && !connected && (
        <div className="p-4 bg-[var(--bg-hover)] border-b border-[var(--border-subtle)]">
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-secondary)]">Setup Required:</span>{" "}
            Google OAuth requires configuration. Add <code className="text-xs bg-[var(--bg-elevated)] px-1 py-0.5 rounded">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="text-xs bg-[var(--bg-elevated)] px-1 py-0.5 rounded">GOOGLE_CLIENT_SECRET</code> to your <code className="text-xs bg-[var(--bg-elevated)] px-1 py-0.5 rounded">.env.local</code>.
          </p>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-[var(--accent-primary)] hover:underline"
          >
            Google Cloud Console
            <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-[var(--priority-high)]/10 border-b border-[var(--priority-high)]/20">
          <div className="flex items-center gap-2 text-sm text-[var(--priority-high)]">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}

      {/* Connected State */}
      {connected && (
        <div className="p-4 space-y-4">
          {/* Calendar Selection */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
              Calendars to Sync
            </h4>
            {calendars.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No calendars found.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {calendars.map((cal) => {
                  const isSelected = selectedCalendars.includes(cal.id);
                  return (
                    <button
                      key={cal.id}
                      onClick={() => handleToggleCalendar(cal.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded",
                        "text-left transition-colors",
                        isSelected
                          ? "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30"
                          : "bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--border-default)]"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded flex items-center justify-center",
                        isSelected
                          ? "bg-[var(--accent-primary)]"
                          : "bg-[var(--bg-hover)] border border-[var(--border-default)]"
                      )}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {cal.backgroundColor && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cal.backgroundColor }}
                            />
                          )}
                          <p className="text-sm text-[var(--text-primary)] truncate">
                            {cal.summary}
                          </p>
                          {cal.primary && (
                            <span className="text-[10px] text-[var(--text-muted)]">(Primary)</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Import Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Import As
              </label>
              <select
                value={importAs}
                onChange={(e) => {
                  setImportAs(e.target.value as CalendarImportMode);
                  handleUpdateSettings();
                }}
                className={cn(
                  "w-full px-3 py-2 rounded text-sm",
                  "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                  "text-[var(--text-primary)]",
                  "focus:outline-none focus:border-[var(--accent-primary)]"
                )}
              >
                <option value="smart">Smart (auto-detect)</option>
                <option value="tasks">Tasks</option>
                <option value="schedule">Schedule Blocks</option>
              </select>
            </div>

            {(importAs === "tasks" || importAs === "smart") && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Add Tasks To Quest
                </label>
                <select
                  value={targetQuestId}
                  onChange={(e) => {
                    setTargetQuestId(e.target.value);
                    handleUpdateSettings();
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded text-sm",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                >
                  <option value="">Default Quest</option>
                  {quests.map((q) => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sync Button */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)]">
              Last synced: {formatLastSynced(connection?.last_synced_at ?? null)}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || selectedCalendars.length === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded",
                "bg-[var(--accent-primary)] text-white",
                "hover:bg-[var(--accent-primary)]/80 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>

          {/* Sync Result */}
          <AnimatePresence>
            {syncResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 rounded bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20"
              >
                <div className="flex items-center gap-2 text-sm text-[var(--accent-success)]">
                  <Check size={14} />
                  Synced {syncResult.calendarsProcessed} calendar{syncResult.calendarsProcessed !== 1 ? "s" : ""}.
                  {syncResult.eventsProcessed > 0 && ` ${syncResult.eventsProcessed} events processed.`}
                  {syncResult.tasksCreated > 0 && ` ${syncResult.tasksCreated} tasks created.`}
                  {syncResult.scheduleBlocksCreated > 0 && ` ${syncResult.scheduleBlocksCreated} blocks created.`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
