"use client";

// =============================================================================
// DAILY CHALLENGES SECTION
// Displays today's daily challenges with progress.
// Flat list style with left border indicating difficulty (matches HabitCard).
// =============================================================================

import { Check, Target, CheckCircle, Clock, Flame, Repeat } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { UserDailyChallenge } from "@/app/lib/types";

// Difficulty indicated by left border color (like priority)
const DIFFICULTY_BORDER = {
  easy: "border-l-[var(--accent-success)]",
  medium: "border-l-[var(--priority-medium)]",
  hard: "border-l-[var(--priority-high)]",
};

const TYPE_ICONS = {
  tasks: CheckCircle,
  focus: Clock,
  habits: Repeat,
  high_priority: Flame,
};

type Props = {
  challenges: UserDailyChallenge[];
  onRefresh?: () => void;
};

export function DailyChallengesSection({ challenges }: Props) {
  const completedCount = challenges.filter((c) => c.completed).length;
  const allCompleted = challenges.length === 3 && completedCount === 3;

  return (
    <div>
      {/* Challenges list */}
      <div className="space-y-2">
        {challenges.map((challenge) => {
          const template = challenge.template;
          if (!template) return null;

          const Icon = TYPE_ICONS[template.challenge_type] || Target;
          const progress = template.target_value > 0
            ? Math.min((challenge.progress / template.target_value) * 100, 100)
            : challenge.completed ? 100 : 0;

          return (
            <div
              key={challenge.id}
              className={cn(
                "group flex items-center gap-3 p-3",
                "border-l-4 rounded-r-lg",
                "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
                "transition-colors duration-150",
                challenge.completed
                  ? "border-l-[var(--accent-success)] opacity-60"
                  : DIFFICULTY_BORDER[template.difficulty]
              )}
            >
              {/* Checkbox circle */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  challenge.completed
                    ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                    : "border-[var(--border-default)]"
                )}
              >
                {challenge.completed && <Check size={12} className="text-white" />}
              </div>

              {/* Icon */}
              <div className="p-2 rounded-lg bg-[var(--bg-elevated)] flex-shrink-0">
                <Icon
                  size={14}
                  className={cn(
                    challenge.completed
                      ? "text-[var(--accent-success)]"
                      : "text-[var(--text-muted)]"
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm",
                    challenge.completed
                      ? "line-through text-[var(--text-muted)]"
                      : "text-[var(--text-primary)]"
                  )}
                >
                  {template.name}
                </span>
                {!challenge.completed && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-[var(--bg-elevated)] rounded-full">
                      <div
                        className="h-1 bg-[var(--accent-primary)] rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {challenge.progress}/{template.target_value}
                    </span>
                  </div>
                )}
              </div>

              {/* XP reward */}
              <span
                className={cn(
                  "text-xs font-mono flex-shrink-0",
                  challenge.completed
                    ? "text-[var(--accent-success)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                +{template.xp_reward}
              </span>
            </div>
          );
        })}
      </div>

      {/* Daily sweep bonus */}
      <div
        className={cn(
          "mt-3 flex items-center justify-between p-3 rounded-lg",
          "border-l-4",
          allCompleted
            ? "border-l-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10"
            : "border-l-[var(--border-subtle)] bg-[var(--bg-elevated)] opacity-60"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              allCompleted
                ? "bg-[var(--accent-highlight)] border-[var(--accent-highlight)]"
                : "border-[var(--border-default)]"
            )}
          >
            {allCompleted && <Check size={12} className="text-black" />}
          </div>
          <span className="text-sm text-[var(--text-secondary)]">Daily Sweep Bonus</span>
        </div>
        <span
          className={cn(
            "text-xs font-mono",
            allCompleted
              ? "text-[var(--accent-highlight)]"
              : "text-[var(--text-muted)]"
          )}
        >
          +25
        </span>
      </div>

      {/* Progress summary */}
      <div className="mt-3 flex items-center justify-end">
        <span className="text-xs text-[var(--text-muted)]">
          <span className="font-mono font-bold text-[var(--accent-success)]">
            {completedCount}
          </span>
          <span className="text-[var(--text-muted)]"> / 3 complete</span>
        </span>
      </div>
    </div>
  );
}
