"use client";

// =============================================================================
// CELEBRATION OVERLAY
// Displays celebratory animations for XP gains, level ups, streaks,
// achievements, and challenges. Uses Framer Motion for smooth animations.
// =============================================================================

import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Trophy,
  Flame,
  Star,
  Award,
  CheckCircle,
  Target,
  Sparkles,
  Crown,
} from "lucide-react";
import type { AchievementWithProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CelebrationEventType =
  | "xp"
  | "level-up"
  | "streak"
  | "quest-complete"
  | "achievement-bronze"
  | "achievement-silver"
  | "achievement-gold"
  | "challenge-complete"
  | "daily-sweep"
  | "streak-milestone"
  | "perfect-day"
  | "group-challenge-complete"
  | "weekly-winner";

type CelebrationEvent = {
  id: string;
  type: CelebrationEventType;
  value?: number;
  message?: string;
  achievement?: AchievementWithProgress;
  metadata?: Record<string, unknown>;
};

type CelebrationContextValue = {
  showXpGain: (xp: number) => void;
  showLevelUp: (level: number) => void;
  showStreakMilestone: (streak: number) => void;
  showQuestComplete: (questName: string) => void;
  showAchievement: (achievement: AchievementWithProgress, tier: "bronze" | "silver" | "gold") => void;
  showChallengeComplete: (challengeName: string, xp: number) => void;
  showDailySweep: () => void;
  showPerfectDay: () => void;
  showGroupChallengeComplete: (challengeName: string, groupName: string, xp: number) => void;
  showWeeklyWinner: (groupName: string, place: number, xpBonus: number) => void;
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
// Achievement Tier Colors
// -----------------------------------------------------------------------------

const TIER_COLORS = {
  bronze: {
    bg: "bg-[var(--tier-bronze-text)]/20",
    border: "border-[var(--tier-bronze-text)]",
    text: "text-[var(--tier-bronze-text)]",
    glow: "var(--tier-bronze-glow)",
  },
  silver: {
    bg: "bg-[var(--tier-silver-text)]/20",
    border: "border-[var(--tier-silver-text)]",
    text: "text-[var(--tier-silver-text)]",
    glow: "var(--tier-silver-glow)",
  },
  gold: {
    bg: "bg-[var(--tier-gold-text)]/20",
    border: "border-[var(--tier-gold-text)]",
    text: "text-[var(--tier-gold-text)]",
    glow: "var(--tier-gold-glow)",
  },
};

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
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-highlight)]/30 shadow-lg shadow-[var(--accent-highlight)]/20">
        <Zap size={18} className="text-[var(--accent-highlight)]" fill="currentColor" />
        <span className="text-lg font-mono font-bold text-[var(--accent-highlight)]">+{xp} XP</span>
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
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm"
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
              "0 0 20px var(--levelup-glow-soft)",
              "0 0 60px var(--levelup-glow)",
              "0 0 20px var(--levelup-glow-soft)",
            ],
          }}
          transition={{ duration: 2, repeat: 3 }}
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
// Achievement Unlock Animation
// -----------------------------------------------------------------------------

