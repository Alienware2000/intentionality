"use client";

// =============================================================================
// ACHIEVEMENT CARD
// Displays a single achievement with tier progress.
// Flat card style with left border indicating current tier (matches platform).
// =============================================================================

import {
  Flame,
  CheckCircle,
  Clock,
  Flag,
  Repeat,
  Sparkles,
  AlertTriangle,
  Sunrise,
  Moon,
  Inbox,
  RefreshCw,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { AchievementWithProgress, AchievementCategory, AchievementTier } from "@/app/lib/types";

const CATEGORY_ICONS: Record<AchievementCategory, LucideIcon> = {
  streak: Flame,
  tasks: CheckCircle,
  focus: Clock,
  quests: Flag,
  habits: Repeat,
  special: Sparkles,
};

const ICON_MAP: Record<string, LucideIcon> = {
  Flame: Flame,
  RefreshCw: RefreshCw,
  CheckCircle: CheckCircle,
  AlertTriangle: AlertTriangle,
  Clock: Clock,
  Timer: Timer,
  Flag: Flag,
  Repeat: Repeat,
  Trophy: Trophy,
  Sunrise: Sunrise,
  Moon: Moon,
  Inbox: Inbox,
};

// Tier colors using CSS variables
const TIER_BORDER = {
  bronze: "border-l-[var(--accent-streak)]",
  silver: "border-l-[var(--text-secondary)]",
  gold: "border-l-[var(--accent-highlight)]",
};

const TIER_TEXT = {
  bronze: "text-[var(--accent-streak)]",
  silver: "text-[var(--text-secondary)]",
  gold: "text-[var(--accent-highlight)]",
};

type Props = {
  achievement: AchievementWithProgress;
  compact?: boolean;
};

export function AchievementCard({ achievement, compact = false }: Props) {
  const Icon = ICON_MAP[achievement.icon_name] || CATEGORY_ICONS[achievement.category];
  const currentTier = achievement.userProgress?.current_tier;
  const progressValue = achievement.userProgress?.progress_value ?? 0;

  // Determine next tier and its threshold
  let nextTier: AchievementTier | null = null;
  let nextThreshold = 0;

  if (!currentTier) {
    nextTier = "bronze";
    nextThreshold = achievement.bronze_threshold;
  } else if (currentTier === "bronze") {
    nextTier = "silver";
    nextThreshold = achievement.silver_threshold;
  } else if (currentTier === "silver") {
    nextTier = "gold";
    nextThreshold = achievement.gold_threshold;
  } else {
    // Gold - max tier
    nextTier = null;
    nextThreshold = achievement.gold_threshold;
  }

  const progress = nextTier
    ? Math.min((progressValue / nextThreshold) * 100, 100)
    : 100;

  const isMaxed = currentTier === "gold";

  if (compact) {
    return (
      <div
        className={cn(
          "p-3 rounded-lg border-l-4 bg-[var(--bg-card)]",
          "hover:bg-[var(--bg-hover)] transition-colors",
          currentTier ? TIER_BORDER[currentTier] : "border-l-[var(--border-subtle)] opacity-60"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--bg-elevated)]">
            <Icon
              size={14}
              className={currentTier ? TIER_TEXT[currentTier] : "text-[var(--text-muted)]"}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {achievement.name}
            </p>
            <p className="text-xs font-mono text-[var(--text-muted)]">
              {progressValue} / {nextThreshold}
            </p>
          </div>
          {currentTier && (
            <span className={cn("text-xs font-mono uppercase", TIER_TEXT[currentTier])}>
              {currentTier}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded-lg border-l-4 bg-[var(--bg-card)]",
        "hover:bg-[var(--bg-hover)] transition-colors",
        currentTier ? TIER_BORDER[currentTier] : "border-l-[var(--border-subtle)] opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[var(--bg-elevated)]">
          <Icon
            size={18}
            className={currentTier ? TIER_TEXT[currentTier] : "text-[var(--text-muted)]"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)]">{achievement.name}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{achievement.description}</p>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="h-1 bg-[var(--bg-elevated)] rounded-full">
              <div
                className="h-1 bg-[var(--accent-primary)] rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className={cn(
                "text-xs uppercase tracking-wide",
                currentTier ? TIER_TEXT[currentTier] : "text-[var(--text-muted)]"
              )}>
                {currentTier ? currentTier : "Locked"}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {isMaxed ? "Max" : `${progressValue}/${nextThreshold}`}
              </span>
            </div>
          </div>

          {/* Tier rewards row */}
          <div className="flex gap-2 mt-3">
            <TierBadge
              tier="bronze"
              xp={achievement.bronze_xp}
              unlocked={!!achievement.userProgress?.bronze_unlocked_at}
            />
            <TierBadge
              tier="silver"
              xp={achievement.silver_xp}
              unlocked={!!achievement.userProgress?.silver_unlocked_at}
            />
            <TierBadge
              tier="gold"
              xp={achievement.gold_xp}
              unlocked={!!achievement.userProgress?.gold_unlocked_at}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TierBadge({
  tier,
  xp,
  unlocked,
}: {
  tier: AchievementTier;
  xp: number;
  unlocked: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 py-1 px-2 rounded text-center text-xs",
        unlocked
          ? cn("bg-[var(--bg-elevated)]", TIER_TEXT[tier])
          : "bg-[var(--bg-base)] text-[var(--text-muted)] opacity-50"
      )}
    >
      <span className="font-mono uppercase">{tier[0]}</span>
      <span className="ml-1 font-mono">+{xp}</span>
    </div>
  );
}
