"use client";

// =============================================================================
// CELEBRATION OVERLAY
// Displays celebratory animations for XP gains, level ups, and streaks.
// Uses Framer Motion for smooth animations.
// =============================================================================

import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, Flame, Star } from "lucide-react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CelebrationEvent = {
  id: string;
  type: "xp" | "level-up" | "streak" | "quest-complete";
  value?: number;
  message?: string;
};

type CelebrationContextValue = {
  showXpGain: (xp: number) => void;
  showLevelUp: (level: number) => void;
  showStreakMilestone: (streak: number) => void;
  showQuestComplete: (questName: string) => void;
};

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) {
    throw new Error("useCelebration must be used within CelebrationProvider");
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// XP Gain Animation
// -----------------------------------------------------------------------------

function XpGainAnimation({ xp, onComplete }: { xp: number; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: -30, scale: 1 }}
      exit={{ opacity: 0, y: -60, scale: 0.8 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="fixed bottom-24 right-4 sm:right-8 z-50 pointer-events-none"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)] shadow-lg">
        <Zap size={18} className="text-white" />
        <span className="text-lg font-mono font-bold text-white">+{xp} XP</span>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Level Up Animation
// -----------------------------------------------------------------------------

function LevelUpAnimation({ level, onComplete }: { level: number; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
        className="flex flex-col items-center gap-4 p-8"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px rgba(235, 255, 165, 0.3)",
              "0 0 60px rgba(235, 255, 165, 0.6)",
              "0 0 20px rgba(235, 255, 165, 0.3)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="p-6 rounded-full bg-[var(--accent-highlight)]/20"
        >
          <Trophy size={64} className="text-[var(--accent-highlight)]" />
        </motion.div>

        <div className="text-center">
          <p className="text-lg font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Level Up!
          </p>
          <p className="text-4xl sm:text-6xl font-mono font-bold text-[var(--accent-highlight)] mt-2">
            LVL {level}
          </p>
        </div>

        <p className="text-sm text-[var(--text-muted)] mt-4">
          Click anywhere to continue
        </p>
      </motion.div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Streak Milestone Animation
// -----------------------------------------------------------------------------

function StreakMilestoneAnimation({ streak, onComplete }: { streak: number; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: "spring", duration: 0.5 }}
      onAnimationComplete={() => setTimeout(onComplete, 2000)}
      className="fixed top-20 right-4 sm:top-24 sm:right-8 z-50"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-streak)] shadow-lg">
        <div className="p-2 rounded-full bg-[var(--accent-streak)]/20">
          <Flame size={20} className="text-[var(--accent-streak)]" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-streak)]">
            Streak Milestone!
          </p>
          <p className="text-lg font-mono font-bold text-[var(--text-primary)]">
            {streak} days
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Quest Complete Animation
// -----------------------------------------------------------------------------

function QuestCompleteAnimation({ questName, onComplete }: { questName: string; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ type: "spring", duration: 0.5 }}
      onAnimationComplete={() => setTimeout(onComplete, 3000)}
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-success)] shadow-lg">
        <div className="p-2 rounded-full bg-[var(--accent-success)]/20">
          <Star size={20} className="text-[var(--accent-success)]" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-success)]">
            Quest Complete!
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {questName}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function CelebrationProvider({ children }: Props) {
  const [events, setEvents] = useState<CelebrationEvent[]>([]);

  const addEvent = useCallback((event: Omit<CelebrationEvent, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setEvents((prev) => [...prev, { ...event, id }]);
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const showXpGain = useCallback((xp: number) => {
    addEvent({ type: "xp", value: xp });
  }, [addEvent]);

  const showLevelUp = useCallback((level: number) => {
    addEvent({ type: "level-up", value: level });
  }, [addEvent]);

  const showStreakMilestone = useCallback((streak: number) => {
    // Only show for milestone streaks (7, 14, 30, 60, 100, etc.)
    const milestones = [7, 14, 21, 30, 60, 90, 100, 150, 200, 365];
    if (milestones.includes(streak)) {
      addEvent({ type: "streak", value: streak });
    }
  }, [addEvent]);

  const showQuestComplete = useCallback((questName: string) => {
    addEvent({ type: "quest-complete", message: questName });
  }, [addEvent]);

  return (
    <CelebrationContext.Provider
      value={{ showXpGain, showLevelUp, showStreakMilestone, showQuestComplete }}
    >
      {children}

      <AnimatePresence>
        {events.map((event) => {
          switch (event.type) {
            case "xp":
              return (
                <XpGainAnimation
                  key={event.id}
                  xp={event.value ?? 0}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            case "level-up":
              return (
                <LevelUpAnimation
                  key={event.id}
                  level={event.value ?? 1}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            case "streak":
              return (
                <StreakMilestoneAnimation
                  key={event.id}
                  streak={event.value ?? 0}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            case "quest-complete":
              return (
                <QuestCompleteAnimation
                  key={event.id}
                  questName={event.message ?? ""}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}
