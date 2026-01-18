"use client";

// =============================================================================
// WEEKLY CHALLENGE CARD
// Displays the current weekly challenge with progress.
// Clean flat card matching platform design patterns.
// =============================================================================

import { Calendar, CheckCircle, Clock, Flame, Repeat, Check } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { UserWeeklyChallenge } from "@/app/lib/types";

const TYPE_ICONS = {
  tasks: CheckCircle,
  focus: Clock,
  habits: Repeat,
  streak: Flame,
  daily_challenges: Calendar,
};

type Props = {
  challenge: UserWeeklyChallenge | null;
};

export function WeeklyChallengeCard({ challenge }: Props) {
  if (!challenge?.template) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        No weekly challenge assigned yet.
      </p>
    );
  }

  const template = challenge.template;
  const Icon = TYPE_ICONS[template.challenge_type] || Calendar;
  const progress = Math.min(
    (challenge.progress / template.target_value) * 100,
    100
  );

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              challenge.completed
                ? "bg-[var(--accent-success)]/20"
                : "bg-[var(--bg-elevated)]"
            )}
          >
            {challenge.completed ? (
              <Check size={16} className="text-[var(--accent-success)]" />
            ) : (
              <Icon size={16} className="text-[var(--accent-primary)]" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {template.name}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Resets Monday
            </p>
          </div>
        </div>
        <span
          className={cn(
            "text-lg font-mono font-bold",
            challenge.completed
              ? "text-[var(--accent-success)]"
              : "text-[var(--accent-primary)]"
          )}
        >
          +{template.xp_reward}
          <span className="text-xs font-normal text-[var(--text-muted)]"> XP</span>
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--text-muted)]">
        {template.description}
      </p>

      {/* Progress bar - matching platform style */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--text-muted)]">
            {challenge.completed ? "Complete!" : "Progress"}
          </span>
          <span className="font-mono text-[var(--text-primary)]">
            {challenge.progress} / {template.target_value}
          </span>
        </div>
        <div className="h-1 bg-[var(--bg-elevated)] rounded-full">
          <div
            className={cn(
              "h-1 rounded-full transition-all",
              challenge.completed
                ? "bg-[var(--accent-success)]"
                : "bg-[var(--accent-primary)]"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
