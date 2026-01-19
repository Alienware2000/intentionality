"use client";

// =============================================================================
// ANALYTICS CLIENT COMPONENT
// Main analytics dashboard with stats, charts, and gamification features.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { Target, Flame, Clock, Zap, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
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

// -----------------------------------------------------------------------------
// Stat Card Component
// -----------------------------------------------------------------------------

type StatCardProps = {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  accent?: "primary" | "success" | "streak" | "highlight";
};

function StatCard({ label, value, subValue, icon, accent = "primary" }: StatCardProps) {
  const accentColors = {
    primary: "text-[var(--accent-primary)]",
    success: "text-[var(--accent-success)]",
    streak: "text-[var(--accent-streak)]",
    highlight: "text-[var(--accent-highlight)]",
  };

  return (
    <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {label}
          </p>
          <p className={cn("text-2xl font-mono font-bold mt-1", accentColors[accent])}>
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{subValue}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg bg-[var(--bg-elevated)]", accentColors[accent])}>
          {icon}
        </div>
      </div>
    </div>
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
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-muted)]">Period:</span>
        <div className="flex gap-1">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "px-3 py-2 sm:py-1 text-xs font-medium rounded transition-colors",
                days === d
                  ? "bg-[var(--accent-primary)] text-white"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <StatCard
          label="Total XP"
          value={overview.xpTotal.toLocaleString()}
          subValue={`Level ${overview.level}`}
          icon={<Zap size={18} />}
          accent="primary"
        />
        <StatCard
          label="Current Streak"
          value={`${overview.currentStreak} days`}
          subValue={`Best: ${overview.longestStreak} days`}
          icon={<Flame size={18} />}
          accent="streak"
        />
        <StatCard
          label="Tasks Completed"
          value={overview.completedTasks}
          subValue={`${overview.taskCompletionRate}% completion rate`}
          icon={<Target size={18} />}
          accent="success"
        />
        <StatCard
          label="Focus Time"
          value={formatMinutes(overview.totalFocusMinutes)}
          subValue={`${overview.focusSessionsCompleted} sessions`}
          icon={<Clock size={18} />}
          accent="highlight"
        />
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label={`XP Earned (${days}d)`}
          value={`+${overview.xpEarnedInPeriod.toLocaleString()}`}
          icon={<TrendingUp size={18} />}
          accent="primary"
        />
        <StatCard
          label="Habits Completed"
          value={overview.habitCompletions}
          subValue={`In last ${days} days`}
          icon={<CheckCircle2 size={18} />}
          accent="success"
        />
        <StatCard
          label="Avg Daily XP"
          value={Math.round(overview.xpEarnedInPeriod / days)}
          subValue="XP per day"
          icon={<Zap size={18} />}
          accent="highlight"
        />
      </div>

      {/* XP Chart */}
      <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          XP Over Time
        </h3>
        <XpChart data={xpHistory} />
      </div>

      {/* Activity Heatmap */}
      <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Activity Heatmap
        </h3>
        <ActivityHeatmap data={activityHeatmap} />
      </div>

      {/* Challenges Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
          <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
            Daily Challenges
          </h3>
          {profile && (
            <DailyChallengesSection
              challenges={profile.dailyChallenges}
              onRefresh={loadData}
            />
          )}
        </div>

        <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
          <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
            Weekly Challenge
          </h3>
          {profile && <WeeklyChallengeCard challenge={profile.weeklyChallenge} />}
        </div>
      </div>

      {/* Achievements - full width */}
      <div className="rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">
          Achievements
        </h3>
        <AchievementGrid
          achievements={achievements}
          summary={achievementSummary ?? undefined}
        />
      </div>
    </div>
  );
}
