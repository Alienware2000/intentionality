"use client";

// =============================================================================
// AI BRIEFING COMPONENT
// AI-powered daily briefing that replaces the rule-based DailyBriefing.
//
// Features:
// - Personalized AI-generated greeting and summary
// - Dynamic insights based on user patterns
// - Suggested focus task
// - Collapsible interface
// - Graceful fallback when AI is unavailable
//
// LEARNING: Progressive Enhancement with AI
// -----------------------------------------
// We design the component to work even without AI:
// - Show loading state while fetching
// - Fall back to simpler content on error
// - Cache results to avoid re-fetching
// - Allow manual refresh
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
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
  Play,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/cn";
import { useProfile } from "./ProfileProvider";
import { useFocus } from "./FocusProvider";
import type { AIBriefingResponse, ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

type IconConfig = {
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

// Map insight priority to visual styling
const PRIORITY_ICONS: Record<string, IconConfig> = {
  high: {
    icon: AlertTriangle,
    color: "text-[var(--priority-high)]",
    bgColor: "bg-[var(--priority-high)]/10",
  },
  medium: {
    icon: Target,
    color: "text-[var(--accent-primary)]",
    bgColor: "bg-[var(--accent-primary)]/10",
  },
  low: {
    icon: Sparkles,
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
  },
};

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-[var(--priority-high)]",
  medium: "border-l-[var(--priority-medium)]",
  low: "border-l-[var(--border-default)]",
};

// Storage key for "hide for today" preference
const HIDE_KEY = "intentionality_ai_briefing_hidden_date";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  date: ISODateString;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function AIBriefing({ date }: Props) {
  const { profile } = useProfile();
  const { startSession, mode: focusMode } = useFocus();

  const [briefing, setBriefing] = useState<AIBriefingResponse | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hiddenForToday, setHiddenForToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if hidden for today
  useEffect(() => {
    const hiddenDate = localStorage.getItem(HIDE_KEY);
    if (hiddenDate === date) {
      setHiddenForToday(true);
    }
  }, [date]);

  // Fetch briefing
  const loadBriefing = useCallback(async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/ai/briefing?timezone=${encodeURIComponent(timezone)}`);
      const data = await response.json();

      if (data.ok) {
        setBriefing(data);
        setError(null);

        // Auto-expand if there are high priority insights
        const hasHighPriority = data.insights?.some((i: { priority: string }) => i.priority === "high");
        if (hasHighPriority) {
          setIsCollapsed(false);
        }
      } else {
        setError(data.error || "Failed to load briefing");
      }
    } catch (e) {
      console.error("Failed to load AI briefing:", e);
      setError("Failed to load briefing");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBriefing();
  }, [loadBriefing]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBriefing();
  }, [loadBriefing]);

  const handleHideForToday = useCallback(() => {
    localStorage.setItem(HIDE_KEY, date);
    setHiddenForToday(true);
  }, [date]);

  const handleStartFocus = useCallback(async () => {
    if (!briefing?.suggestedFocus || focusMode !== "idle") return;

    await startSession({
      taskId: briefing.suggestedFocus.taskId,
      title: briefing.suggestedFocus.title,
      workDuration: 25,
      breakDuration: 5,
    });
  }, [briefing, focusMode, startSession]);

  // Loading state
  if (loading) {
    return (
      <div className="h-16 animate-pulse bg-[var(--skeleton-bg)] rounded-xl border border-[var(--border-subtle)]" />
    );
  }

  // Hidden for today
  if (hiddenForToday) {
    return null;
  }

  // Error state - show user-friendly fallback
  if (error && !briefing) {
    return (
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--bg-elevated)]">
              <Bot size={18} className="text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                {getSimpleGreeting()}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Briefing will be ready shortly
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              "p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              "hover:bg-[var(--bg-elevated)] transition-colors",
              refreshing && "animate-spin"
            )}
            aria-label="Retry"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Helper function for simple greeting
  function getSimpleGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    return "Good evening!";
  }

  if (!briefing) return null;

  const highPriorityCount = briefing.insights?.filter(i => i.priority === "high").length || 0;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-highlight)]/10">
            <Bot size={18} className="text-[var(--accent-highlight)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">
              {briefing.greeting}
            </h3>
            <p className="text-xs text-[var(--text-muted)] line-clamp-1">
              {briefing.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* High priority badge */}
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

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Suggested Focus */}
              {briefing.suggestedFocus && focusMode === "idle" && (
                <div className="p-3 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play size={14} className="text-[var(--accent-primary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">
                        Suggested focus:
                      </span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {briefing.suggestedFocus.title}
                      </span>
                    </div>
                    <button
                      onClick={handleStartFocus}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-medium",
                        "bg-[var(--accent-primary)] text-white",
                        "hover:bg-[var(--accent-primary)]/80 transition-colors"
                      )}
                    >
                      Start
                    </button>
                  </div>
                </div>
              )}

              {/* Insights */}
              {briefing.insights && briefing.insights.length > 0 ? (
                briefing.insights.map((insight, index) => {
                  const iconConfig = PRIORITY_ICONS[insight.priority] || PRIORITY_ICONS.medium;
                  const Icon = iconConfig.icon;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg",
                        "bg-[var(--bg-elevated)] border-l-2",
                        PRIORITY_BORDER[insight.priority] || PRIORITY_BORDER.medium
                      )}
                    >
                      <div className={cn("p-1.5 rounded-lg flex-shrink-0", iconConfig.bgColor)}>
                        <Icon size={14} className={iconConfig.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {insight.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {insight.description}
                        </p>
                      </div>

                      {insight.actionHref && (
                        <Link
                          href={insight.actionHref}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg",
                            "text-xs font-medium text-[var(--text-secondary)]",
                            "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
                            "border border-[var(--border-subtle)]",
                            "transition-colors flex-shrink-0"
                          )}
                        >
                          {insight.actionLabel || "View"}
                          <ChevronRight size={12} />
                        </Link>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-[var(--text-muted)] text-xs">
                  All clear! No urgent recommendations right now.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
