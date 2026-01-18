"use client";

// =============================================================================
// ACHIEVEMENT GRID
// Filterable grid of all achievements.
// Filter buttons match period selector style, summary uses CSS variables.
// =============================================================================

import { useState } from "react";
import { AchievementCard } from "./AchievementCard";
import { cn } from "@/app/lib/cn";
import type { AchievementWithProgress, AchievementCategory } from "@/app/lib/types";

const CATEGORY_FILTERS: {
  key: AchievementCategory | "all";
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "streak", label: "Streak" },
  { key: "tasks", label: "Tasks" },
  { key: "focus", label: "Focus" },
  { key: "quests", label: "Quests" },
  { key: "habits", label: "Habits" },
  { key: "special", label: "Special" },
];

type Props = {
  achievements: AchievementWithProgress[];
  summary?: {
    total: number;
    unlocked: number;
    bronze: number;
    silver: number;
    gold: number;
  };
};

export function AchievementGrid({ achievements, summary }: Props) {
  const [filter, setFilter] = useState<AchievementCategory | "all">("all");

  const filteredAchievements =
    filter === "all"
      ? achievements
      : achievements.filter((a) => a.category === filter);

  return (
    <div>
      {/* Summary stats - inline style matching analytics */}
      {summary && (
        <div className="flex items-center gap-6 mb-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Unlocked</p>
            <p className="text-xl font-mono font-bold text-[var(--text-primary)]">
              {summary.unlocked}
              <span className="text-sm text-[var(--text-muted)]">/{summary.total}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-[var(--accent-streak)]">
                {summary.bronze}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Bronze</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-[var(--text-secondary)]">
                {summary.silver}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Silver</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-[var(--accent-highlight)]">
                {summary.gold}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Gold</p>
            </div>
          </div>
        </div>
      )}

      {/* Category filter - matches period selector style */}
      <div className="flex flex-wrap gap-1 mb-4">
        {CATEGORY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-2 sm:py-1 text-xs font-medium rounded transition-colors",
              filter === key
                ? "bg-[var(--accent-primary)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <p className="text-center text-[var(--text-muted)] py-8">
          No achievements in this category yet.
        </p>
      )}
    </div>
  );
}
