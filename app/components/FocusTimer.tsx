"use client";

// =============================================================================
// FOCUS TIMER COMPONENT
// Displays the countdown timer with controls for active focus sessions.
// =============================================================================

import { motion } from "framer-motion";
import { Play, Pause, X, SkipForward, Check, Zap, Coffee } from "lucide-react";
import { useFocus } from "./FocusProvider";
import { getFocusXp } from "@/app/lib/gamification";
import { cn } from "@/app/lib/cn";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function FocusTimer() {
  const {
    session,
    timeRemaining,
    isRunning,
    mode,
    pauseSession,
    resumeSession,
    completeSession,
    abandonSession,
    skipToBreak,
    skipBreak,
  } = useFocus();

  if (!session || mode === "idle") {
    return null;
  }

  const xpToEarn = getFocusXp(session.work_duration);
  const isBreak = mode === "break";

  // Calculate progress percentage
  const totalSeconds = isBreak
    ? session.break_duration * 60
    : session.work_duration * 60;
  const progress = ((totalSeconds - timeRemaining) / totalSeconds) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "rounded-lg p-4 border",
        isBreak
          ? "bg-[var(--accent-success)]/10 border-[var(--accent-success)]/30"
          : "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isBreak ? (
            <Coffee size={16} className="text-[var(--accent-success)]" />
          ) : (
            <Zap size={16} className="text-[var(--accent-primary)]" />
          )}
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wide",
              isBreak ? "text-[var(--accent-success)]" : "text-[var(--accent-primary)]"
            )}
          >
            {isBreak ? "Break Time" : "Focus Mode"}
          </span>
        </div>
        {!isBreak && (
          <span className="flex items-center gap-1 text-xs font-mono text-[var(--accent-highlight)]">
            <Zap size={10} />
            +{xpToEarn} XP
          </span>
        )}
      </div>

      {/* Session title */}
      {session.title && (
        <p className="text-sm text-[var(--text-secondary)] mb-2 truncate">
          {session.title}
        </p>
      )}

      {/* Timer display */}
      <div className="text-center mb-3">
        <span
          className={cn(
            "text-4xl font-mono font-bold",
            isBreak ? "text-[var(--accent-success)]" : "text-[var(--text-primary)]"
          )}
        >
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--bg-elevated)] rounded-full mb-4 overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isBreak ? "bg-[var(--accent-success)]" : "bg-[var(--accent-primary)]"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={isRunning ? pauseSession : resumeSession}
          className={cn(
            "p-2 rounded-full transition-colors",
            isBreak
              ? "bg-[var(--accent-success)] hover:bg-[var(--accent-success)]/80"
              : "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
          )}
        >
          {isRunning ? (
            <Pause size={20} className="text-white" />
          ) : (
            <Play size={20} className="text-white" />
          )}
        </button>

        {/* Skip (to break or end break) */}
        <button
          onClick={isBreak ? skipBreak : skipToBreak}
          className="p-2 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors"
          title={isBreak ? "End break" : "Skip to break"}
        >
          <SkipForward size={18} className="text-[var(--text-muted)]" />
        </button>

        {/* Complete (only during work mode or when timer done) */}
        {!isBreak && (
          <button
            onClick={completeSession}
            className="p-2 rounded-full bg-[var(--accent-success)] hover:bg-[var(--accent-success)]/80 transition-colors"
            title="Complete session"
          >
            <Check size={18} className="text-white" />
          </button>
        )}

        {/* Abandon */}
        <button
          onClick={abandonSession}
          className="p-2 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--accent-primary)]/20 transition-colors"
          title="Abandon session"
        >
          <X size={18} className="text-[var(--text-muted)]" />
        </button>
      </div>
    </motion.div>
  );
}
