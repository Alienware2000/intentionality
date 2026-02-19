// =============================================================================
// HABIT RANKING
// Per-habit horizontal bar chart sorted best-to-worst. Tappable rows expand
// to show streak and completion detail. Color zones: green/amber/red.
// =============================================================================

"use client";

import { useState } from "react";
import { ChevronRight, Flame, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/lib/cn";
import type { Id } from "@/app/lib/types";

export type HabitPerformance = {
  id: Id;
  title: string;
  rate: number; // 0-100
  currentStreak: number;
  longestStreak: number;
  completed: number;
  scheduled: number;
  trend: "up" | "down" | "flat" | null;
};

type Props = {
  habits: HabitPerformance[];
};

function getBarColor(rate: number): string {
  if (rate >= 70) return "bg-gradient-to-r from-[var(--accent-success)] to-[var(--accent-success)]/70";
  if (rate >= 40) return "bg-gradient-to-r from-[var(--accent-streak)] to-[var(--accent-streak)]/70";
  return "bg-gradient-to-r from-[var(--accent-danger)] to-[var(--accent-danger)]/70";
}

function getRateColor(rate: number): string {
  if (rate >= 70) return "text-[var(--accent-success)]";
  if (rate >= 40) return "text-[var(--accent-streak)]";
  return "text-[var(--accent-danger)]";
}

export default function HabitRanking({ habits }: Props) {
  const [expandedId, setExpandedId] = useState<Id | null>(null);

  if (habits.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl glass-card hover-lift-glow",
          "bg-[var(--bg-card)]",
          "border border-[var(--border-subtle)]",
          "p-5 sm:p-6"
        )}
      >
        <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          <span className="text-[var(--accent-highlight)]">&#9679;</span> Habit Ranking
        </h3>
        <p className="text-sm text-[var(--text-muted)]">No habits tracked yet</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl glass-card hover-lift-glow",
        "bg-[var(--bg-card)]",
        "border border-[var(--border-subtle)]",
        "p-5 sm:p-6"
      )}
    >
      <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
        <span className="text-[var(--accent-highlight)]">&#9679;</span> Habit Ranking
      </h3>

      <div className="space-y-1">
        {habits.map((habit) => (
          <div key={habit.id}>
            <button
              onClick={() => setExpandedId(expandedId === habit.id ? null : habit.id)}
              className={cn(
                "w-full flex items-center gap-3 min-h-[44px] px-2 py-1.5 rounded-lg",
                "hover:bg-[var(--bg-elevated)]/50 transition-colors",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                expandedId === habit.id && "bg-[var(--bg-elevated)]/50"
              )}
            >
              {/* Chevron */}
              <ChevronRight
                size={12}
                className={cn(
                  "text-[var(--text-muted)] flex-shrink-0 transition-transform duration-200",
                  expandedId === habit.id && "rotate-90"
                )}
              />

              {/* Habit name */}
              <span className="text-xs text-[var(--text-secondary)] truncate w-28 sm:w-32 text-left flex-shrink-0">
                {habit.title}
              </span>

              {/* Bar */}
              <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-elevated)]">
                <motion.div
                  className={cn("h-full rounded-full", getBarColor(habit.rate))}
                  initial={{ width: 0 }}
                  animate={{ width: `${habit.rate}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  style={habit.rate === 100 ? { boxShadow: "0 0 8px rgba(var(--accent-success-rgb), 0.4)" } : undefined}
                />
              </div>

              {/* Rate label + trend arrow */}
              <span className={cn("font-mono text-xs w-14 text-right flex-shrink-0 flex items-center justify-end gap-0.5", getRateColor(habit.rate))}>
                {habit.trend === "up" && (
                  <span className="text-[var(--accent-success)]" title="Trending up">&uarr;</span>
                )}
                {habit.trend === "down" && (
                  <span className="text-[var(--accent-danger)]" title="Trending down">&darr;</span>
                )}
                {habit.trend === "flat" && (
                  <span className="text-[var(--text-muted)]" title="Flat">&rarr;</span>
                )}
                {habit.rate}%
              </span>
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {expandedId === habit.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="overflow-hidden"
                >
                  <div className="ml-8 mr-2 mb-2 flex gap-5 bg-[var(--bg-elevated)] rounded-lg px-4 py-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Flame size={12} className="text-[var(--accent-streak)]" />
                      <span className="text-[var(--text-muted)]">
                        <span className="font-mono font-bold text-[var(--accent-streak)]">{habit.currentStreak}</span> streak
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy size={12} className="text-[var(--accent-highlight)]" />
                      <span className="text-[var(--text-muted)]">
                        <span className="font-mono font-bold text-[var(--accent-highlight)]">{habit.longestStreak}</span> longest
                      </span>
                    </div>
                    <div className="text-[var(--text-muted)]">
                      <span className="font-mono font-bold text-[var(--text-secondary)]">{habit.completed}/{habit.scheduled}</span> this month
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
