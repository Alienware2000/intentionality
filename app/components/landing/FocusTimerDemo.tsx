"use client";

// =============================================================================
// FOCUS TIMER DEMO
// Refined OS-style Pomodoro timer preview.
// Matches the clean Command Center aesthetic with sharp borders and mono fonts.
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Zap, Timer } from "lucide-react";

const DEMO_DURATION = 15; 
const XP_PER_SECOND = 0.5;

export default function FocusTimerDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEMO_DURATION);
  const [xpEarned, setXpEarned] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const progress = ((DEMO_DURATION - timeLeft) / DEMO_DURATION) * 100;
  const circumference = 2 * Math.PI * 45; 
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
    <div className="w-full max-w-sm mx-auto bg-[var(--bg-base)] p-8 rounded-2xl border border-[var(--border-subtle)] shadow-2xl flex flex-col items-center">
      {/* Label */}
      <div className="flex items-center gap-2 mb-10 text-[var(--accent-primary)] font-bold text-[10px] uppercase tracking-widest">
         <Timer size={14} strokeWidth={2} /> Time to Focus
      </div>

      {/* Timer Ring */}
      <div className="relative w-48 h-48 mb-10">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth="4"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3, ease: "linear" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-[var(--text-primary)] tracking-tighter">
            {formatTime(timeLeft)}
          </span>
          <div className="h-1.5 w-10 bg-[var(--bg-hover)] mt-4 rounded-full overflow-hidden border border-[var(--border-subtle)]">
             {isRunning && <motion.div className="h-full bg-[var(--accent-primary)]" animate={{ x: [-20, 20] }} transition={{ repeat: Infinity, duration: 1.5 }} />}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mb-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTimer}
          disabled={isComplete}
          className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-lg ${
            isComplete
              ? "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-subtle)] shadow-none"
              : isRunning
              ? "bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/40 shadow-red-500/5"
              : "bg-[var(--text-primary)] text-[var(--bg-base)] font-bold hover:opacity-90 shadow-white/5"
          }`}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </motion.button>

        <button
          onClick={resetTimer}
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Metrics */}
      <div className="w-full grid grid-cols-2 gap-4">
         <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-center shadow-sm">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">XP Earned</div>
            <div className="text-sm font-bold text-[var(--accent-primary)] flex items-center justify-center gap-1.5">
               <Zap size={14} />+{Math.round(xpEarned)}
            </div>
         </div>
         <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-center shadow-sm">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</div>
            <div className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-tight">
               {isComplete ? "Done" : isRunning ? "Focusing" : "Paused"}
            </div>
         </div>
      </div>
    </div>
  );
}
