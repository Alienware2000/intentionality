"use client";

// =============================================================================
// DAILY BRIEFING COMPONENT
// Smart assistant card that shows personalized recommendations for the day.
// Analyzes tasks, habits, streaks, and time to surface relevant suggestions.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertTriangle,
  Flame,
  Calendar,
  Target,
  Heart,
  BookOpen,
  ClipboardList,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  EyeOff,
  Trophy,
  Star,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/cn";
import { useProfile } from "./ProfileProvider";
import {
  generateRecommendations,
  getTimeBasedGreeting,
  getEncouragingMessage,
} from "@/app/lib/smart-recommendations";
import type {
  Task,
  HabitWithStatus,
  Quest,
  DailyRecommendation,
  RecommendationType,
  ISODateString,
} from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

type IconConfig = {
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const RECOMMENDATION_ICONS: Record<RecommendationType, IconConfig> = {
  urgent: {
    icon: AlertTriangle,
    color: "text-[var(--priority-high)]",
    bgColor: "bg-[var(--priority-high)]/10",
  },
  streak_at_risk: {
    icon: Flame,
    color: "text-[var(--accent-streak)]",
    bgColor: "bg-[var(--accent-streak)]/10",
  },
  weekly_goal: {
    icon: Target,
    color: "text-[var(--accent-primary)]",
    bgColor: "bg-[var(--accent-primary)]/10",
  },
  heavy_day: {
    icon: Calendar,
    color: "text-[var(--priority-medium)]",
    bgColor: "bg-[var(--priority-medium)]/10",
  },
  quest_progress: {
    icon: Target,
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
  },
  habit_reminder: {
    icon: Heart,
    color: "text-[var(--accent-primary)]",
    bgColor: "bg-[var(--accent-primary)]/10",
  },
  planning_needed: {
    icon: ClipboardList,
    color: "text-[var(--accent-highlight)]",
    bgColor: "bg-[var(--accent-highlight)]/10",
  },
  review_reminder: {
    icon: BookOpen,
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
  },
  milestone_countdown: {
    icon: Trophy,
    color: "text-[var(--accent-streak)]",
    bgColor: "bg-[var(--accent-streak)]/10",
  },
  best_day: {
    icon: Star,
    color: "text-[var(--accent-highlight)]",
    bgColor: "bg-[var(--accent-highlight)]/10",
  },
};


// Storage key for "hide for today" preference
const HIDE_KEY = "intentionality_briefing_hidden_date";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  date: ISODateString;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * DailyBriefing shows personalized recommendations and encouragement.
 * Updates based on time of day and user's progress.
 */
export default function DailyBriefing({ date }: Props) {
  const { profile } = useProfile();
  const [recommendations, setRecommendations] = useState<DailyRecommendation[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
  const [hiddenForToday, setHiddenForToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ completed: 0, total: 0 });
  const [bestCompletionDay, setBestCompletionDay] = useState<number | null>(null);

  // Check if hidden for today
  useEffect(() => {
    const hiddenDate = localStorage.getItem(HIDE_KEY);
    if (hiddenDate === date) {
      setHiddenForToday(true);
    }
  }, [date]);

  const loadData = useCallback(async () => {
    try {
      // Fetch all required data in parallel
      const [tasksRes, habitsRes, questsRes, patternsRes] = await Promise.all([
        fetch(`/api/tasks/for-today?date=${date}`),
        fetch(`/api/habits?date=${date}`),
        fetch("/api/quests"),
        fetch("/api/ai/learn").catch(() => null), // Pattern data is optional
      ]);

      const [tasksData, habitsData, questsData] = await Promise.all([
        tasksRes.json(),
        habitsRes.json(),
        questsRes.json(),
      ]);

      // Try to get pattern data for best completion day
      let fetchedBestDay: number | null = null;
      if (patternsRes?.ok) {
        try {
          const patternsData = await patternsRes.json();
          if (patternsData.ok && patternsData.patterns?.best_completion_day !== undefined) {
            fetchedBestDay = patternsData.patterns.best_completion_day;
            setBestCompletionDay(fetchedBestDay);
          }
        } catch {
          // Silent fail - patterns are optional
        }
      }

      const todayTasks: Task[] = tasksData.ok
        ? tasksData.tasks.filter((t: Task) => t.due_date === date)
        : [];
      const overdueTasks: Task[] = tasksData.ok
        ? tasksData.tasks.filter((t: Task) => t.due_date < date && !t.completed)
        : [];
      const habits: HabitWithStatus[] = habitsData.ok ? habitsData.habits : [];
      const quests: Quest[] = questsData.ok ? questsData.quests : [];

      // Calculate stats
      const completed = todayTasks.filter(t => t.completed).length;
      const total = todayTasks.length;
      setStats({ completed, total });

      // Generate recommendations
      const recs = generateRecommendations({
        todayTasks,
        overdueTasks,
        habits,
        quests,
        profile,
        weeklyPlan: null, // TODO: Fetch weekly plan when implemented
        hasReviewedToday: false, // TODO: Check daily review status
        currentTime: new Date(),
        bestCompletionDay: fetchedBestDay,
      });

      setRecommendations(recs);

      // Auto-expand if there are high priority recommendations
      const hasHighPriority = recs.some(r => r.priority === "high");
      if (hasHighPriority) {
        setIsCollapsed(false);
      }
    } catch {
      // Silent fail - briefing is optional
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleHideForToday = useCallback(() => {
    localStorage.setItem(HIDE_KEY, date);
    setHiddenForToday(true);
  }, [date]);

  const greeting = getTimeBasedGreeting(profile?.display_name);
  const message = getEncouragingMessage(
    stats.completed,
    stats.total,
    profile?.current_streak ?? 0
  );

  if (loading) {
    return (
      <div className="h-16 animate-pulse bg-[var(--skeleton-bg)] rounded-xl border border-[var(--border-subtle)]" />
    );
  }

  // Don't render if hidden for today
  if (hiddenForToday) {
    return null;
  }

  // Count high priority items for badge
  const highPriorityCount = recommendations.filter(r => r.priority === "high").length;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-highlight)]/10">
            <Sparkles size={18} className="text-[var(--accent-highlight)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">
              {greeting}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show badge for high priority items when collapsed */}
          {isCollapsed && highPriorityCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--priority-high)]/10 text-[var(--priority-high)] text-xs font-medium">
              {highPriorityCount} urgent
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleHideForToday();
            }}
            className={cn(
              "p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              "hover:bg-[var(--bg-elevated)] transition-colors"
            )}
            aria-label="Hide for today"
            title="Hide for today"
          >
            <EyeOff size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            disabled={refreshing}
            className={cn(
              "p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              "hover:bg-[var(--bg-elevated)] transition-colors",
              refreshing && "animate-spin"
            )}
            aria-label="Refresh briefing"
          >
            <RefreshCw size={14} />
          </button>
          {isCollapsed ? (
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          ) : (
            <ChevronUp size={18} className="text-[var(--text-muted)]" />
          )}
        </div>
      </div>

      {/* Recommendations */}
      <AnimatePresence>
        {!isCollapsed && recommendations.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {recommendations.map((rec, index) => {
                const iconConfig = RECOMMENDATION_ICONS[rec.type];
                const Icon = iconConfig.icon;

                return (
                  <motion.div
                    key={rec.type + index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg",
                      "bg-[var(--bg-elevated)]"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg flex-shrink-0", iconConfig.bgColor)}>
                      <Icon size={14} className={iconConfig.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {rec.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {rec.description}
                      </p>
                    </div>

                    {rec.actionHref && (
                      <Link
                        href={rec.actionHref}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg",
                          "text-xs font-medium text-[var(--text-secondary)]",
                          "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
                          "border border-[var(--border-subtle)]",
                          "transition-colors flex-shrink-0"
                        )}
                      >
                        {rec.actionLabel}
                        <ChevronRight size={12} />
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty state when no recommendations */}
        {!isCollapsed && recommendations.length === 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="text-center py-4 text-[var(--text-muted)] text-xs">
                All clear! No urgent recommendations right now.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
