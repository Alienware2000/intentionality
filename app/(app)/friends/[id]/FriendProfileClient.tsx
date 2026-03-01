"use client";

// =============================================================================
// FRIEND PROFILE CLIENT
// Detailed friend analytics with comparison bars, habits, and activity chart.
// Progress visibility is the core accountability mechanism.
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Loader2,
  Check,
  CheckCircle2,
  Flame,
  Timer,
  Zap,
  Lock,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi } from "@/app/lib/api";
import { useSocial } from "@/app/components/SocialProvider";
import GlowCard from "@/app/components/ui/GlowCard";
import UserAvatar from "@/app/components/social/UserAvatar";
import ActivityBarChart from "@/app/components/charts/ActivityBarChart";
import ActivityHeatmap from "@/app/components/charts/ActivityHeatmap";
import MonthlyHabitGrid from "@/app/(app)/analytics/MonthlyHabitGrid";
import type { Habit, ISODateString, Id } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type FriendProfile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  xp_total: number | null;
  level: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  title: string | null;
};

type PeriodStats = {
  tasks_completed: number;
  focus_minutes: number;
  habits_completed: number;
  xp_earned: number | null;
};

type Comparison = {
  level: number;
  current_streak: number;
  longest_streak: number;
  xp_total: number;
  tasks_completed: number;
  focus_minutes: number;
  habits_completed: number;
};

type FriendStatsData = {
  friend: {
    profile: FriendProfile;
    period_stats: PeriodStats | null;
    show_habits: boolean;
    show_activity: boolean;
  };
  comparison: Comparison;
  habits: {
    habits: Habit[];
    completions: Record<Id, ISODateString[]>;
  } | null;
  heatmap: Array<{ date: string; count: number; minutes: number }> | null;
};

// -----------------------------------------------------------------------------
// Comparison Bar Row
// -----------------------------------------------------------------------------

