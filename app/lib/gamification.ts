// =============================================================================
// GAMIFICATION UTILITIES
// XP, level, and streak calculation functions.
// =============================================================================

import type { LevelTitle, Priority, StreakMultiplier, XpBreakdown } from "./types";

/**
 * XP values for each priority level.
 */
export const XP_VALUES: Record<Priority, number> = {
  low: 5,
  medium: 10,
  high: 25,
};

/**
 * XP values for planning features.
 * Daily review is split: 10 XP for reflection + 10 XP for planning (3+ tasks)
 */
export const PLANNING_XP = {
  daily_review: 10,      // Completing reflection steps
  daily_planning: 10,    // Creating 3+ tasks for tomorrow
  weekly_planning: 25,
} as const;

/**
 * Maximum level in the system.
 */
export const MAX_LEVEL = 50;

/**
 * Level titles and their ranges.
 */
export const LEVEL_TITLES: { minLevel: number; maxLevel: number; title: LevelTitle }[] = [
  { minLevel: 1, maxLevel: 4, title: 'Novice' },
  { minLevel: 5, maxLevel: 9, title: 'Apprentice' },
  { minLevel: 10, maxLevel: 14, title: 'Scholar' },
  { minLevel: 15, maxLevel: 19, title: 'Adept' },
  { minLevel: 20, maxLevel: 24, title: 'Expert' },
  { minLevel: 25, maxLevel: 29, title: 'Master' },
  { minLevel: 30, maxLevel: 34, title: 'Grandmaster' },
  { minLevel: 35, maxLevel: 39, title: 'Legend' },
  { minLevel: 40, maxLevel: 44, title: 'Mythic' },
  { minLevel: 45, maxLevel: 49, title: 'Transcendent' },
  { minLevel: 50, maxLevel: 50, title: 'Ascended' },
];

/**
 * Streak multiplier tiers with thresholds and bonuses.
 */
export const STREAK_MULTIPLIERS: { minDays: number; multiplier: number; bonusPercent: number }[] = [
  { minDays: 100, multiplier: 1.50, bonusPercent: 50 },
  { minDays: 60, multiplier: 1.40, bonusPercent: 40 },
  { minDays: 30, multiplier: 1.30, bonusPercent: 30 },
  { minDays: 21, multiplier: 1.20, bonusPercent: 20 },
  { minDays: 14, multiplier: 1.15, bonusPercent: 15 },
  { minDays: 7, multiplier: 1.10, bonusPercent: 10 },
  { minDays: 3, multiplier: 1.05, bonusPercent: 5 },
  { minDays: 1, multiplier: 1.00, bonusPercent: 0 },
];

/**
 * Streak milestones that award bonus XP and achievements.
 */
export const STREAK_MILESTONES: { days: number; xpReward: number; badge: string }[] = [
  { days: 7, xpReward: 50, badge: 'Week Warrior' },
  { days: 14, xpReward: 100, badge: 'Fortnight Fighter' },
  { days: 21, xpReward: 150, badge: 'Habit Formed' },
  { days: 30, xpReward: 250, badge: 'Monthly Master' },
  { days: 60, xpReward: 400, badge: 'Dedication' },
  { days: 90, xpReward: 600, badge: 'Quarterly Quest' },
  { days: 100, xpReward: 1000, badge: 'Century Club' },
  { days: 180, xpReward: 1500, badge: 'Half Year Hero' },
  { days: 365, xpReward: 3000, badge: 'Year One' },
];

/**
 * Level perks that unlock at specific levels.
 */
export const LEVEL_PERKS: { level: number; perk: string; xpBonus?: number }[] = [
  { level: 5, perk: 'Custom theme accent colors' },
  { level: 10, perk: 'Profile badges visible' },
  { level: 15, perk: 'Streak freeze slot +1' },
  { level: 20, perk: 'Weekly challenge slot +1' },
  { level: 25, perk: 'Profile title customization' },
  { level: 30, perk: 'XP boost: +5% permanent', xpBonus: 0.05 },
  { level: 40, perk: 'XP boost: +10% permanent', xpBonus: 0.10 },
  { level: 50, perk: 'Prestige mode available' },
];

