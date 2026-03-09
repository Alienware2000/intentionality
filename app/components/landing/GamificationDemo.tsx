"use client";

// =============================================================================
// GAMIFICATION DEMO
// Refined OS-style XP/Level demo.
// Uses technical layout, monospace stats, and sharp brand-consistent colors.
// =============================================================================

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import anime from "animejs";
import { Zap, Trophy, CheckCircle, Sparkles, Terminal } from "lucide-react";
import { prefersReducedMotion } from "@/app/lib/anime-utils";

const TASKS = [
  { id: 1, title: "Review flashcards", xp: 10, done: false },
  { id: 2, title: "Complete problem set", xp: 25, done: false },
  { id: 3, title: "Read chapter 5", xp: 15, done: false },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700];

export default function GamificationDemo() {
  const [xp, setXp] = useState(75);
  const [level, setLevel] = useState(1);
  const [tasks, setTasks] = useState(TASKS);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const xpBarRef = useRef<HTMLDivElement>(null);

  const currentLevelXp = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXp = LEVEL_THRESHOLDS[level] || 100;
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progress = Math.min((xpInLevel / xpNeeded) * 100, 100);

  const completeTask = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.done) return;

    const newXp = xp + task.xp;

    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -80 - 20,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);

    if (xpBarRef.current && !prefersReducedMotion()) {
      anime({
        targets: xpBarRef.current,
        scale: [1, 1.02, 1],
        duration: 300,
        easing: "easeOutQuad",
      });
    }

    if (newXp >= nextLevelXp && level < LEVEL_THRESHOLDS.length) {
      setTimeout(() => {
        setLevel((l) => l + 1);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2500);
      }, 500);
    }

    setXp(newXp);
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, done: true } : t)));
  };

  const resetDemo = () => {
    setXp(75);
    setLevel(1);
    setTasks(TASKS.map((t) => ({ ...t, done: false })));
    setShowLevelUp(false);
  };

  const allDone = tasks.every((t) => t.done);

  return (
    <div className="w-full max-w-sm mx-auto relative bg-[var(--bg-base)] p-8 rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
      
      {/* Level Up Overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-base)]/95 backdrop-blur-md"
          >
            <div className="text-center">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex p-5 rounded-full bg-[var(--accent-primary)] text-white mb-6 shadow-2xl shadow-red-500/20"
              >
                <Trophy size={48} />
              </motion.div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent-primary)] mb-2">Level Up!</p>
              <p className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">Level {level}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-10 pb-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center shadow-lg shadow-red-500/10">
            <span className="text-2xl font-bold text-white">
              {level}
            </span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Your Progress</div>
            <p className="text-[15px] font-bold text-[var(--text-primary)]">
              {xp.toLocaleString()} XP Total
            </p>
          </div>
        </div>

        {allDone && (
          <button
            onClick={resetDemo}
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)] hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* XP Bar */}
      <div className="mb-10">
        <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)] uppercase mb-3">
          <span>Next Level</span>
          <span className="text-[var(--accent-primary)]">
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
          <motion.div
            className="h-full bg-[var(--accent-primary)]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => completeTask(task.id)}
            disabled={task.done}
            className={`relative w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
              task.done
                ? "bg-[var(--bg-elevated)] border-transparent opacity-40 grayscale"
                : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 hover:translate-x-1 cursor-pointer shadow-sm"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                task.done
                  ? "bg-[var(--accent-success)] border-[var(--accent-success)] text-white"
                  : "border-[var(--border-default)] bg-[var(--bg-base)]"
              }`}
            >
              {task.done && <CheckCircle size={12} strokeWidth={3} />}
            </div>
            <span
              className={`flex-1 text-left text-[14px] ${
                task.done
                  ? "line-through text-[var(--text-muted)]"
                  : "text-[var(--text-primary)] font-bold"
              }`}
            >
              {task.title}
            </span>
            <span
              className={`flex items-center gap-1 text-[12px] font-bold ${
                task.done
                  ? "text-[var(--text-muted)]"
                  : "text-[var(--accent-primary)]"
              }`}
            >
              <Zap size={12} fill="currentColor" />+{task.xp}
            </span>

            {/* Particles */}
            <AnimatePresence>
              {!task.done &&
                particles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{ opacity: 0, x: p.x, y: p.y, scale: 0.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute right-6"
                  >
                    <Sparkles size={12} className="text-[var(--accent-primary)]" />
                  </motion.div>
                ))}
            </AnimatePresence>
          </button>
        ))}
      </div>

      <div className="mt-8 text-center">
         <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Complete tasks to level up</p>
      </div>
    </div>
  );
}
