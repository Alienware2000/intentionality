"use client";

// =============================================================================
// CANVAS CONNECTION CARD
// Manages Canvas LMS integration settings.
// Allows connecting, selecting courses, and syncing assignments.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Link2Off,
  RefreshCw,
  Check,
  ExternalLink,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import type { CanvasCourse } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Connection = {
  id: string;
  instance_url: string;
  selected_courses: string[];
  last_synced_at: string | null;
  created_at: string;
};

type ConnectionStatus = {
  ok: true;
  connected: boolean;
  connection: Connection | null;
};

type CoursesResponse = {
  ok: true;
  courses: CanvasCourse[];
  selectedCourses: string[];
};

type SyncResponse = {
  ok: true;
  coursesProcessed: number;
  assignmentsCreated: number;
  assignmentsUpdated: number;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function CanvasConnectionCard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // Form state
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    try {
      const data = await fetchApi<ConnectionStatus>("/api/integrations/canvas");
      setConnected(data.connected);
      setConnection(data.connection);

      if (data.connected && data.connection) {
        // Load courses if connected
        const coursesData = await fetchApi<CoursesResponse>(
          "/api/integrations/canvas/courses"
        );
        setCourses(coursesData.courses);
        setSelectedCourses(coursesData.selectedCourses);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  async function handleConnect() {
    if (!instanceUrl.trim() || !accessToken.trim()) return;

    setConnecting(true);
    setError(null);

    try {
      await fetchApi("/api/integrations/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceUrl, accessToken }),
      });

      // Reload connection status
      await loadConnection();
      setShowConnectForm(false);
      setInstanceUrl("");
      setAccessToken("");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await fetchApi("/api/integrations/canvas", { method: "DELETE" });
      setConnected(false);
      setConnection(null);
      setCourses([]);
      setSelectedCourses([]);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleToggleCourse(courseId: string) {
    const newSelected = selectedCourses.includes(courseId)
      ? selectedCourses.filter((id) => id !== courseId)
      : [...selectedCourses, courseId];

    setSelectedCourses(newSelected);

    try {
      await fetchApi("/api/integrations/canvas/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCourses: newSelected }),
      });
    } catch (e) {
      // Revert on error
      setSelectedCourses(selectedCourses);
      setError(getErrorMessage(e));
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      const result = await fetchApi<SyncResponse>(
        "/api/integrations/canvas/sync",
        { method: "POST" }
      );
      setSyncResult(result);

      // Reload connection to update last_synced_at
      await loadConnection();
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
            <div className={cn(
              "p-2 rounded-lg",
              connected
                ? "bg-[var(--accent-success)]/10"
                : "bg-[var(--bg-hover)]"
            )}>
              <BookOpen
                size={20}
                className={connected ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"}
              />
            </div>
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">
                Canvas LMS
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {connected
                  ? `Connected to ${connection?.instance_url}`
                  : "Sync assignments from your courses"}
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
              onClick={() => setShowConnectForm(true)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium",
                "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
                "hover:bg-[var(--accent-primary)]/20 transition-colors"
              )}
            >
              <Link2 size={14} />
              Connect
            </button>
          )}
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

      {/* Connect Form */}
      <AnimatePresence>
        {showConnectForm && !connected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-[var(--border-subtle)] overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Step-by-step instructions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                  How to get your Access Token:
                </h4>
                <ol className="text-sm text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
                  <li>Log into your Canvas account</li>
                  <li>Click your <span className="text-[var(--text-primary)]">profile picture</span> → <span className="text-[var(--text-primary)]">Settings</span></li>
                  <li>Scroll to <span className="text-[var(--text-primary)]">&quot;Approved Integrations&quot;</span> section</li>
                  <li>Click <span className="text-[var(--text-primary)]">&quot;+ New Access Token&quot;</span></li>
                  <li>Enter a purpose (e.g., &quot;Intentionality&quot;) and click <span className="text-[var(--text-primary)]">&quot;Generate Token&quot;</span></li>
                  <li>Copy the token immediately (it won&apos;t be shown again!)</li>
                </ol>

                {instanceUrl.trim() && (
                  <a
                    href={`https://${instanceUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}/profile/settings`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-primary)] hover:underline"
                  >
                    Open Canvas Settings
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {/* Warning about CAS/SSO */}
              <div className="p-3 rounded bg-[var(--bg-hover)] border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text-secondary)]">Note:</span>{" "}
                  Some schools using CAS/SSO authentication may have disabled API access tokens.
                  If you can&apos;t find the &quot;New Access Token&quot; button or get authentication errors,
                  contact your school&apos;s IT department to check if Canvas API access is enabled.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Canvas URL
                  </label>
                  <input
                    type="text"
                    placeholder="canvas.university.edu"
                    value={instanceUrl}
                    onChange={(e) => setInstanceUrl(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded",
                      "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:border-[var(--accent-primary)]",
                      "transition-colors"
                    )}
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Just the domain, e.g., &quot;canvas.university.edu&quot; (no https://)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="Paste your token here"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded font-mono text-sm",
                      "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:border-[var(--accent-primary)]",
                      "transition-colors"
                    )}
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Starts with a number, looks like: 1234~AbCdEfGhIjKlMnOp...
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowConnectForm(false)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded",
                    "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting || !instanceUrl.trim() || !accessToken.trim()}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:bg-[var(--accent-primary)]/80 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {connecting ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected State - Course Selection & Sync */}
      {connected && (
        <div className="p-4 space-y-4">
          {/* Course Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                Courses to Sync
              </h4>
              <a
                href={`https://${connection?.instance_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Open Canvas
                <ExternalLink size={10} />
              </a>
            </div>

            {courses.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No active courses found.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {courses.map((course) => {
                  const isSelected = selectedCourses.includes(String(course.id));
                  return (
                    <button
                      key={course.id}
                      onClick={() => handleToggleCourse(String(course.id))}
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
                        {isSelected && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">
                          {course.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {course.course_code}
                        </p>
                      </div>
                    </button>
                  );
                })}
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
              disabled={syncing || selectedCourses.length === 0}
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
                  Synced {syncResult.coursesProcessed} course{syncResult.coursesProcessed !== 1 ? "s" : ""}.
                  {" "}
                  {syncResult.assignmentsCreated > 0 && (
                    <span>{syncResult.assignmentsCreated} new task{syncResult.assignmentsCreated !== 1 ? "s" : ""} created.</span>
                  )}
                  {syncResult.assignmentsUpdated > 0 && (
                    <span>{syncResult.assignmentsUpdated} task{syncResult.assignmentsUpdated !== 1 ? "s" : ""} updated.</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
