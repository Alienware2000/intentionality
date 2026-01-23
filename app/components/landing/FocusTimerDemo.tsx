"use client";

// =============================================================================
// FOCUS TIMER DEMO
// Interactive Pomodoro timer preview. Users can start a demo session
// and watch the ring fill with XP accumulating in real-time.
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Zap } from "lucide-react";

const DEMO_DURATION = 15; // 15 seconds for demo
const XP_PER_SECOND = 0.5;

export default function FocusTimerDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEMO_DURATION);
  const [xpEarned, setXpEarned] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = ((DEMO_DURATION - timeLeft) / DEMO_DURATION) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setIsRunning(false);
            return 0;
          }
          return t - 1;
        });
        setXpEarned((xp) => xp + XP_PER_SECOND);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(DEMO_DURATION);
    setXpEarned(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isComplete = timeLeft === 0;

  return (
    <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
      <div className="flex flex-col items-center">
        {/* Timer Ring */}
        <div className="relative w-48 h-48 mb-6">
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
              stroke="var(--accent-primary)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold text-[var(--text-primary)]">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide mt-1">
              {isComplete ? "Complete!" : isRunning ? "Focusing..." : "Ready"}
            </span>
          </div>

          {/* Glow effect when running */}
          {isRunning && (
            <motion.div
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-[var(--accent-primary)]/10 blur-xl -z-10"
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTimer}
            disabled={isComplete}
            className={`flex items-center justify-center w-14 h-14 rounded-full transition-colors ${
              isComplete
                ? "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
                : isRunning
                ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/30"
                : "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
            }`}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetTimer}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw size={18} />
          </motion.button>
        </div>

        {/* XP Earned */}
        <motion.div
          initial={false}
          animate={xpEarned > 0 ? { scale: [1, 1.05, 1] } : {}}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10"
        >
          <Zap size={16} className="text-[var(--accent-primary)]" />
          <span className="font-mono font-bold text-[var(--accent-primary)]">
            +{Math.round(xpEarned)} XP
          </span>
        </motion.div>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          {isComplete
            ? "Great focus session! Reset to try again."
            : "Start a demo focus session (15 seconds)"}
        </p>
      </div>
    </div>
  );
}
