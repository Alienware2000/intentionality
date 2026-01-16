"use client";

// =============================================================================
// ANALYTICS CLIENT COMPONENT
// Main analytics dashboard with stats and charts.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { Target, Flame, Clock, Zap, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import XpChart from "@/app/components/charts/XpChart";
import ActivityHeatmap from "@/app/components/charts/ActivityHeatmap";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchApi<AnalyticsData>(`/api/analytics?days=${days}`);
      setData(result);
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
              className="h-24 animate-pulse bg-[var(--bg-card)] rounded-lg"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse bg-[var(--bg-card)] rounded-lg" />
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
    </div>
  );
}
