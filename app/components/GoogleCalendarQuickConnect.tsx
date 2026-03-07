"use client";

// =============================================================================
// GOOGLE CALENDAR QUICK CONNECT
// Single-button component for the weekly view header that handles all Google
// Calendar states: not connected, connected (idle/syncing/feedback).
// Popover shows calendar selection, sync CTA, and account info.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  RefreshCw,
  Check,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ConnectionStatus = {
  connected: boolean;
  isConfigured: boolean;
  connection: {
    email: string | null;
    selected_calendars: string[];
    last_synced_at: string | null;
  } | null;
};

type GoogleCalendar = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
};

type CalendarsResponse = {
  calendars: GoogleCalendar[];
  selectedCalendars: string[];
  importAs: string;
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

type Props = {
  onSyncComplete?: () => void;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildSyncSummary(result: SyncResult): string {
  const parts: string[] = [];
  if (result.scheduleBlocksCreated > 0)
    parts.push(`${result.scheduleBlocksCreated} schedule block${result.scheduleBlocksCreated !== 1 ? "s" : ""} created`);
  if (result.scheduleBlocksUpdated > 0)
    parts.push(`${result.scheduleBlocksUpdated} schedule block${result.scheduleBlocksUpdated !== 1 ? "s" : ""} updated`);
  if (result.tasksCreated > 0)
    parts.push(`${result.tasksCreated} task${result.tasksCreated !== 1 ? "s" : ""} created`);
  if (result.tasksUpdated > 0)
    parts.push(`${result.tasksUpdated} task${result.tasksUpdated !== 1 ? "s" : ""} updated`);
  return parts.length > 0 ? parts.join(", ") : "Everything is up to date";
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function GoogleCalendarQuickConnect({ onSyncComplete }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Feedback state
  const [buttonFeedback, setButtonFeedback] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [detailToast, setDetailToast] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Popover state
  const [isOpen, setIsOpen] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [calendarsError, setCalendarsError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Floating UI setup
  // ---------------------------------------------------------------------------

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    strategy: "fixed",
    transform: false,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const checkStatus = useCallback(async () => {
    try {
      const data = await fetchApi<ConnectionStatus>("/api/calendar/google");
      setStatus(data);
      return data;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendars = useCallback(async () => {
    setCalendarsLoading(true);
    setCalendarsError(null);
    try {
      const data = await fetchApi<CalendarsResponse>(
        "/api/calendar/google/calendars"
      );
      setCalendars(data.calendars);
      setSelectedCalendars(data.selectedCalendars);

      // Auto-select primary calendar if nothing selected yet
      if (data.selectedCalendars.length === 0) {
        const primary = data.calendars.find((c) => c.primary);
        if (primary) {
          const initial = [primary.id];
          setSelectedCalendars(initial);
          await fetchApi("/api/calendar/google/calendars", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedCalendars: initial }),
          });
        }
      }

      return data;
    } catch (e) {
      setCalendarsError(getErrorMessage(e));
      return null;
    } finally {
      setCalendarsLoading(false);
    }
  }, []);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Detect ?google=connected after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") !== "connected") return;

    // Clean URL param
    const url = new URL(window.location.href);
    url.searchParams.delete("google");
    window.history.replaceState({}, "", url.pathname + url.search);

    // Refresh status, then auto-open popover
    (async () => {
      const data = await checkStatus();
      if (!data?.connected) return;

      await fetchCalendars();
      setIsOpen(true);
    })();
  }, [checkStatus, fetchCalendars]);

  // Fetch calendars when popover opens (if not already loaded)
  useEffect(() => {
    if (isOpen && calendars.length === 0 && !calendarsLoading) {
      fetchCalendars();
    }
  }, [isOpen, calendars.length, calendarsLoading, fetchCalendars]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleConnect() {
    setConnecting(true);
    try {
      const data = await fetchApi<{ ok: true; authUrl: string }>(
        "/api/calendar/google/auth?returnTo=/week"
      );
      window.location.href = data.authUrl;
    } catch {
      setConnecting(false);
    }
  }

  async function handleToggleCalendar(calendarId: string) {
    const wasSelected = selectedCalendars.includes(calendarId);
    const next = wasSelected
      ? selectedCalendars.filter((id) => id !== calendarId)
      : [...selectedCalendars, calendarId];

    const prev = selectedCalendars;
    setSelectedCalendars(next);

    try {
      await fetchApi("/api/calendar/google/calendars", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCalendars: next }),
      });
    } catch {
      setSelectedCalendars(prev);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setIsOpen(false);
    setButtonFeedback(null);
    setDetailToast(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await fetchApi<SyncResult>("/api/calendar/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      const total =
        result.tasksCreated +
        result.tasksUpdated +
        result.scheduleBlocksCreated +
        result.scheduleBlocksUpdated;

      // Phase A: button feedback (3s)
      setButtonFeedback({
        text: total > 0 ? `Synced ${total} event${total !== 1 ? "s" : ""}` : "Up to date",
        type: "success",
      });

      // Phase B: detail toast (6s) — only if there's meaningful detail
      const summary = buildSyncSummary(result);
      if (total > 0) {
        setDetailToast({ text: summary, type: "success" });
        setTimeout(() => setDetailToast(null), 6000);
      }

      onSyncComplete?.();
      await checkStatus();
    } catch (e) {
      const msg = getErrorMessage(e);
      setButtonFeedback({ text: "Sync failed", type: "error" });
      setDetailToast({ text: msg, type: "error" });
      setTimeout(() => setDetailToast(null), 6000);
    } finally {
      setSyncing(false);
      setTimeout(() => setButtonFeedback(null), 3000);
    }
  }

  // ---------------------------------------------------------------------------
  // Render: Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="h-[44px] w-[180px] animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
    );
  }

  // Not configured or no status — render nothing
  if (!status || !status.isConfigured) return null;

  // ---------------------------------------------------------------------------
  // Render: Not connected
  // ---------------------------------------------------------------------------

  if (!status.connected) {
    return (
      <motion.button
        onClick={handleConnect}
        disabled={connecting}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-2",
          "rounded-xl glass-card",
          "border border-[#4285F4]/20 bg-[#4285F4]/5",
          "px-4 py-3 text-sm",
          "hover:bg-[#4285F4]/10 hover:border-[#4285F4]/40",
          "transition-all duration-200",
          "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
          "[touch-action:manipulation]",
          "[-webkit-tap-highlight-color:transparent]",
          connecting && "opacity-70 pointer-events-none"
        )}
      >
        <div className="p-1.5 rounded-lg bg-[#4285F4]/10">
          <Calendar size={14} className="text-[#4285F4]" />
        </div>
        <span className="text-[#4285F4]">
          {connecting ? "Connecting..." : "Sync Google Calendar"}
        </span>
      </motion.button>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Connected
  // ---------------------------------------------------------------------------

  const animateY = context.placement?.startsWith("top") ? 4 : -4;
  const selectedCount = selectedCalendars.length;

  // Determine button content based on state
  const renderButtonContent = () => {
    // Syncing state
    if (syncing) {
      return (
        <>
          <div className="p-1.5 rounded-lg bg-[var(--text-muted)]/10">
            <RefreshCw size={14} className="animate-spin text-[var(--text-muted)]" />
          </div>
          <span className="text-[var(--text-secondary)]">Syncing...</span>
        </>
      );
    }

    // Feedback state (after sync completes)
    if (buttonFeedback) {
      const isError = buttonFeedback.type === "error";
      return (
        <>
          <div className={cn("p-1.5 rounded-lg", isError ? "bg-red-500/10" : "bg-[var(--accent-success)]/10")}>
            {isError ? (
              <AlertCircle size={14} className="text-red-500" />
            ) : (
              <CheckCircle size={14} className="text-[var(--accent-success)]" />
            )}
          </div>
          <span className={isError ? "text-red-500" : "text-[var(--accent-success)]"}>
            {buttonFeedback.text}
          </span>
        </>
      );
    }

    // Idle state with hover crossfade
    return (
      <>
        <div className="p-1.5 rounded-lg bg-[var(--accent-success)]/10">
          <div className="relative w-[14px] h-[14px]">
            <CheckCircle
              size={14}
              className={cn(
                "absolute inset-0 text-[var(--accent-success)] transition-opacity duration-200",
                "group-hover:opacity-0"
              )}
            />
            <RefreshCw
              size={14}
              className={cn(
                "absolute inset-0 text-[var(--text-secondary)] transition-opacity duration-200",
                "opacity-0 group-hover:opacity-100"
              )}
            />
          </div>
        </div>
        <span className="relative">
          <span className="text-[var(--text-secondary)] transition-opacity duration-200 group-hover:opacity-0">
            Calendar Synced
          </span>
          <span className="absolute inset-0 text-[var(--text-secondary)] transition-opacity duration-200 opacity-0 group-hover:opacity-100">
            Sync Now
          </span>
        </span>
      </>
    );
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {/* Single connected button */}
        <motion.button
          // eslint-disable-next-line react-hooks/refs -- Floating UI ref callback
          ref={refs.setReference}
          {...getReferenceProps()}
          disabled={syncing}
          whileHover={syncing ? undefined : { scale: 1.02 }}
          whileTap={syncing ? undefined : { scale: 0.98 }}
          className={cn(
            "group flex items-center gap-2",
            "rounded-xl glass-card",
            "border bg-[var(--bg-card)]",
            "px-4 py-3 text-sm",
            "transition-all duration-200",
            "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
            "[touch-action:manipulation]",
            "[-webkit-tap-highlight-color:transparent]",
            // Default: green tint for "synced"
            !syncing && !buttonFeedback &&
              "border-[var(--accent-success)]/20 bg-[var(--accent-success)]/5 hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]",
            // Syncing: neutral
            syncing && "border-[var(--border-subtle)] pointer-events-none opacity-70",
            // Feedback: success green or error red
            buttonFeedback?.type === "success" &&
              "border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5",
            buttonFeedback?.type === "error" &&
              "border-red-500/30 bg-red-500/5"
          )}
        >
          {renderButtonContent()}
        </motion.button>
      </div>

      {/* Detail toast — positioned below the button */}
      <AnimatePresence>
        {detailToast && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-0 mt-2 z-50",
              "rounded-lg glass-card border shadow-lg",
              "px-3 py-2 text-xs",
              "flex items-center gap-2 whitespace-nowrap",
              detailToast.type === "success"
                ? "border-[var(--accent-success)]/20 bg-[var(--bg-card)] text-[var(--text-secondary)]"
                : "border-red-500/20 bg-[var(--bg-card)] text-red-500"
            )}
          >
            {detailToast.type === "success" ? (
              <CheckCircle size={12} className="text-[var(--accent-success)] shrink-0" />
            ) : (
              <AlertCircle size={12} className="text-red-500 shrink-0" />
            )}
            <span>{detailToast.text}</span>
            <button
              onClick={() => setDetailToast(null)}
              className={cn(
                "ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                "transition-colors text-xs font-medium",
                "min-h-[44px] sm:min-h-0",
                "[touch-action:manipulation]"
              )}
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar selection popover */}
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <motion.div
                // eslint-disable-next-line react-hooks/refs -- Floating UI ref callback
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.95, y: animateY }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: animateY }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "z-50 rounded-xl",
                  "w-[min(20rem,calc(100vw-2rem))]",
                  "border border-[var(--border-subtle)] bg-[var(--bg-elevated)]",
                  "shadow-xl"
                )}
              >
                <div className="p-3">
                  <div className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] px-1 pb-2">
                    Calendars to Sync
                  </div>

                  {/* Loading state */}
                  {calendarsLoading && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2
                        size={20}
                        className="animate-spin text-[var(--text-muted)]"
                      />
                    </div>
                  )}

                  {/* Error state */}
                  {calendarsError && !calendarsLoading && (
                    <div className="py-4 text-center">
                      <p className="text-sm text-[var(--text-secondary)] mb-2">
                        {calendarsError}
                      </p>
                      <button
                        onClick={fetchCalendars}
                        className={cn(
                          "text-sm text-[var(--accent-primary)]",
                          "hover:underline",
                          "min-h-[44px] sm:min-h-0",
                          "[touch-action:manipulation]"
                        )}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* No calendars found */}
                  {!calendarsLoading &&
                    !calendarsError &&
                    calendars.length === 0 && (
                      <div className="py-4 text-center">
                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                          No calendars found
                        </p>
                        <button
                          onClick={fetchCalendars}
                          className={cn(
                            "text-sm text-[var(--accent-primary)]",
                            "hover:underline",
                            "min-h-[44px] sm:min-h-0",
                            "[touch-action:manipulation]"
                          )}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                  {/* Calendar list */}
                  {!calendarsLoading &&
                    !calendarsError &&
                    calendars.length > 0 && (
                      <>
                        <div className="max-h-48 overflow-y-auto -mx-1 px-1 space-y-0.5 custom-scrollbar">
                          {calendars.map((cal) => {
                            const isSelected = selectedCalendars.includes(
                              cal.id
                            );
                            return (
                              <button
                                key={cal.id}
                                onClick={() => handleToggleCalendar(cal.id)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left",
                                  "text-sm text-[var(--text-primary)]",
                                  "hover:bg-[var(--bg-hover)] transition-colors",
                                  "min-h-[44px] sm:min-h-0",
                                  "[touch-action:manipulation]",
                                  "[-webkit-tap-highlight-color:transparent]"
                                )}
                              >
                                {/* Checkbox */}
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded shrink-0 flex items-center justify-center",
                                    "border transition-colors",
                                    isSelected
                                      ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                                      : "border-[var(--border-default)] bg-transparent"
                                  )}
                                >
                                  {isSelected && (
                                    <Check
                                      size={10}
                                      className="text-white"
                                      strokeWidth={3}
                                    />
                                  )}
                                </div>

                                {/* Calendar name */}
                                <span className="flex-1 truncate">
                                  {cal.summary}
                                  {cal.primary && (
                                    <span className="text-xs text-[var(--text-muted)] ml-1">
                                      (Primary)
                                    </span>
                                  )}
                                </span>

                                {/* Color dot */}
                                {cal.backgroundColor && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: cal.backgroundColor,
                                    }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Divider + Sync Now button */}
                        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                          <button
                            onClick={handleSync}
                            disabled={selectedCount === 0}
                            className={cn(
                              "w-full flex items-center justify-center gap-2",
                              "px-3 py-2.5 rounded-lg text-sm font-medium",
                              "bg-[var(--accent-primary)] text-white",
                              "hover:bg-[var(--accent-primary)]/80 transition-colors",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              "min-h-[44px] sm:min-h-0",
                              "[touch-action:manipulation]",
                              "[-webkit-tap-highlight-color:transparent]"
                            )}
                          >
                            <span>
                              {selectedCount === 0
                                ? "Select calendars to sync"
                                : "Sync Now"}
                            </span>
                          </button>
                        </div>

                        {/* Footer: email, last synced, settings link */}
                        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] px-1 space-y-1">
                          {status.connection?.email && (
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              Connected as {status.connection.email}
                            </p>
                          )}
                          {status.connection?.last_synced_at && (
                            <p className="text-xs text-[var(--text-muted)]">
                              Last synced {formatTimeAgo(status.connection.last_synced_at)}
                            </p>
                          )}
                          <Link
                            href="/settings"
                            className={cn(
                              "flex items-center gap-1 text-xs text-[var(--accent-primary)]",
                              "hover:underline",
                              "min-h-[44px] sm:min-h-0",
                              "[touch-action:manipulation]"
                            )}
                          >
                            <span>Manage in Settings</span>
                            <ArrowRight size={10} />
                          </Link>
                        </div>
                      </>
                    )}
                </div>
              </motion.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </div>
  );
}