function AchievementAnimation({
  achievement,
  tier,
  onComplete,
}: {
  achievement: AchievementWithProgress;
  tier: "bronze" | "silver" | "gold";
  onComplete: () => void;
}) {
  const colors = TIER_COLORS[tier];
  const xpReward =
    tier === "gold"
      ? achievement.gold_xp
      : tier === "silver"
      ? achievement.silver_xp
      : achievement.bronze_xp;

  const isGold = tier === "gold";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isGold ? "modal-backdrop-heavy" : "modal-backdrop"
      } backdrop-blur-sm`}
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
        className="flex flex-col items-center gap-4 p-8 max-w-sm mx-4"
      >
        <motion.div
          animate={{
            boxShadow: [
              `0 0 20px ${colors.glow.replace("0.6", "0.3")}`,
              `0 0 60px ${colors.glow}`,
              `0 0 20px ${colors.glow.replace("0.6", "0.3")}`,
            ],
          }}
          transition={{ duration: 2, repeat: 3 }}
          className={`p-6 rounded-full ${colors.bg} border-2 ${colors.border}`}
        >
          <Award size={isGold ? 72 : 56} className={colors.text} />
        </motion.div>

        <div className="text-center">
          <p className={`text-sm font-bold tracking-widest uppercase ${colors.text}`}>
            {tier.toUpperCase()} Achievement!
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-2">
            {achievement.name}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {achievement.description}
          </p>
          <p className={`text-lg font-mono font-bold ${colors.text} mt-3`}>
            +{xpReward} XP
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
// Challenge Complete Animation
// -----------------------------------------------------------------------------

function ChallengeCompleteAnimation({
  message,
  xp,
  onComplete,
}: {
  message: string;
  xp: number;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{ type: "spring", duration: 0.5 }}
      onAnimationComplete={() => setTimeout(onComplete, 3000)}
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-highlight)] shadow-lg shadow-[var(--accent-highlight)]/20">
        <div className="p-2 rounded-full bg-[var(--accent-highlight)]/20">
          <Target size={20} className="text-[var(--accent-highlight)]" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-highlight)]">
            Challenge Complete!
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {message}
          </p>
          <p className="text-sm font-mono font-bold text-[var(--accent-highlight)]">
            +{xp} XP
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Daily Sweep Animation
// -----------------------------------------------------------------------------

function DailySweepAnimation({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", duration: 0.6 }}
      onAnimationComplete={() => setTimeout(onComplete, 3000)}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-[var(--bg-card)] border-2 border-[var(--accent-success)] shadow-xl">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          <CheckCircle size={48} className="text-[var(--accent-success)]" />
        </motion.div>
        <div className="text-center">
          <p className="text-xl font-bold text-[var(--accent-success)]">
            Daily Sweep!
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            All daily challenges completed
          </p>
          <p className="text-lg font-mono font-bold text-[var(--accent-success)] mt-2">
            +25 XP Bonus
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Perfect Day Animation
// -----------------------------------------------------------------------------

function PerfectDayAnimation({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
        className="flex flex-col items-center gap-4 p-8"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px var(--tier-gold-glow)",
              "0 0 80px var(--tier-gold-glow)",
              "0 0 20px var(--tier-gold-glow)",
            ],
          }}
          transition={{ duration: 1.5, repeat: 3 }}
          className="p-6 rounded-full bg-[var(--tier-gold-text)]/20"
        >
          <Crown size={64} className="text-[var(--tier-gold-text)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="flex items-center gap-2 justify-center">
            <Sparkles size={24} className="text-[var(--tier-gold-text)]" />
            <p className="text-2xl font-bold text-[var(--tier-gold-text)]">
              Perfect Day!
            </p>
            <Sparkles size={24} className="text-[var(--tier-gold-text)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            All habits completed + 3 tasks done
          </p>
          <p className="text-xl font-mono font-bold text-[var(--tier-gold-text)] mt-3">
            +50 XP Bonus
          </p>
        </motion.div>

        <p className="text-sm text-[var(--text-muted)] mt-4">
          Click anywhere to continue
        </p>
      </motion.div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Group Challenge Complete Animation
// -----------------------------------------------------------------------------

function GroupChallengeCompleteAnimation({
  challengeName,
  groupName,
  xp,
  onComplete,
}: {
  challengeName: string;
  groupName: string;
  xp: number;
  onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      transition={{ type: "spring", duration: 0.5 }}
      onAnimationComplete={() => setTimeout(onComplete, 4000)}
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-success)] shadow-lg shadow-[var(--accent-success)]/20">
        <div className="p-2 rounded-full bg-[var(--accent-success)]/20">
          <CheckCircle size={24} className="text-[var(--accent-success)]" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-success)]">
            Group Challenge Complete!
          </p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {challengeName}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {groupName} achieved this together
          </p>
          <p className="text-sm font-mono font-bold text-[var(--accent-success)] mt-1">
            +{xp} XP for everyone!
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Weekly Winner Animation
// -----------------------------------------------------------------------------

function WeeklyWinnerAnimation({
  groupName,
  place,
  xpBonus,
  onComplete,
}: {
  groupName: string;
  place: number;
  xpBonus: number;
  onComplete: () => void;
}) {
  const placeText = place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
  const placeEmoji = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop backdrop-blur-sm"
      onClick={onComplete}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
        className="flex flex-col items-center gap-4 p-8 max-w-sm mx-4"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px var(--tier-gold-glow)",
              "0 0 60px var(--tier-gold-glow)",
              "0 0 20px var(--tier-gold-glow)",
            ],
          }}
          transition={{ duration: 2, repeat: 3 }}
          className="p-6 rounded-full bg-[var(--tier-gold-text)]/20"
        >
          <Trophy size={64} className="text-[var(--tier-gold-text)]" />
        </motion.div>

        <div className="text-center">
          <p className="text-4xl mb-2">{placeEmoji}</p>
          <p className="text-lg font-bold tracking-widest uppercase text-[var(--tier-gold-text)]">
            {placeText} Place!
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            You won in <span className="font-medium text-[var(--text-primary)]">{groupName}</span>
          </p>
          <p className="text-xl font-mono font-bold text-[var(--tier-gold-text)] mt-3">
            +{xpBonus} XP Bonus
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
    // Only show for milestone streaks
    const milestones = [7, 14, 21, 30, 60, 90, 100, 150, 180, 200, 365];
    if (milestones.includes(streak)) {
      addEvent({ type: "streak-milestone", value: streak });
    }
  }, [addEvent]);

  const showQuestComplete = useCallback((questName: string) => {
    addEvent({ type: "quest-complete", message: questName });
  }, [addEvent]);

  const showAchievement = useCallback(
    (achievement: AchievementWithProgress, tier: "bronze" | "silver" | "gold") => {
      addEvent({
        type: `achievement-${tier}` as CelebrationEventType,
        achievement,
      });
    },
    [addEvent]
  );

  const showChallengeComplete = useCallback((challengeName: string, xp: number) => {
    addEvent({ type: "challenge-complete", message: challengeName, value: xp });
  }, [addEvent]);

  const showDailySweep = useCallback(() => {
    addEvent({ type: "daily-sweep" });
  }, [addEvent]);

  const showPerfectDay = useCallback(() => {
    addEvent({ type: "perfect-day" });
  }, [addEvent]);

  const showGroupChallengeComplete = useCallback((challengeName: string, groupName: string, xp: number) => {
    addEvent({
      type: "group-challenge-complete",
      message: `${challengeName}|${groupName}`,
      value: xp,
    });
  }, [addEvent]);

  const showWeeklyWinner = useCallback((groupName: string, place: number, xpBonus: number) => {
    addEvent({
      type: "weekly-winner",
      message: groupName,
      value: xpBonus,
      metadata: { place },
    });
  }, [addEvent]);

  return (
    <CelebrationContext.Provider
      value={{
        showXpGain,
        showLevelUp,
        showStreakMilestone,
        showQuestComplete,
        showAchievement,
        showChallengeComplete,
        showDailySweep,
        showPerfectDay,
        showGroupChallengeComplete,
        showWeeklyWinner,
      }}
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
            case "streak-milestone":
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
            case "achievement-bronze":
              return event.achievement ? (
                <AchievementAnimation
                  key={event.id}
                  achievement={event.achievement}
                  tier="bronze"
                  onComplete={() => removeEvent(event.id)}
                />
              ) : null;
            case "achievement-silver":
              return event.achievement ? (
                <AchievementAnimation
                  key={event.id}
                  achievement={event.achievement}
                  tier="silver"
                  onComplete={() => removeEvent(event.id)}
                />
              ) : null;
            case "achievement-gold":
              return event.achievement ? (
                <AchievementAnimation
                  key={event.id}
                  achievement={event.achievement}
                  tier="gold"
                  onComplete={() => removeEvent(event.id)}
                />
              ) : null;
            case "challenge-complete":
              return (
                <ChallengeCompleteAnimation
                  key={event.id}
                  message={event.message ?? "Challenge"}
                  xp={event.value ?? 0}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            case "daily-sweep":
              return (
                <DailySweepAnimation
                  key={event.id}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            case "perfect-day":
              return (
                <PerfectDayAnimation
                  key={event.id}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            case "group-challenge-complete": {
              const [challengeName, groupName] = (event.message ?? "|").split("|");
              return (
                <GroupChallengeCompleteAnimation
                  key={event.id}
                  challengeName={challengeName}
                  groupName={groupName}
                  xp={event.value ?? 0}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            }
            case "weekly-winner": {
              const place = (event.metadata?.place as number) ?? 1;
              const xpBonus = event.value ?? 0;
              return (
                <WeeklyWinnerAnimation
                  key={event.id}
                  groupName={event.message ?? ""}
                  place={place}
                  xpBonus={xpBonus}
                  onComplete={() => removeEvent(event.id)}
                />
              );
            }
            default:
              return null;
          }
        })}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}
