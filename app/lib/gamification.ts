// =============================================================================
// GAMIFICATION UTILITIES
// XP, level, and streak calculation functions.
// =============================================================================

import type { Priority } from "./types";

/**
 * XP values for each priority level.
 */
export const XP_VALUES: Record<Priority, number> = {
  low: 5,
  medium: 10,
  high: 25,
};

/**
 * Calculate the XP required to reach a specific level.
 * Uses quadratic scaling: Level 2 = 100 XP, Level 3 = 300 XP, etc.
 */
export function getXpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

/**
 * Calculate the user's level from their total XP.
 */
export function getLevelFromXp(xp: number): number {
  return Math.floor(0.5 + Math.sqrt(0.25 + xp / 50));
}

/**
 * Calculate XP progress within the current level.
 * Returns an object with current XP in level, XP needed for next level, and percentage.
 */
export function getLevelProgress(totalXp: number): {
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  const currentLevel = getLevelFromXp(totalXp);
  const xpForCurrentLevel = getXpForLevel(currentLevel);
  const xpForNextLevel = getXpForLevel(currentLevel + 1);

  const currentLevelXp = totalXp - xpForCurrentLevel;
  const nextLevelXp = xpForNextLevel - xpForCurrentLevel;
  const progress = Math.min((currentLevelXp / nextLevelXp) * 100, 100);

  return {
    currentLevel,
    currentLevelXp,
    nextLevelXp,
    progress,
  };
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