/**
 * Calculate the XP required to reach a specific level.
 * Uses exponential scaling: XP = floor(50 * level^1.5)
 *
 * Level curve (cumulative XP to reach level):
 * Level 1: 0, Level 5: 900, Level 10: 4,250, Level 20: 20,650
 * Level 30: 53,500, Level 40: 112,150, Level 50: 204,600
 */
export function getXpForLevelV2(level: number): number {
  if (level <= 1) return 0;
  // Cumulative XP to reach this level
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += Math.floor(50 * Math.pow(i, 1.5));
  }
  return total;
}

/**
 * Calculate the user's level from their total XP (V2 formula).
 */
export function getLevelFromXpV2(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL) {
    const xpForNextLevel = getXpForLevelV2(level + 1);
    if (xp < xpForNextLevel) break;
    level++;
  }
  return level;
}

/**
 * Calculate XP progress within the current level (V2 formula).
 */
export function getLevelProgressV2(totalXp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
  title: LevelTitle;
  nextTitle: LevelTitle | null;
} {
  const currentLevel = getLevelFromXpV2(totalXp);
  const xpForCurrentLevel = getXpForLevelV2(currentLevel);
  const xpForNextLevel = getXpForLevelV2(Math.min(currentLevel + 1, MAX_LEVEL));

  const currentLevelXp = totalXp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progress = currentLevel >= MAX_LEVEL ? 100 : Math.min((currentLevelXp / xpNeeded) * 100, 100);

  const title = getTitleForLevel(currentLevel);
  const nextTitle = currentLevel < MAX_LEVEL ? getTitleForLevel(currentLevel + 1) : null;

  return {
    currentLevel,
    currentLevelXp,
    nextLevelXp: xpNeeded,
    progress,
    title,
    nextTitle: nextTitle !== title ? nextTitle : null,
  };
}

/**
 * Get the title for a given level.
 */
export function getTitleForLevel(level: number): LevelTitle {
  for (const tier of LEVEL_TITLES) {
    if (level >= tier.minLevel && level <= tier.maxLevel) {
      return tier.title;
    }
  }
  return 'Novice';
}

/**
 * Get the streak multiplier info for a given streak count.
 */
export function getStreakMultiplier(streakDays: number): StreakMultiplier {
  let multiplier = 1.00;
  let bonusPercent = 0;
  let nextMilestone: number | null = null;
  let nextMultiplier: number | null = null;

  // Find current multiplier (list is sorted descending)
  for (const tier of STREAK_MULTIPLIERS) {
    if (streakDays >= tier.minDays) {
      multiplier = tier.multiplier;
      bonusPercent = tier.bonusPercent;
      break;
    }
  }

  // Find next milestone
  for (let i = STREAK_MULTIPLIERS.length - 1; i >= 0; i--) {
    const tier = STREAK_MULTIPLIERS[i];
    if (streakDays < tier.minDays) {
      nextMilestone = tier.minDays;
      nextMultiplier = tier.multiplier;
      break;
    }
  }

  return { multiplier, bonusPercent, nextMilestone, nextMultiplier };
}

/**
 * Check if a streak milestone was just reached.
 */
export function getNewStreakMilestone(
  oldStreak: number,
  newStreak: number
): { days: number; xpReward: number; badge: string } | null {
  for (const milestone of STREAK_MILESTONES) {
    if (oldStreak < milestone.days && newStreak >= milestone.days) {
      return milestone;
    }
  }
  return null;
}

/**
 * Calculate total XP with multipliers and bonuses.
 */