function ComparisonRow({
  label,
  icon,
  yours,
  theirs,
  suffix,
}: {
  label: string;
  icon: React.ReactNode;
  yours: number;
  theirs: number;
  suffix?: string;
}) {
  const total = yours + theirs;
  const bothZero = total === 0;
  const yoursPercent = bothZero ? 50 : Math.round((yours / total) * 100);
  const youAhead = yours > theirs;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        {bothZero ? (
          <span className="text-[var(--text-muted)] text-[11px]">No data yet</span>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono font-bold",
                youAhead ? "text-[var(--accent-success)]" : "text-[var(--text-primary)]"
              )}
            >
              {yours.toLocaleString()}{suffix}
            </span>
            <span className="text-[var(--text-muted)]">vs</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {theirs.toLocaleString()}{suffix}
            </span>
          </div>
        )}
      </div>
      {!bothZero && (
        <div className="flex h-2 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
          <div
            className="rounded-l-full transition-all duration-500 bg-[var(--accent-primary)]"
            style={{ width: `${yoursPercent}%` }}
          />
          <div
            className="rounded-r-full transition-all duration-500 bg-[var(--accent-info)]"
            style={{ width: `${100 - yoursPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Stat Card
// -----------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const isEmpty = value === "0" || value === "0m";

  return (
    <GlowCard glowColor="none">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl", color)}>
          {icon}
        </div>
        <div>
          {isEmpty ? (
            <p className="text-sm text-[var(--text-muted)]">No {label.toLowerCase()} completed</p>
          ) : (
            <>
              <p className="text-lg font-mono font-bold text-[var(--text-primary)]">{value}</p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
            </>
          )}
        </div>
      </div>
    </GlowCard>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

type Props = {
  friendId: string;
};

export default function FriendProfileClient({ friendId }: Props) {
  const router = useRouter();
  const { sendNudge } = useSocial();

  const [data, setData] = useState<FriendStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullYear, setShowFullYear] = useState(false);

  // Nudge state
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Habit grid month state
  const [habitMonth, setHabitMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await fetchApi<FriendStatsData>(`/api/friends/${friendId}/stats?days=30`);
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load friend profile");
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleNudge = async () => {
    setNudging(true);
    const success = await sendNudge(friendId);
    setNudging(false);
    if (success) {
      setNudged(true);
      timeoutRef.current = setTimeout(() => setNudged(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/friends")}
          className={cn(
            "flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors",
            "min-h-[44px] sm:min-h-0",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
          )}
        >
          <ArrowLeft size={16} />
          Back to Social
        </button>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/friends")}
          className={cn(
            "flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors",
            "min-h-[44px] sm:min-h-0",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
          )}
        >
          <ArrowLeft size={16} />
          Back to Social
        </button>
        <GlowCard glowColor="none">
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)] font-medium">{error || "Profile not found"}</p>
          </div>
        </GlowCard>
      </div>
    );
  }

  const { friend, comparison, habits, heatmap } = data;
  const profile = friend.profile;
  const stats = friend.period_stats;

  // Date range for period context
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);
  const dateRangeStr = `${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Heatmap data split: last 30 days for bar chart, full year for heatmap
  const last30Days = heatmap
    ? heatmap.slice(-30)
    : [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push("/friends")}
        className={cn(
          "flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors",
          "min-h-[44px] sm:min-h-0",
          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
        )}
      >
        <ArrowLeft size={16} />
        Back to Social
      </button>

      {/* Profile Header */}
      <GlowCard glowColor="primary" className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center gap-4 flex-wrap">
          <UserAvatar
            userId={profile.user_id}
            displayName={profile.display_name}
            size={48}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">
              {profile.display_name || "Anonymous"}
            </h1>
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] flex-wrap">
              {profile.username && (
                <span className="text-[var(--accent-primary)]">@{profile.username}</span>
              )}
              {profile.level != null && (
                <span className="font-mono font-bold text-[var(--accent-primary)]">
                  Lv.{profile.level}
                </span>
              )}
              {profile.title && <span>{profile.title}</span>}
              {profile.current_streak != null && profile.current_streak > 0 && (
                <span className="font-mono font-bold text-[var(--accent-streak)]">
                  {profile.current_streak}d streak
                </span>
              )}
            </div>
          </div>
          {/* Nudge */}
          <button
            onClick={handleNudge}
            disabled={nudging || nudged}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              "min-h-[44px] sm:min-h-0",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
              "active:scale-[0.97]",
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
              nudged
                ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
              "disabled:opacity-50"
            )}
          >
            {nudging ? (
              <Loader2 size={14} className="animate-spin" />
            ) : nudged ? (
              <Check size={14} />
            ) : (
              <Heart size={14} />
            )}
            {nudged ? "Sent!" : "Nudge"}
          </button>
        </div>
      </GlowCard>

      {/* Comparison Bars */}
      {profile.current_streak != null && profile.level != null && (
        <GlowCard glowColor="none">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
            How You Compare
          </h2>
          <div className="space-y-4">
            <ComparisonRow
              label="Streak"
              icon={<Flame size={13} />}
              yours={comparison.current_streak}
              theirs={profile.current_streak ?? 0}
              suffix="d"
            />
            <ComparisonRow
              label="Level"
              icon={<Zap size={13} />}
              yours={comparison.level}
              theirs={profile.level ?? 1}
            />
            <ComparisonRow
              label="Tasks"
              icon={<CheckCircle2 size={13} />}
              yours={comparison.tasks_completed}
              theirs={stats?.tasks_completed ?? 0}
            />
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-primary)]" /> You
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-info)]" /> {profile.display_name || "Them"}
            </span>
          </div>
        </GlowCard>
      )}

      {/* Overview Stats */}
      {stats && (
        <>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Last 30 Days
            <span className="font-normal normal-case tracking-normal ml-2 text-[var(--text-muted)]">
              ({dateRangeStr})
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Tasks"
              value={stats.tasks_completed.toLocaleString()}
              icon={<CheckCircle2 size={18} className="text-[var(--accent-success)]" />}
              color="bg-[var(--accent-success)]/10"
            />
            <StatCard
              label="Focus"
              value={stats.focus_minutes >= 60
                ? `${Math.floor(stats.focus_minutes / 60)}h ${stats.focus_minutes % 60}m`
                : `${stats.focus_minutes}m`
              }
              icon={<Timer size={18} className="text-[var(--accent-info)]" />}
              color="bg-[var(--accent-info)]/10"
            />
            <StatCard
              label="Habits"
              value={stats.habits_completed.toLocaleString()}
              icon={<Flame size={18} className="text-[var(--accent-streak)]" />}
              color="bg-[var(--accent-streak)]/10"
            />
            {stats.xp_earned != null && (
              <StatCard
                label="XP Earned"
                value={stats.xp_earned.toLocaleString()}
                icon={<Zap size={18} className="text-[var(--accent-primary)]" />}
                color="bg-[var(--accent-primary)]/10"
              />
            )}
          </div>
        </>
      )}

      {/* Habit Grid */}
      {friend.show_habits && habits ? (
        <>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Habit Grid
          </h2>
          <GlowCard glowColor="none">
            <MonthlyHabitGrid
              year={habitMonth.year}
              month={habitMonth.month}
              habits={habits.habits}
              completions={habits.completions}
              onPrevMonth={() =>
                setHabitMonth((prev) => {
                  const d = new Date(prev.year, prev.month - 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
              onNextMonth={() =>
                setHabitMonth((prev) => {
                  const d = new Date(prev.year, prev.month + 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
              onToday={() => {
                const now = new Date();
                setHabitMonth({ year: now.getFullYear(), month: now.getMonth() });
              }}
              readOnly
            />
          </GlowCard>
        </>
      ) : !friend.show_habits && friend.show_activity ? (
        <>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Habit Grid
          </h2>
          <GlowCard glowColor="none">
            <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
              <Lock size={24} className="mb-2" />
              <p className="text-sm font-medium">Habits are private</p>
              <p className="text-xs mt-1">This friend has chosen to keep their habit details private.</p>
            </div>
          </GlowCard>
        </>
      ) : null}

      {/* Activity Visualization — dual mode: bar chart (30d) / heatmap (year) */}
      {heatmap && heatmap.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
              {showFullYear ? "Activity Heatmap" : "Activity (Last 30 Days)"}
            </h2>
            <button
              onClick={() => setShowFullYear((v) => !v)}
              className={cn(
                "text-xs text-[var(--accent-primary)] hover:underline transition-colors",
                "min-h-[44px] sm:min-h-0 flex items-center",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
              )}
            >
              {showFullYear ? "Show 30 days" : "View full year"}
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlowCard glowColor="none">
              {showFullYear ? (
                <ActivityHeatmap data={heatmap} fullYear />
              ) : (
                <ActivityBarChart data={last30Days} />
              )}
            </GlowCard>
          </motion.div>
        </>
      )}
    </div>
  );
}
