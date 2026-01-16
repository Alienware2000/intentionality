"use client";

// =============================================================================
// EDIT TASK MODAL COMPONENT
// Modal for editing task title, due date, and priority.
// anime.js inspired: dark theme, minimal form controls.
// =============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Task, Priority } from "@/app/lib/types";
import { cn } from "@/app/lib/cn";

type Props = {
  task: Task | null;
  onSave: (
    taskId: string,
    updates: { title?: string; due_date?: string; priority?: Priority; scheduled_time?: string | null }
  ) => Promise<void>;
  onClose: () => void;
};

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "High", color: "var(--priority-high)" },
  { value: "medium", label: "Medium", color: "var(--priority-medium)" },
  { value: "low", label: "Low", color: "var(--priority-low)" },
];

export default function EditTaskModal({ task, onSave, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDueDate(task.due_date);
      setPriority(task.priority);
      setScheduledTime(task.scheduled_time ?? "");
    }
  }, [task]);

  async function handleSave() {
    if (!task || !title.trim()) return;
    setSaving(true);
    try {
      await onSave(task.id, {
        title: title.trim(),
        due_date: dueDate,
        priority,
        scheduled_time: scheduledTime || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    // Support both Cmd+Enter (Mac) and Ctrl+Enter (Windows/Linux)
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
  }

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
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
              "bg-[var(--bg-card)] border border-[var(--border-default)]",
              "max-h-[90vh] overflow-y-auto"
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                Edit Task
              </h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Title
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

              {/* Due Date and Scheduled Time - stacks on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      "[color-scheme:dark]"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded",
                      "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                      "text-[var(--text-primary)]",
                      "focus:outline-none focus:border-[var(--accent-primary)]",
                      "transition-colors",
                      "[color-scheme:dark]"
                    )}
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Priority
                </label>
                <div className="flex gap-2">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded text-sm font-medium",
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
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
