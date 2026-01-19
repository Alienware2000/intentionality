"use client";

// =============================================================================
// CONVERT TO TASK MODAL
// Modal for converting a brain dump entry into a task.
// Allows editing title, selecting quest, setting priority and due date.
// =============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import type { BrainDumpEntry, Quest, Priority } from "@/app/lib/types";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { useProfile } from "@/app/components/ProfileProvider";

type Props = {
  entry: BrainDumpEntry | null;
  quests: Quest[];
  onClose: () => void;
  onConverted: (entryId: string) => void;
};

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "High", color: "var(--priority-high)" },
  { value: "medium", label: "Medium", color: "var(--priority-medium)" },
  { value: "low", label: "Low", color: "var(--priority-low)" },
];

export default function ConvertToTaskModal({ entry, quests, onClose, onConverted }: Props) {
  const [title, setTitle] = useState("");
  const [questId, setQuestId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshProfile } = useProfile();

  // Initialize form when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.content);
      setQuestId(quests[0]?.id ?? "");
      setPriority("medium");
      // Default due date to today
      setDueDate(new Date().toISOString().split("T")[0]);
      setError(null);
    }
  }, [entry, quests]);

  async function handleConvert() {
    if (!entry || !title.trim() || !questId || !dueDate) return;

    setSaving(true);
    setError(null);

    try {
      // Create the task
      await fetchApi("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quest_id: questId,
          title: title.trim(),
          due_date: dueDate,
          priority,
        }),
      });

      // Mark brain dump entry as processed
      await fetchApi("/api/brain-dump", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, processed: true }),
      });

      refreshProfile();
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
                Convert to Task
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
            <div className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Task Title
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

              {/* Quest Selection */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Quest
                </label>
                <select
                  value={questId}
                  onChange={(e) => setQuestId(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]",
                    "transition-colors"
                  )}
                >
                  {quests.map((quest) => (
                    <option key={quest.id} value={quest.id}>
                      {quest.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date and Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded",
                      "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                      "text-[var(--text-primary)]",
                      "focus:outline-none focus:border-[var(--accent-primary)]",
                      "transition-colors",
                      "theme-color-scheme"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Priority
                  </label>
                  <div className="flex gap-1">
                    {priorityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={cn(
                          "flex-1 px-2 py-2 rounded text-xs font-medium",
                          "border-2 transition-all",
                          priority === opt.value
                            ? "border-current bg-[var(--bg-hover)]"
                            : "border-transparent bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                        )}
                        style={{
                          color: priority === opt.value ? opt.color : undefined,
                          borderColor:
                            priority === opt.value ? opt.color : "transparent",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
                  "px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
                  "hover:bg-[var(--bg-elevated)] transition-colors"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={saving || !title.trim() || !questId || !dueDate}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving ? "Creating..." : "Create Task"}
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
