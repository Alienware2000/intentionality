"use client";

// =============================================================================
// INBOX CLIENT COMPONENT
// Displays unprocessed brain dump entries.
// Allows manual conversion to tasks or deletion.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, CheckCircle, Clock, Brain, Plus, ArrowRight } from "lucide-react";
import type { BrainDumpEntry, Quest } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import ConfirmModal from "@/app/components/ConfirmModal";
import ConvertToTaskModal from "./ConvertToTaskModal";

type InboxResponse = { ok: true; entries: BrainDumpEntry[] };
type QuestsResponse = { ok: true; quests: Quest[] };

export default function InboxClient() {
  const [entries, setEntries] = useState<BrainDumpEntry[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [convertingEntry, setConvertingEntry] = useState<BrainDumpEntry | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [inboxData, questsData] = await Promise.all([
        fetchApi<InboxResponse>("/api/brain-dump?processed=false"),
        fetchApi<QuestsResponse>("/api/quests"),
      ]);

      setEntries(inboxData.entries);
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

  async function handleDelete(entryId: string) {
    try {
      await fetchApi("/api/brain-dump", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });

      setEntries((e) => e.filter((entry) => entry.id !== entryId));
      setDeletingEntryId(null);
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  async function handleMarkProcessed(entryId: string) {
    try {
      await fetchApi("/api/brain-dump", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, processed: true }),
      });

      setEntries((e) => e.filter((entry) => entry.id !== entryId));
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[var(--accent-primary)]">Error: {error}</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex p-4 rounded-full bg-[var(--bg-card)] mb-4">
            <Brain size={32} className="text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            Inbox is empty
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] font-mono text-xs">
              Ctrl+K
            </kbd>{" "}
            to capture a thought and it will appear here for processing.
          </p>
        </div>
      ) : (
        <>
          {/* Count badge */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-mono text-xs">
              {entries.length}
            </span>
            <span>unprocessed {entries.length === 1 ? "entry" : "entries"}</span>
          </div>

          {/* Entries List */}
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "group rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                  "hover:border-[var(--border-default)] transition-colors"
                )}
              >
                <div className="p-4">
                  {/* Content */}
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">
                    {entry.content}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Clock size={12} />
                      <span>{formatTimeAgo(entry.created_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setConvertingEntry(entry)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium",
                          "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
                          "hover:bg-[var(--accent-primary)]/20 transition-colors"
                        )}
                        title="Convert to task"
                      >
                        <Plus size={12} />
                        <span>Task</span>
                        <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => handleMarkProcessed(entry.id)}
                        className="p-2 rounded hover:bg-[var(--bg-hover)] transition-colors"
                        title="Mark as processed"
                      >
                        <CheckCircle size={14} className="text-[var(--accent-success)]" />
                      </button>
                      <button
                        onClick={() => setDeletingEntryId(entry.id)}
                        className="p-2 rounded hover:bg-[var(--bg-hover)] transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-[var(--text-muted)] hover:text-[var(--priority-high)]" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingEntryId !== null}
        title="Delete Entry"
        message="This will permanently delete this brain dump entry. This action cannot be undone."
        onConfirm={() => deletingEntryId && handleDelete(deletingEntryId)}
        onCancel={() => setDeletingEntryId(null)}
      />

      {/* Convert to Task Modal */}
      <ConvertToTaskModal
        entry={convertingEntry}
        quests={quests}
        onClose={() => setConvertingEntry(null)}
        onConverted={(entryId) => {
          setEntries((e) => e.filter((entry) => entry.id !== entryId));
          setConvertingEntry(null);
        }}
      />
    </div>
  );
}
