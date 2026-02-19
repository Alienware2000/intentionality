"use client";

// =============================================================================
// FOCUS TIMER COMPONENT
// Displays the countdown timer with controls for active focus sessions.
// Enhanced with SVG ring animation, breathing glow, and smooth transitions.
// =============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, SkipForward, Check, Zap, Coffee } from "lucide-react";
import { useFocus } from "./FocusProvider";
import { getFocusMilestoneBonus, getProRatedFocusXp, MIN_FOCUS_COMPLETION_RATIO } from "@/app/lib/gamification";
import { formatCountdown } from "@/app/lib/date-utils";
import { cn } from "@/app/lib/cn";

export default function FocusTimer() {
  const {
    session,
    timeRemaining,
    isRunning,
    mode,
    workEndedAt,
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

  const isBreak = mode === "break";
  const isCompleted = mode === "completed";

  // Calculate elapsed work time accurately
  // Use workEndedAt timestamp when available (for break/completed modes after skip)
  const totalWorkSeconds = session.work_duration * 60;
  let elapsedSeconds: number;

  if (isBreak || isCompleted) {
    // Use stored work end time for accurate calculation
    const startedAt = new Date(session.started_at).getTime();
    const endedAt = workEndedAt ?? (startedAt + totalWorkSeconds * 1000);
    elapsedSeconds = Math.min((endedAt - startedAt) / 1000, totalWorkSeconds);
  } else {
    // During work: derive from countdown
    elapsedSeconds = totalWorkSeconds - timeRemaining;
  }

  const actualMinutes = elapsedSeconds / 60;
  const completionRatio = actualMinutes / session.work_duration;

  // Pro-rated XP based on actual time spent
  const actualXp = getProRatedFocusXp(actualMinutes, session.work_duration);
  const milestoneBonus = getFocusMilestoneBonus(actualMinutes);
  const belowThreshold = completionRatio < MIN_FOCUS_COMPLETION_RATIO;

  // Calculate progress percentage
  const totalSeconds = isBreak
    ? session.break_duration * 60
    : session.work_duration * 60;
  const progress = ((totalSeconds - timeRemaining) / totalSeconds) * 100;

  // SVG ring calculations
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Completion screen UI
  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "rounded-xl p-6 glass-card",
          "border border-[var(--accent-highlight)]/30",
          "bg-[var(--accent-highlight)]/5"
        )}
      >
        {/* Success animation ring */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--accent-highlight)"
                strokeWidth="4"
                opacity="0.2"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="var(--accent-highlight)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            >
              <Check size={48} className="text-[var(--accent-highlight)]" />
            </motion.div>
          </div>

          {/* Success message */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-bold text-[var(--accent-highlight)] mb-2"
          >
            Session Complete!
          </motion.h3>

          {/* Session title */}
          {session.title && (
            <p className="text-sm text-[var(--text-secondary)] mb-4 text-center truncate max-w-full">
              {session.title}
            </p>
          )}

          {/* XP earned display */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            <Zap size={24} className={belowThreshold ? "text-[var(--text-muted)]" : "text-[var(--accent-highlight)]"} />
            <span className={`text-3xl font-mono font-bold ${belowThreshold ? "text-[var(--text-muted)]" : "text-[var(--accent-highlight)]"}`}>
              +{actualXp} XP
            </span>
          </motion.div>
          <p className="text-xs text-[var(--text-muted)] mb-6">
            {belowThreshold ? (
              <span className="text-[var(--accent-warning)]">
                Complete at least 50% to earn XP
              </span>
            ) : (
              <>
                {Math.round(actualMinutes)} min of {session.work_duration} min
                {milestoneBonus > 0 && (
                  <span className="text-[var(--accent-highlight)]">
                    {" "}• +{milestoneBonus} bonus!
                  </span>
                )}
              </>
            )}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3">
            <motion.button
              onClick={completeSession}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl min-h-[48px]",
                "bg-[var(--accent-highlight)] text-black font-medium",
                "hover:bg-[var(--accent-highlight)]/90",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-highlight)] focus-visible:outline-offset-2",
                "transition-all duration-200"
              )}
            >
              <Zap size={18} />
              Claim XP
            </motion.button>
            <motion.button
              onClick={abandonSession}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors",
                "min-h-[44px] min-w-[44px] flex items-center justify-center",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              )}
              title="Discard session"
            >
              <X size={18} className="text-[var(--text-muted)]" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Active timer UI
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "rounded-xl p-6 glass-card-premium relative overflow-hidden",
        isBreak
          ? "border-[var(--accent-success)]/30 bg-[var(--accent-success)]/5"
          : "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5",
        isRunning && !isBreak && "animate-breathing"
      )}
    >
      <div className="flex flex-col items-center">
        {/* Timer Ring - responsive sizing for small screens */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 mb-4">
          {/* Background ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--bg-hover)"
              strokeWidth="6"
            />
            {/* Progress ring */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={isBreak ? "var(--accent-success)" : "var(--accent-primary)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={cn(
              "rounded-lg bg-[var(--bg-base)]/80 px-5 py-2",
              isBreak
                ? "border border-[var(--accent-success)]/20"
                : "border border-[var(--accent-primary)]/20"
            )}
            style={{
              boxShadow: isBreak
                ? "0 0 15px rgba(var(--accent-success-rgb), 0.15), inset 0 0 15px rgba(var(--accent-success-rgb), 0.05)"
                : "0 0 15px rgba(var(--accent-primary-rgb), 0.15), inset 0 0 15px rgba(var(--accent-primary-rgb), 0.05)"
            }}>
              <span
                className={cn(
                  "text-4xl font-mono font-bold",
                  isBreak ? "text-[var(--accent-success)]" : "text-[var(--text-primary)]"
                )}
                style={{
                  textShadow: isBreak
                    ? "0 0 20px rgba(var(--accent-success-rgb), 0.35)"
                    : "0 0 20px rgba(var(--accent-primary-rgb), 0.35)"
                }}
              >
                {formatCountdown(timeRemaining)}
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-1 flex items-center gap-1">
              {isBreak ? (
                <>
                  <Coffee size={12} />
                  Break Time
                </>
              ) : isRunning ? (
                "Focusing..."
              ) : (
                "Paused"
              )}
            </span>
          </div>

          {/* Glow effect when running (work mode only) */}
          <AnimatePresence>
            {isRunning && !isBreak && (
              <motion.div
                animate={{ opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-[var(--accent-primary)]/10 blur-xl -z-10"
                initial={{ opacity: 0 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Session info */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {session.title && (
            <span className="text-sm text-[var(--text-secondary)] truncate max-w-[200px]">
              {session.title}
            </span>
          )}
          {!isBreak && (
            <span className={cn(
              "flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg",
              belowThreshold
                ? "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                : "bg-[var(--accent-highlight)]/10 text-[var(--accent-highlight)]"
            )}>
              <Zap size={12} />
              +{actualXp} XP
              {belowThreshold && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({Math.round(completionRatio * 100)}% of 50%)
                </span>
              )}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {/* Play/Pause - main button */}
          <motion.button
            onClick={isRunning ? pauseSession : resumeSession}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "transition-colors",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
              "focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2",
              isBreak
                ? "bg-[var(--accent-success)] hover:bg-[var(--accent-success)]/80"
                : "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80"
            )}
          >
            {isRunning ? (
              <Pause size={24} className="text-white" />
            ) : (
              <Play size={24} className="text-white ml-1" />
            )}
          </motion.button>

          {/* Secondary controls */}
          <div className="flex items-center gap-2">
            {/* Skip (to break or end break) */}
            <motion.button
              onClick={isBreak ? skipBreak : skipToBreak}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors",
                "min-h-[44px] min-w-[44px] flex items-center justify-center",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              )}
              title={isBreak ? "End break" : "Skip to break"}
            >
              <SkipForward size={18} className="text-[var(--text-muted)]" />
            </motion.button>

            {/* Complete (only during work mode) */}
            {!isBreak && (
              <motion.button
                onClick={completeSession}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "p-3 rounded-xl bg-[var(--accent-success)] hover:bg-[var(--accent-success)]/80 transition-colors",
                  "min-h-[44px] min-w-[44px] flex items-center justify-center",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-success)]"
                )}
                title="Complete session"
              >
                <Check size={18} className="text-white" />
              </motion.button>
            )}

            {/* Abandon */}
            <motion.button
              onClick={abandonSession}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "p-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--accent-primary)]/20 transition-colors",
                "min-h-[44px] min-w-[44px] flex items-center justify-center",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              )}
              title="Abandon session"
            >
              <X size={18} className="text-[var(--text-muted)]" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
