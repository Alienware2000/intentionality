"use client";

// =============================================================================
// FOCUS LAUNCHER COMPONENT
// Start button and settings for launching a new focus session.
// Enhanced with pulsing glow, gradient timer ring preview, and micro-interactions.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, ChevronDown } from "lucide-react";
import { useFocus } from "./FocusProvider";
import { useOnboarding } from "./OnboardingProvider";
import { getFocusTotalXp, getFocusMilestoneBonus } from "@/app/lib/gamification";
import { cn } from "@/app/lib/cn";
import FocusTimer from "./FocusTimer";

const DURATION_PRESETS = [
  { work: 5, break: 1, label: "5 min" },
  { work: 10, break: 2, label: "10 min" },
  { work: 15, break: 3, label: "15 min" },
  { work: 25, break: 5, label: "25 min" },
  { work: 45, break: 10, label: "45 min" },
  { work: 60, break: 15, label: "60 min" },
  { work: 90, break: 20, label: "90 min" },
];

export default function FocusLauncher() {
  const { session, mode, startSession, error } = useFocus();
  const { markStepComplete } = useOnboarding();
  const [showOptions, setShowOptions] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(3); // Default to 25 min
  const [customTitle, setCustomTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customWork, setCustomWork] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasActiveSession = session && mode !== "idle";

  function validateCustomDuration(): boolean {
    if (customWork < 1 || customWork > 180) {
      setValidationError("Work duration must be 1-180 minutes");
      return false;
    }
    if (customBreak < 0 || customBreak > 60) {
      setValidationError("Break duration must be 0-60 minutes");
      return false;
    }
    setValidationError(null);
    return true;
  }

  async function handleStart() {
    if (isCustom && !validateCustomDuration()) {
      return;
    }

    setStarting(true);
    const workDuration = isCustom ? customWork : DURATION_PRESETS[selectedPreset].work;
    const breakDuration = isCustom ? customBreak : DURATION_PRESETS[selectedPreset].break;

    await startSession({
      workDuration,
      breakDuration,
      title: customTitle.trim() || undefined,
    });
    // Mark onboarding step complete
    markStepComplete("focus_session");
    setStarting(false);
    setCustomTitle("");
    setShowOptions(false);
  }

  // Show timer if session is active
  if (hasActiveSession) {
    return <FocusTimer />;
  }

  const workMinutes = isCustom ? customWork : DURATION_PRESETS[selectedPreset].work;
  const breakMinutes = isCustom ? customBreak : DURATION_PRESETS[selectedPreset].break;
  const xpPreview = getFocusTotalXp(workMinutes);
  const milestoneBonus = getFocusMilestoneBonus(workMinutes);
  const displayLabel = isCustom ? `${customWork} min` : DURATION_PRESETS[selectedPreset].label;

  // Timer ring preview calculations
  const circumference = 2 * Math.PI * 35;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl glass-card-premium",
        "relative overflow-hidden",
        "transition-all duration-200"
      )}
    >
      {/* Main launcher button */}
      <motion.button
        onClick={() => setShowOptions(!showOptions)}
        whileHover={{ backgroundColor: "var(--bg-hover)" }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "transition-colors"
        )}
      >
        <div className="flex items-center gap-4">
          {/* Timer ring preview */}
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="var(--bg-hover)"
                strokeWidth="4"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="url(#focusGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * 0.75 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="var(--accent-highlight)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Play size={18} className="text-[var(--accent-primary)] ml-0.5" />
              </motion.div>
            </div>
          </div>

          <div className="text-left">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Start Focus Session
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {displayLabel} work • {breakMinutes}m break
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5">
            <motion.span
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--accent-highlight)]/10 text-[var(--accent-highlight)]"
              whileHover={{ scale: 1.05 }}
            >
              <Zap size={12} />
              +{xpPreview} XP
            </motion.span>
            <span className="text-[10px] text-[var(--text-muted)]">50% min to earn</span>
          </div>
          <motion.div
            animate={{ rotate: showOptions ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-[var(--text-muted)]" />
          </motion.div>
        </div>
      </motion.button>

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
            <div className="p-4 pt-0 space-y-4 border-t border-[var(--border-subtle)]">
              {/* Duration presets */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Duration
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DURATION_PRESETS.map((preset, i) => (
                    <motion.button
                      key={i}
                      onClick={() => {
                        setSelectedPreset(i);
                        setIsCustom(false);
                        setValidationError(null);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "px-3 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all",
                        !isCustom && selectedPreset === i
                          ? "bg-[var(--accent-primary)] text-white"
                          : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]"
                      )}
                    >
                      {preset.label}
                    </motion.button>
                  ))}
                  <motion.button
                    onClick={() => {
                      setIsCustom(true);
                      setValidationError(null);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "px-3 py-3 sm:py-2 rounded-lg text-sm font-medium transition-all",
                      isCustom
                        ? "bg-[var(--accent-primary)] text-white"
                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]"
                    )}
                  >
                    Custom
                  </motion.button>
                </div>
              </div>

              {/* Custom duration inputs */}
              <AnimatePresence>
                {isCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-3 overflow-hidden"
                  >
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                        Work (1-180 min)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={customWork}
                        onChange={(e) => {
                          setCustomWork(parseInt(e.target.value) || 1);
                          setValidationError(null);
                        }}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg text-sm font-mono",
                          "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                          "text-[var(--text-primary)]",
                          "focus:outline-none focus:border-[var(--accent-primary)]",
                          "transition-colors"
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">
                        Break (0-60 min)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={customBreak}
                        onChange={(e) => {
                          setCustomBreak(parseInt(e.target.value) || 0);
                          setValidationError(null);
                        }}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg text-sm font-mono",
                          "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                          "text-[var(--text-primary)]",
                          "focus:outline-none focus:border-[var(--accent-primary)]",
                          "transition-colors"
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Milestone bonus preview */}
              <AnimatePresence>
                {milestoneBonus > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-xs text-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10 border border-[var(--accent-highlight)]/20 rounded-lg px-3 py-2"
                  >
                    Includes +{milestoneBonus} XP milestone bonus for {workMinutes}+ min focus!
                  </motion.div>
                )}
              </AnimatePresence>

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
                    "w-full px-3 py-2 rounded-lg text-sm",
                    "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]",
                    "transition-colors"
                  )}
                />
              </div>

              {/* Error */}
              {(error || validationError) && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-[var(--accent-primary)]"
                >
                  {validationError || error}
                </motion.p>
              )}

              {/* Start button */}
              <motion.button
                onClick={handleStart}
                disabled={starting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full py-3 rounded-xl font-medium text-white",
                  "bg-[var(--accent-primary)]",
                  "hover:bg-[var(--accent-primary)]/90",
                  "transition-all duration-200",
                  "flex items-center justify-center gap-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:glow-none"
                )}
              >
                <Play size={18} />
                {starting ? "Starting..." : `Start ${displayLabel} Focus`}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
