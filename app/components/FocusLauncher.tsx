"use client";

// =============================================================================
// FOCUS LAUNCHER COMPONENT
// Start button and settings for launching a new focus session.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useFocus } from "./FocusProvider";
import { getFocusXp } from "@/app/lib/gamification";
import { cn } from "@/app/lib/cn";
import FocusTimer from "./FocusTimer";

const DURATION_PRESETS = [
  { work: 25, break: 5, label: "25 min" },
  { work: 45, break: 10, label: "45 min" },
  { work: 60, break: 15, label: "60 min" },
  { work: 90, break: 20, label: "90 min" },
];

export default function FocusLauncher() {
  const { session, mode, startSession, error } = useFocus();
  const [showOptions, setShowOptions] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customTitle, setCustomTitle] = useState("");
  const [starting, setStarting] = useState(false);

  const hasActiveSession = session && mode !== "idle";

  async function handleStart() {
    setStarting(true);
    const preset = DURATION_PRESETS[selectedPreset];
    await startSession({
      workDuration: preset.work,
      breakDuration: preset.break,
      title: customTitle.trim() || undefined,
    });
    setStarting(false);
    setCustomTitle("");
    setShowOptions(false);
  }

  // Show timer if session is active
  if (hasActiveSession) {
    return <FocusTimer />;
  }

  const selectedDuration = DURATION_PRESETS[selectedPreset];
  const xpPreview = getFocusXp(selectedDuration.work);

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
      {/* Main launcher button */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "hover:bg-[var(--bg-hover)] transition-colors"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
            <Play size={20} className="text-white ml-0.5" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Start Focus Session
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {selectedDuration.label} • {selectedDuration.break}m break
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-mono text-[var(--accent-highlight)]">
            <Zap size={12} />
            +{xpPreview} XP
          </span>
          {showOptions ? (
            <ChevronUp size={16} className="text-[var(--text-muted)]" />
          ) : (
            <ChevronDown size={16} className="text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {/* Expandable options */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t border-[var(--border-default)]">
              {/* Duration presets */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Duration
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DURATION_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPreset(i)}
                      className={cn(
                        "px-3 py-2.5 sm:py-2 rounded text-sm font-medium transition-all",
                        selectedPreset === i
                          ? "bg-[var(--accent-primary)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional title */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Session Title (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="What are you working on?"
                  className={cn(
                    "w-full px-3 py-2 rounded text-sm",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-[var(--accent-primary)]">{error}</p>
              )}

              {/* Start button */}
              <button
                onClick={handleStart}
                disabled={starting}
                className={cn(
                  "w-full py-3 rounded-lg font-medium text-white",
                  "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80",
                  "transition-colors flex items-center justify-center gap-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Play size={18} />
                {starting ? "Starting..." : `Start ${selectedDuration.label} Focus`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
