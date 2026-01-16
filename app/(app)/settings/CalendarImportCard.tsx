"use client";

// =============================================================================
// CALENDAR IMPORT CARD
// Manages ICS feed subscriptions and file uploads for calendar imports.
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  Link2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import type { CalendarSubscription, Quest, CalendarImportMode } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SubscriptionsResponse = {
  ok: true;
  subscriptions: CalendarSubscription[];
};

type QuestsResponse = {
  ok: true;
  quests: Quest[];
};

type SyncResult = {
  tasksCreated: number;
  tasksUpdated: number;
  scheduleBlocksCreated: number;
  scheduleBlocksUpdated: number;
  eventsProcessed: number;
  errors: string[];
};

type UploadResult = {
  tasksCreated: number;
  scheduleBlocksCreated: number;
  eventsProcessed: number;
  eventsSkipped: number;
  calendarName?: string;
  errors: string[];
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function CalendarImportCard() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add subscription form
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [importAs, setImportAs] = useState<CalendarImportMode>("smart");
  const [targetQuestId, setTargetQuestId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // File upload
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [subsData, questsData] = await Promise.all([
        fetchApi<SubscriptionsResponse>("/api/calendar/subscriptions"),
        fetchApi<QuestsResponse>("/api/quests"),
      ]);
      setSubscriptions(subsData.subscriptions);
      setQuests(questsData.quests);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddSubscription() {
    if (!feedUrl.trim()) return;

    setAdding(true);
    setError(null);

    try {
      await fetchApi("/api/calendar/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedUrl: feedUrl.trim(),
          name: feedName.trim() || undefined,
          importAs,
          targetQuestId: targetQuestId || undefined,
        }),
      });

      await loadData();
      setShowAddForm(false);
      setFeedUrl("");
      setFeedName("");
      setImportAs("smart");
      setTargetQuestId("");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteSubscription(id: string) {
    try {
      await fetchApi("/api/calendar/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      setSubscriptions((subs) => subs.filter((s) => s.id !== id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleToggleActive(sub: CalendarSubscription) {
    try {
      await fetchApi("/api/calendar/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: sub.id,
          isActive: !sub.is_active,
        }),
      });
      setSubscriptions((subs) =>
        subs.map((s) =>
          s.id === sub.id ? { ...s, is_active: !s.is_active } : s
        )
      );
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    setSyncResult(null);
    setError(null);

    try {
      const result = await fetchApi<SyncResult>("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      setSyncResult(result);
      await loadData(); // Refresh to update last_synced_at
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSyncingId(null);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      const content = await file.text();
      const result = await fetchApi<UploadResult>("/api/calendar/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icsContent: content,
          importAs,
          targetQuestId: targetQuestId || undefined,
        }),
      });
      setUploadResult(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
      <div className="h-32 animate-pulse bg-[var(--bg-card)] rounded-lg" />
    );
  }

  return (
    <div className={cn(
      "rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]",
      "overflow-hidden"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <Calendar size={20} className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">
                Calendar Import
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Import from ICS feeds or files (Canvas, Google Calendar, etc.)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowUploadForm(!showUploadForm);
                setShowAddForm(false);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-hover)] transition-colors"
              )}
            >
              <Upload size={14} />
              Upload
            </button>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowUploadForm(false);
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium",
                "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
                "hover:bg-[var(--accent-primary)]/20 transition-colors"
              )}
            >
              <Plus size={14} />
              Add Feed
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-[var(--priority-high)]/10 border-b border-[var(--priority-high)]/20">
          <div className="flex items-center gap-2 text-sm text-[var(--priority-high)]">
            <AlertCircle size={14} />
            {error}
          </div>
        </div>
      )}

      {/* Add Feed Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[var(--border-subtle)] overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                  Add Calendar Feed
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Paste an ICS feed URL from Canvas, Google Calendar, or any calendar app.
                  <br />
                  <span className="text-[var(--text-secondary)]">
                    Canvas: Calendar → Calendar Feed → Copy link
                  </span>
                  <br />
                  <span className="text-[var(--text-secondary)]">
                    Google: Settings → [Calendar] → Secret address in iCal format
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Feed URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded text-sm",
                      "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:border-[var(--accent-primary)]"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                      Name (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="My Classes"
                      value={feedName}
                      onChange={(e) => setFeedName(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded text-sm",
                        "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                        "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                        "focus:outline-none focus:border-[var(--accent-primary)]"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                      Import As
                    </label>
                    <select
                      value={importAs}
                      onChange={(e) => setImportAs(e.target.value as CalendarImportMode)}
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
                </div>

                {(importAs === "tasks" || importAs === "smart") && (
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                      Add Tasks To Quest
                    </label>
                    <select
                      value={targetQuestId}
                      onChange={(e) => setTargetQuestId(e.target.value)}
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

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowAddForm(false)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded",
                    "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubscription}
                  disabled={adding || !feedUrl.trim()}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:bg-[var(--accent-primary)]/80 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Link2 size={14} />
                  {adding ? "Adding..." : "Add Feed"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Form */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[var(--border-subtle)] overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                  Upload ICS File
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  One-time import from an exported .ics file.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Import As
                  </label>
                  <select
                    value={importAs}
                    onChange={(e) => setImportAs(e.target.value as CalendarImportMode)}
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
                      onChange={(e) => setTargetQuestId(e.target.value)}
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

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:bg-[var(--accent-primary)]/80 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Upload size={14} />
                  {uploading ? "Uploading..." : "Choose File"}
                </button>
                <button
                  onClick={() => setShowUploadForm(false)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded",
                    "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  Cancel
                </button>
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div className="p-3 rounded bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20">
                  <div className="flex items-center gap-2 text-sm text-[var(--accent-success)]">
                    <Check size={14} />
                    Imported {uploadResult.eventsProcessed} events.
                    {uploadResult.tasksCreated > 0 && ` ${uploadResult.tasksCreated} tasks created.`}
                    {uploadResult.scheduleBlocksCreated > 0 && ` ${uploadResult.scheduleBlocksCreated} schedule blocks created.`}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscriptions List */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {subscriptions.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--text-muted)]">
            No calendar feeds added yet. Add a feed URL or upload an ICS file to import events.
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className={cn(
                "p-4",
                !sub.is_active && "opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-[var(--text-primary)] truncate">
                      {sub.name}
                    </h4>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      sub.import_as === "smart"
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : sub.import_as === "tasks"
                        ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                        : "bg-[var(--accent-streak)]/10 text-[var(--accent-streak)]"
                    )}>
                      {sub.import_as === "smart" ? "Auto" : sub.import_as}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                    {sub.feed_url}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Last synced: {formatLastSynced(sub.last_synced_at)}
                  </p>
                  {sub.sync_error && (
                    <p className="text-xs text-[var(--priority-high)] mt-1">
                      Error: {sub.sync_error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(sub)}
                    className={cn(
                      "p-2 rounded hover:bg-[var(--bg-hover)] transition-colors",
                      "text-[var(--text-muted)]"
                    )}
                    title={sub.is_active ? "Pause" : "Resume"}
                  >
                    {sub.is_active ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => handleSync(sub.id)}
                    disabled={syncingId === sub.id || !sub.is_active}
                    className={cn(
                      "p-2 rounded hover:bg-[var(--bg-hover)] transition-colors",
                      "text-[var(--text-muted)] disabled:opacity-50"
                    )}
                    title="Sync now"
                  >
                    <RefreshCw
                      size={14}
                      className={syncingId === sub.id ? "animate-spin" : ""}
                    />
                  </button>
                  <button
                    onClick={() => handleDeleteSubscription(sub.id)}
                    className={cn(
                      "p-2 rounded hover:bg-[var(--bg-hover)] transition-colors",
                      "text-[var(--text-muted)] hover:text-[var(--priority-high)]"
                    )}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sync Result */}
      <AnimatePresence>
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "p-4 border-t border-[var(--border-subtle)]",
              syncResult.errors.length > 0 ? "bg-[var(--priority-high)]/5" : "bg-[var(--accent-success)]/5"
            )}
          >
            <div className={cn(
              "flex items-center gap-2 text-sm",
              syncResult.errors.length > 0 ? "text-[var(--priority-high)]" : "text-[var(--accent-success)]"
            )}>
              {syncResult.errors.length > 0 ? <AlertCircle size={14} /> : <Check size={14} />}
              Synced {syncResult.eventsProcessed} events.
              {syncResult.tasksCreated > 0 && ` ${syncResult.tasksCreated} tasks created.`}
              {syncResult.tasksUpdated > 0 && ` ${syncResult.tasksUpdated} tasks updated.`}
              {syncResult.scheduleBlocksCreated > 0 && ` ${syncResult.scheduleBlocksCreated} blocks created.`}
              {syncResult.scheduleBlocksUpdated > 0 && ` ${syncResult.scheduleBlocksUpdated} blocks updated.`}
            </div>
            {syncResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-[var(--priority-high)] space-y-1">
                {syncResult.errors.slice(0, 5).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {syncResult.errors.length > 5 && (
                  <div>...and {syncResult.errors.length - 5} more errors</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
