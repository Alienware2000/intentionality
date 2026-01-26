"use client";

// =============================================================================
// ANALYTICS CLIENT COMPONENT
// Main analytics dashboard with stats, charts, and gamification features.
// Enhanced with anime.js-style wave stagger, animated counters, and smooth transitions.
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { Target, Flame, Clock, Zap, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import anime from "animejs";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { prefersReducedMotion } from "@/app/lib/anime-utils";
import XpChart from "@/app/components/charts/XpChart";
import ActivityHeatmap from "@/app/components/charts/ActivityHeatmap";
import {
  DailyChallengesSection,
  WeeklyChallengeCard,
  AchievementGrid,
} from "@/app/components/gamification";
import type { GamificationProfile, AchievementWithProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type AnalyticsData = {
  ok: true;
  overview: {
    xpTotal: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number;
    totalFocusMinutes: number;
    focusSessionsCompleted: number;
    habitCompletions: number;
    xpEarnedInPeriod: number;
  };
  xpHistory: Array<{ date: string; xp: number }>;
  activityHeatmap: Array<{ date: string; count: number }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
};

type AchievementsResponse = {
  ok: true;
  achievements: AchievementWithProgress[];
  summary: {
    total: number;
    unlocked: number;
    bronze: number;
    silver: number;
    gold: number;
  };
};

// Animation variants - anime.js-style wave stagger with spring physics
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

// -----------------------------------------------------------------------------
// Stat Card Component
// -----------------------------------------------------------------------------

type StatCardProps = {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  accent?: "primary" | "success" | "streak" | "highlight";
  delay?: number;
};

function StatCard({ label, value, subValue, icon, accent = "primary", delay = 0 }: StatCardProps) {
  const valueRef = useRef<HTMLParagraphElement>(null);

  const accentColors = {
    primary: "text-[var(--accent-primary)]",
    success: "text-[var(--accent-success)]",
    streak: "text-[var(--accent-streak)]",
    highlight: "text-[var(--accent-highlight)]",
  };

  const iconBgColors = {
    primary: "bg-[var(--accent-primary)]/10",
    success: "bg-[var(--accent-success)]/10",
    streak: "bg-[var(--accent-streak)]/10",
    highlight: "bg-[var(--accent-highlight)]/10",
  };

  // Animate numeric value with spring easing
  useEffect(() => {
    if (prefersReducedMotion() || !valueRef.current) return;

    const numericValue = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, ""));
    if (isNaN(numericValue)) return;

    const el = valueRef.current;
    anime({
      targets: { val: 0 },
      val: numericValue,
      round: 1,
      duration: 800,
      delay: delay * 80 + 200,
      easing: "spring(1, 80, 12, 0)",
      update: (anim) => {
        const currentVal = Math.round((anim.animations[0] as unknown as { currentValue: number }).currentValue);
        if (typeof value === "string") {
          const prefix = value.match(/^[^0-9]*/)?.[0] ?? "";
          const suffix = value.match(/[^0-9]*$/)?.[0] ?? "";
          el.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;
        } else {
          el.textContent = currentVal.toLocaleString();
        }
      },
    });
  }, [value, delay]);

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ type: "spring" as const, stiffness: 200, damping: 15 }}
      className={cn(
        "rounded-xl glass-card",
        "bg-[var(--bg-card)]",
        "border border-[var(--border-subtle)]",
        "hover:border-[var(--border-default)]",
        "p-4 transition-all duration-200"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {label}
          </p>
          <p
            ref={valueRef}
            className={cn("text-2xl font-mono font-bold mt-1 rounded", accentColors[accent])}
          >
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{subValue}</p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg", iconBgColors[accent], accentColors[accent])}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [achievementSummary, setAchievementSummary] = useState<AchievementsResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsResult, profileResult, achievementsResult] = await Promise.all([
        fetchApi<AnalyticsData>(`/api/analytics?days=${days}`),
        fetchApi<GamificationProfile>("/api/gamification/profile"),
        fetchApi<AchievementsResponse>("/api/achievements"),
      ]);

      setData(analyticsResult);
      setProfile(profileResult);
      setAchievements(achievementsResult.achievements);
      setAchievementSummary(achievementsResult.summary);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse bg-[var(--skeleton-bg)] rounded-lg"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[var(--accent-primary)]">Error: {error}</p>
    );
  }

  if (!data) return null;

  const { overview, xpHistory, activityHeatmap } = data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Time Period Selector with slide indicator */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className={cn(
          "flex items-center gap-2 p-3 rounded-xl",
          "bg-[var(--bg-card)] glass-card",
          "border border-[var(--border-subtle)]"
        )}
      >
        <span className="text-sm text-[var(--text-muted)]">Period:</span>
        <div className="relative flex gap-1">
          {[7, 14, 30, 60, 90].map((d, index) => (
            <motion.button
              key={d}
              onClick={() => setDays(d)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg transition-colors z-10",
                days === d
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {/* Active indicator with layout animation */}
              {days === d && (
                <motion.div
                  layoutId="period-indicator"
                  className="absolute inset-0 bg-[var(--accent-primary)] rounded-lg -z-10"
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                />
              )}
              {d}d
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Overview Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      >
        <StatCard
          label="Total XP"
          value={overview.xpTotal.toLocaleString()}
          subValue={`Level ${overview.level}`}
          icon={<Zap size={18} />}
          accent="primary"
          delay={0}
        />
        <StatCard
          label="Current Streak"
          value={`${overview.currentStreak} days`}
          subValue={`Best: ${overview.longestStreak} days`}
          icon={<Flame size={18} />}
          accent="streak"
          delay={1}
        />
        <StatCard
          label="Tasks Completed"
          value={overview.completedTasks}
          subValue={`${overview.taskCompletionRate}% completion rate`}
          icon={<Target size={18} />}
          accent="success"
          delay={2}
        />
        <StatCard
          label="Focus Time"
          value={formatMinutes(overview.totalFocusMinutes)}
          subValue={`${overview.focusSessionsCompleted} sessions`}
          icon={<Clock size={18} />}
          accent="highlight"
          delay={3}
        />
      </motion.div>

      {/* Period Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
      >
        <StatCard
          label={`XP Earned (${days}d)`}
          value={`+${overview.xpEarnedInPeriod.toLocaleString()}`}
          icon={<TrendingUp size={18} />}
          accent="primary"
          delay={0}
        />
        <StatCard
          label="Habits Completed"
          value={overview.habitCompletions}
          subValue={`In last ${days} days`}
          icon={<CheckCircle2 size={18} />}
          accent="success"
          delay={1}
        />
        <StatCard
          label="Avg Daily XP"
          value={Math.round(overview.xpEarnedInPeriod / days)}
          subValue="XP per day"
          icon={<Zap size={18} />}
          accent="highlight"
          delay={2}
        />
      </motion.div>

      {/* XP Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "rounded-xl glass-card",
          "bg-[var(--bg-card)]",
          "border border-[var(--border-subtle)]",
          "p-4"
        )}
      >
        <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          XP Over Time
        </h3>
        <XpChart data={xpHistory} />
      </motion.div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className={cn(
          "rounded-xl glass-card",
          "bg-[var(--bg-card)]",
          "border border-[var(--border-subtle)]",
          "p-4"
        )}
      >
        <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Activity Heatmap
        </h3>
        <ActivityHeatmap data={activityHeatmap} />
      </motion.div>

      {/* Challenges Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "rounded-xl glass-card",
            "bg-[var(--bg-card)]",
            "border border-[var(--border-subtle)]",
            "p-4"
          )}
        >
          <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
            Daily Challenges
          </h3>
          {profile && (
            <DailyChallengesSection
              challenges={profile.dailyChallenges}
              onRefresh={loadData}
            />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={cn(
            "rounded-xl glass-card",
            "bg-[var(--bg-card)]",
            "border border-[var(--border-subtle)]",
            "p-4"
          )}
        >
          <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
            Weekly Challenge
          </h3>
          {profile && <WeeklyChallengeCard challenge={profile.weeklyChallenge} />}
        </motion.div>
      </div>

      {/* Achievements - full width */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn(
          "rounded-xl glass-card",
          "bg-[var(--bg-card)]",
          "border border-[var(--border-subtle)]",
          "p-4"
        )}
      >
        <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
          Achievements
        </h3>
        <AchievementGrid
          achievements={achievements}
          summary={achievementSummary ?? undefined}
        />
      </motion.div>
    </motion.div>
  );
}
