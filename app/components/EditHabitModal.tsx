"use client";

// =============================================================================
// EDIT HABIT MODAL COMPONENT
// Modal for editing habit title, priority, and schedule.
// =============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { HabitWithStatus, Priority, HabitFrequency, DayOfWeek } from "@/app/lib/types";
import { cn } from "@/app/lib/cn";
import ModalPortal from "./ModalPortal";

type Props = {
  habit: HabitWithStatus | null;
  onSave: (
    habitId: string,
    updates: {
      title?: string;
      priority?: Priority;
      frequency?: HabitFrequency;
      active_days?: DayOfWeek[];
    }
  ) => Promise<void>;
  onCreate?: (data: {
    title: string;
    priority: Priority;
    frequency: HabitFrequency;
    active_days: DayOfWeek[];
  }) => Promise<void>;
  onClose: () => void;
  isOpen?: boolean; // Explicit open state for create mode
};

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "High", color: "var(--priority-high)" },
  { value: "medium", label: "Medium", color: "var(--priority-medium)" },
  { value: "low", label: "Low", color: "var(--priority-low)" },
];

const frequencyOptions: { value: HabitFrequency; label: string; days: DayOfWeek[] }[] = [
  { value: "daily", label: "Daily", days: [1, 2, 3, 4, 5, 6, 7] },
  { value: "weekdays", label: "Mon-Fri", days: [1, 2, 3, 4, 5] },
  { value: "weekends", label: "Sat-Sun", days: [6, 7] },
  { value: "custom", label: "Custom", days: [] },
];

const dayLabels: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 1, label: "Monday", short: "M" },
  { value: 2, label: "Tuesday", short: "T" },
  { value: 3, label: "Wednesday", short: "W" },
  { value: 4, label: "Thursday", short: "T" },
  { value: 5, label: "Friday", short: "F" },
  { value: 6, label: "Saturday", short: "S" },
  { value: 7, label: "Sunday", short: "S" },
];

export default function EditHabitModal({ habit, onSave, onCreate, onClose, isOpen }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [activeDays, setActiveDays] = useState<DayOfWeek[]>([1, 2, 3, 4, 5, 6, 7]);
  const [saving, setSaving] = useState(false);

  // Determine if modal should be visible
  const isVisible = habit !== null || isOpen === true;
  const isCreateMode = habit === null;

  // Sync state when habit changes or modal opens for create
  useEffect(() => {
    if (habit) {
      // Edit mode: populate with existing habit data
      setTitle(habit.title);
      setPriority(habit.priority);
      setFrequency(habit.frequency ?? "daily");
      setActiveDays(habit.active_days ?? [1, 2, 3, 4, 5, 6, 7]);
    } else if (isOpen) {
      // Create mode: reset to defaults
      setTitle("");
      setPriority("medium");
      setFrequency("daily");
      setActiveDays([1, 2, 3, 4, 5, 6, 7]);
    }
  }, [habit, isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isVisible]);

  function handleFrequencyChange(newFrequency: HabitFrequency) {
    setFrequency(newFrequency);
    // Update active days based on preset
    const preset = frequencyOptions.find((f) => f.value === newFrequency);
    if (preset && newFrequency !== "custom") {
      setActiveDays(preset.days);
    }
  }

  function toggleDay(day: DayOfWeek) {
    setFrequency("custom");
    setActiveDays((prev) => {
      if (prev.includes(day)) {
        // Don't allow removing the last day
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  async function handleSave() {
    if (!title.trim() || activeDays.length === 0) return;
    setSaving(true);
    try {
      if (habit) {
        // Edit mode
        await onSave(habit.id, {
          title: title.trim(),
          priority,
          frequency,
          active_days: activeDays,
        });
      } else if (onCreate) {
        // Create mode
        await onCreate({
          title: title.trim(),
          priority,
          frequency,
          active_days: activeDays,
        });
      }
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
    <ModalPortal>
      <AnimatePresence>
        {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 modal-backdrop z-[60]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]",
              "w-full max-w-md p-4 sm:p-6 rounded-xl mx-4 sm:mx-0",
              "bg-[var(--bg-card)] border border-[var(--border-default)]",
              "max-h-[90vh] overflow-y-auto"
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                {isCreateMode ? "Add Habit" : "Edit Habit"}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-all hover:rotate-[15deg]"
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

              {/* Schedule */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Schedule
                </label>
                {/* Frequency presets */}
                <div className="flex gap-2 mb-3">
                  {frequencyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFrequencyChange(opt.value)}
                      className={cn(
                        "flex-1 px-2 py-2 rounded text-sm font-medium",
                        "border-2 transition-all",
                        frequency === opt.value
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "border-transparent bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Day toggles */}
                <div className="flex gap-1 justify-between">
                  {dayLabels.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      aria-label={day.label}
                      className={cn(
                        "w-9 h-9 rounded-full text-sm font-medium",
                        "border-2 transition-all",
                        activeDays.includes(day.value)
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                          : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                      )}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Streaks only count on selected days. Missing non-scheduled days won&apos;t break your streak.
                </p>
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
                disabled={saving || !title.trim() || activeDays.length === 0}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving ? (isCreateMode ? "Adding..." : "Saving...") : (isCreateMode ? "Add" : "Save")}
              </button>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </ModalPortal>
  );
}
