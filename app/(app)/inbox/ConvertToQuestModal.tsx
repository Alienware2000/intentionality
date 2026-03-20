"use client";

// =============================================================================
// CONVERT TO QUEST MODAL
// Modal for converting a brain dump entry into a quest.
// Simple title-only form since quests just need a title.
// =============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BrainDumpEntry } from "@/app/lib/types";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { useProfile } from "@/app/components/ProfileProvider";
import { useToast } from "@/app/components/Toast";

type Props = {
  entry: BrainDumpEntry | null;
  onClose: () => void;
  onConverted: (entryId: string) => void;
  onUndo?: (entry: BrainDumpEntry) => void;
};

export default function ConvertToQuestModal({ entry, onClose, onConverted, onUndo }: Props) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshProfile } = useProfile();
  const { showToast } = useToast();
  const router = useRouter();

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.content);
      setError(null);
    }
  }, [entry]);

  async function handleConvert() {
    if (!entry || !title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      // Create the quest
      const result = await fetchApi<{ quest: { id: string } }>("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      // Mark brain dump entry as processed
      await fetchApi("/api/brain-dump", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, processed: true }),
      });

      const convertedEntry = entry;
      refreshProfile();
      showToast({
        message: "Quest created!",
        type: "success",
        action: {
          label: "Undo",
          onClick: async () => {
            await fetchApi("/api/quests", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ questId: result.quest.id }),
            });
            await fetchApi("/api/brain-dump", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ entryId: convertedEntry.id, processed: false }),
            });
            refreshProfile();
            onUndo?.(convertedEntry);
          },
        },
      });
      onConverted(entry.id);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && e.metaKey) handleConvert();
  }

  return (
    <AnimatePresence>
      {entry && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 modal-backdrop z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-[calc(100%-32px)] sm:w-full max-w-md p-4 sm:p-6 rounded-lg",
              "bg-[var(--bg-card)] border border-[var(--border-default)]"
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                Convert to Quest
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Original content preview */}
            <div className="mb-4 p-3 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">
                Original
              </p>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                {entry.content}
              </p>
            </div>

            {/* Form */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Quest Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className={cn(
                  "w-full px-3 py-2 rounded",
                  "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                  "focus:outline-none focus:border-[var(--accent-primary)]",
                  "transition-colors"
                )}
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-4 text-sm text-[var(--priority-high)]">{error}</p>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={onClose}
                className={cn(
                  "min-h-[44px] sm:min-h-0 px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
                  "hover:bg-[var(--bg-elevated)] transition-colors",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={saving || !title.trim()}
                className={cn(
                  "min-h-[44px] sm:min-h-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
                )}
              >
                {saving ? "Creating..." : "Create Quest"}
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
