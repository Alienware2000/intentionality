"use client";

// =============================================================================
// ADD SCHEDULE MODAL COMPONENT
// Modal for creating and editing recurring schedule blocks.
// anime.js inspired: dark theme, minimal form controls.
// =============================================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import type { ScheduleBlock, DayOfWeek, ISODateString, Priority } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import { XP_VALUES } from "@/app/lib/gamification";

type Props = {
  block?: ScheduleBlock | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 1, label: "Monday", short: "M" },
  { value: 2, label: "Tuesday", short: "T" },
  { value: 3, label: "Wednesday", short: "W" },
  { value: 4, label: "Thursday", short: "T" },
  { value: 5, label: "Friday", short: "F" },
  { value: 6, label: "Saturday", short: "S" },
  { value: 7, label: "Sunday", short: "S" },
];

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#ef4444", // Red
  "#22c55e", // Green
  "#f97316", // Orange
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#eab308", // Yellow
];

export default function AddScheduleModal({
  block,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>([1, 3, 5]);
  const [color, setColor] = useState("#6366f1");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<ISODateString | "">("");
  const [endDate, setEndDate] = useState<ISODateString | "">("");
  const [isCompletable, setIsCompletable] = useState(false);
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!block;

  // Sync state when editing existing block
  useEffect(() => {
    if (block) {
      setTitle(block.title);
      setStartTime(block.start_time);
      setEndTime(block.end_time);
      setDaysOfWeek(block.days_of_week);
      setColor(block.color);
      setLocation(block.location ?? "");
      setStartDate(block.start_date ?? "");
      setEndDate(block.end_date ?? "");
      setIsCompletable(block.is_completable);
      setPriority(block.priority ?? "medium");
    } else {
      // Reset to defaults for new block
      setTitle("");
      setStartTime("09:00");
      setEndTime("10:00");
      setDaysOfWeek([1, 3, 5]);
      setColor("#6366f1");
      setLocation("");
      setStartDate("");
      setEndDate("");
      setIsCompletable(false);
      setPriority("medium");
    }
    setError(null);
  }, [block, isOpen]);

  function toggleDay(day: DayOfWeek) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (daysOfWeek.length === 0) {
      setError("Select at least one day");
      return;
    }

    if (startTime >= endTime) {
      setError("End time must be after start time");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        start_time: startTime,
        end_time: endTime,
        days_of_week: daysOfWeek,
        color,
        location: location.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        is_completable: isCompletable,
        priority: isCompletable ? priority : undefined,
      };

      if (isEditing) {
        await fetchApi("/api/schedule", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockId: block.id, ...payload }),
        });
      } else {
        await fetchApi("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      onSaved();
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && e.metaKey) handleSave();
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
              "w-full max-w-md p-6 rounded-lg",
              "bg-[var(--bg-card)] border border-[var(--border-default)]",
              "max-h-[90vh] overflow-y-auto"
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                {isEditing ? "Edit Schedule" : "Add Schedule"}
              </h2>
              <button
                onClick={onClose}
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
                  placeholder="CS 101, Gym, Work..."
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

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
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
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
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

              {/* Days of Week */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Days
                </label>
                <div className="flex gap-1">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      title={day.label}
                      className={cn(
                        "flex-1 h-10 rounded text-sm font-medium transition-all",
                        daysOfWeek.includes(day.value)
                          ? "bg-[var(--accent-primary)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                      )}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        color === c && "ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-card)]"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Location (optional) */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Room 302, Building A..."
                  className={cn(
                    "w-full px-3 py-2 rounded",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]",
                    "transition-colors"
                  )}
                />
              </div>

              {/* Date Range (optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value as ISODateString)}
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
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value as ISODateString)}
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

              {/* Completable Toggle */}
              <div className="pt-2 border-t border-[var(--border-default)]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCompletable}
                    onChange={(e) => setIsCompletable(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:ring-offset-0"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Completable (earn XP when checked off)
                  </span>
                </label>

                {/* Priority + XP Preview (shown when completable) */}
                {isCompletable && (
                  <div className="mt-3 pl-7 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Priority)}
                        className={cn(
                          "px-2 py-1 rounded text-sm",
                          "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                          "text-[var(--text-primary)]",
                          "focus:outline-none focus:border-[var(--accent-primary)]"
                        )}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--accent-highlight)]">
                      <Zap size={14} />
                      <span className="text-sm font-mono">+{XP_VALUES[priority]} XP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-[var(--accent-primary)]">{error}</p>
              )}
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
                disabled={saving || !title.trim() || daysOfWeek.length === 0}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {saving ? "Saving..." : isEditing ? "Save" : "Add"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
