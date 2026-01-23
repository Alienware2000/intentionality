"use client";

// =============================================================================
// GAMIFICATION DEMO
// Interactive XP/Level demo where users can click to complete tasks,
// watch XP fill, and trigger level-up animations.
// =============================================================================

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import anime from "animejs";
import { Zap, Trophy, CheckCircle, Sparkles } from "lucide-react";
import { prefersReducedMotion } from "@/app/lib/anime-utils";

const TASKS = [
  { id: 1, title: "Review flashcards", xp: 10, done: false },
  { id: 2, title: "Complete problem set", xp: 25, done: false },
  { id: 3, title: "Read chapter 5", xp: 15, done: false },
];

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700]; // XP needed for each level

export default function GamificationDemo() {
  const [xp, setXp] = useState(75);
  const [level, setLevel] = useState(1);
  const [tasks, setTasks] = useState(TASKS);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  const xpBarRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);

  const currentLevelXp = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXp = LEVEL_THRESHOLDS[level] || 100;
  const xpInLevel = xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progress = Math.min((xpInLevel / xpNeeded) * 100, 100);

  const completeTask = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.done) return;

    const newXp = xp + task.xp;

    // Create particles
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -80 - 20,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);

    // Animate XP bar
    if (xpBarRef.current && !prefersReducedMotion()) {
      anime({
        targets: xpBarRef.current,
        scale: [1, 1.02, 1],
        duration: 300,
        easing: "easeOutQuad",
      });
    }

    // Check for level up
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
    <div className="relative">
      {/* Level Up Overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-card)]/90 backdrop-blur-sm rounded-xl"
          >
            <div className="text-center">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 0.5 }}
                className="inline-flex p-4 rounded-full bg-[var(--accent-highlight)]/20 mb-4"
              >
                <Trophy size={40} className="text-[var(--accent-highlight)]" />
              </motion.div>
              <p className="text-lg font-bold text-[var(--accent-highlight)]">
                Level Up!
              </p>
              <p className="text-3xl font-mono font-bold text-[var(--text-primary)] mt-1">
                LVL {level}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main demo */}
      <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
              <span className="text-lg font-bold text-[var(--accent-primary)]">
                {level}
              </span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Level
              </p>
              <p className="text-lg font-bold font-mono text-[var(--text-primary)]">
                {xp.toLocaleString()} XP
              </p>
            </div>
          </div>

          {allDone && (
            <button
              onClick={resetDemo}
              className="px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition-colors"
            >
              Reset Demo
            </button>
          )}
        </div>

        {/* XP Bar */}
        <div className="mb-6" ref={xpBarRef}>
          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Progress to Level {level + 1}</span>
            <span>
              {xpInLevel} / {xpNeeded} XP
            </span>
          </div>
          <div className="h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)]/80 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-2" ref={particleContainerRef}>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Click to complete
          </p>
          {tasks.map((task) => (
            <motion.button
              key={task.id}
              onClick={() => completeTask(task.id)}
              disabled={task.done}
              whileHover={task.done ? {} : { scale: 1.01 }}
              whileTap={task.done ? {} : { scale: 0.99 }}
              className={`relative w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
                task.done
                  ? "bg-[var(--bg-hover)] border-[var(--border-subtle)] opacity-60 cursor-default"
                  : "bg-[var(--bg-card)] border-[var(--border-default)] hover:border-[var(--accent-primary)]/50 cursor-pointer"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  task.done
                    ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                    : "border-[var(--text-muted)]"
                }`}
              >
                {task.done && <CheckCircle size={12} className="text-white" />}
              </div>
              <span
                className={`flex-1 text-left ${
                  task.done
                    ? "line-through text-[var(--text-muted)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {task.title}
              </span>
              <span
                className={`flex items-center gap-1 text-sm font-mono ${
                  task.done
                    ? "text-[var(--text-muted)]"
                    : "text-[var(--accent-primary)]"
                }`}
              >
                <Zap size={12} />+{task.xp}
              </span>

              {/* Particles */}
              <AnimatePresence>
                {!task.done &&
                  particles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                      animate={{
                        opacity: 0,
                        x: p.x,
                        y: p.y,
                        scale: 0.5,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute right-4 top-1/2"
                    >
                      <Sparkles size={12} className="text-[var(--accent-primary)]" />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          {allDone
            ? "Nice work! Click reset to try again."
            : "Click tasks to earn XP and level up"}
        </p>
      </div>
    </div>
  );
}