export function calculateXpWithBonuses(
  baseXp: number,
  streakDays: number,
  permanentXpBonus: number = 1.00
): XpBreakdown {
  const { multiplier } = getStreakMultiplier(streakDays);

  // Apply streak multiplier to base XP
  const afterStreakMultiplier = Math.floor(baseXp * multiplier);
  const streakBonus = afterStreakMultiplier - baseXp;

  // Apply permanent bonus (from level perks)
  const totalXp = Math.floor(afterStreakMultiplier * permanentXpBonus);
  const permanentBonus = totalXp - afterStreakMultiplier;

  return {
    baseXp,
    streakMultiplier: multiplier,
    streakBonus,
    permanentBonus,
    totalXp,
  };
}

/**
 * Get the permanent XP bonus multiplier based on level.
 */
export function getPermanentXpBonus(level: number): number {
  let bonus = 1.00;
  for (const perk of LEVEL_PERKS) {
    if (level >= perk.level && perk.xpBonus) {
      bonus = 1.00 + perk.xpBonus;
    }
  }
  return bonus;
}

/**
 * Check if user earned streak freeze this week (7-day streak).
 */
export function earnedStreakFreeze(
  currentStreak: number,
  lastFreezeEarned: string | null
): boolean {
  // Award one freeze per week for maintaining 7+ day streak
  if (currentStreak < 7) return false;

  if (!lastFreezeEarned) return true;

  const lastEarned = new Date(lastFreezeEarned);
  const now = new Date();
  const daysSinceEarned = Math.floor(
    (now.getTime() - lastEarned.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceEarned >= 7;
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is today (in local timezone).
 */
export function isToday(dateString: string | null): boolean {
  if (!dateString) return false;
  return dateString === getLocalDateString();
}

/**
 * Check if a date is yesterday (in local timezone).
 */
export function isYesterday(dateString: string | null): boolean {
  if (!dateString) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === getLocalDateString(yesterday);
}

/**
 * Calculate the new streak value based on last active date.
 * Returns the new streak count.
 */
export function calculateStreak(
  lastActiveDate: string | null,
  currentStreak: number
): number {
  if (isToday(lastActiveDate)) {
    // Already active today, no change
    return currentStreak;
  }

  if (isYesterday(lastActiveDate)) {
    // Active yesterday, continue streak
    return currentStreak + 1;
  }

  // Streak broken, start over
  return 1;
}

/**
 * Calculate XP earned from a focus session based on duration.
 * Rate: 0.6 XP per minute
 * Examples: 25 min = 15 XP, 45 min = 27 XP, 90 min = 54 XP
 */
export function getFocusXp(minutes: number): number {
  return Math.round(minutes * 0.6);
}

/**
 * Milestone bonuses for longer focus sessions.
 * Rewards sustained focus with extra XP at certain thresholds.
 */
export const FOCUS_MILESTONES = [
  { threshold: 30, bonus: 5 },
  { threshold: 60, bonus: 10 },
  { threshold: 90, bonus: 15 },
] as const;

/**
 * Get the milestone bonus XP for a focus session duration.
 * Returns the highest applicable bonus (bonuses don't stack).
 */
export function getFocusMilestoneBonus(minutes: number): number {
  let bonus = 0;
  for (const milestone of FOCUS_MILESTONES) {
    if (minutes >= milestone.threshold) bonus = milestone.bonus;
  }
  return bonus;
}

/**
 * Get the next milestone that can be reached from the current duration.
 * Returns null if all milestones have been reached.
 */
export function getNextFocusMilestone(minutes: number) {
  for (const m of FOCUS_MILESTONES) {
    if (minutes < m.threshold) return m;
  }
  return null;
}

/**
 * Calculate total XP for a focus session including milestone bonus.
 * Total = base XP (0.6/min) + milestone bonus
 */
export function getFocusTotalXp(minutes: number): number {
  return getFocusXp(minutes) + getFocusMilestoneBonus(minutes);
}
