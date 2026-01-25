// =============================================================================
// GAMIFICATION ACTIONS
// Shared functions for awarding XP and updating stats across toggle routes.
// =============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfileV2, XpAwardResult } from "./types";
import {
  getLevelFromXpV2,
  getNewStreakMilestone,
  calculateXpWithBonuses,
  getLocalDateString,
  earnedStreakFreeze,
  getPermanentXpBonus,
} from "./gamification";
import { checkAllAchievements } from "./achievements";
import {
  updateDailyChallengeProgress,
  updateWeeklyChallengeProgress,
  isFirstActionOfDay,
  checkPerfectDay,
  FIRST_ACTION_BONUS,
  PERFECT_DAY_BONUS,
  DAILY_SWEEP_BONUS,
} from "./challenges";

/**
 * Action types that can earn XP.
 */
export type GamificationActionType = "task" | "habit" | "focus" | "schedule_block";

/**
 * Options for awarding XP.
 */
export type AwardXpOptions = {
  supabase: SupabaseClient;
  userId: string;
  baseXp: number;
  actionType: GamificationActionType;
  isHighPriority?: boolean;
  focusMinutes?: number;
  isLongFocusSession?: boolean;
  completionHour?: number;
};

/**
 * Update streak based on last active date.
 */
function calculateNewStreak(
  lastActiveDate: string | null,
  currentStreak: number,
  today: string
): { newStreak: number; isNewDay: boolean; streakBroken: boolean } {
  if (lastActiveDate === today) {
    return { newStreak: currentStreak, isNewDay: false, streakBroken: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  if (lastActiveDate === yesterdayStr) {
    return { newStreak: currentStreak + 1, isNewDay: true, streakBroken: false };
  }

  // Streak broken - starting fresh
  return { newStreak: 1, isNewDay: true, streakBroken: currentStreak > 0 };
}

/**
 * Award XP and update all gamification stats.
 * Called when completing a task, habit, or focus session.
 */
export async function awardXp(options: AwardXpOptions): Promise<XpAwardResult> {
  const {
    supabase,
    userId,
    baseXp,
    actionType,
    isHighPriority = false,
    focusMinutes = 0,
    isLongFocusSession = false,
    completionHour,
  } = options;

  const today = getLocalDateString();

  // Fetch current profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    return createEmptyResult(baseXp);
  }

  const typedProfile = profile as UserProfileV2;

  // Check if this is the first action of the day
  const isFirstAction = await isFirstActionOfDay(supabase, userId, today);

  // Calculate streak
  const { newStreak, isNewDay, streakBroken } = calculateNewStreak(
    typedProfile.last_active_date,
    typedProfile.current_streak,
    today
  );

  // Check for streak milestone
  const streakMilestone = isNewDay
    ? getNewStreakMilestone(typedProfile.current_streak, newStreak)
    : null;

  // Calculate XP with bonuses
  const permanentBonus = getPermanentXpBonus(typedProfile.level);
  const xpBreakdown = calculateXpWithBonuses(baseXp, newStreak, permanentBonus);

  // Track additional bonuses without mutating xpBreakdown
  let additionalXp = 0;

  // Add first action bonus
  let firstActionXp = 0;
  if (isFirstAction) {
    firstActionXp = FIRST_ACTION_BONUS;
    additionalXp += firstActionXp;
  }

  // Add streak milestone bonus
  if (streakMilestone) {
    additionalXp += streakMilestone.xpReward;
  }

  // Calculate total XP earned this action (base breakdown + additional bonuses)
  const actionTotalXp = xpBreakdown.totalXp + additionalXp;
  const newXpTotal = typedProfile.xp_total + actionTotalXp;
  const newLevel = getLevelFromXpV2(newXpTotal);

  const newLongestStreak = Math.max(newStreak, typedProfile.longest_streak);

  // Prepare profile update
  const profileUpdate: Record<string, unknown> = {
    xp_total: newXpTotal,
    level: newLevel,
    current_streak: newStreak,
    longest_streak: newLongestStreak,
    last_active_date: today,
    permanent_xp_bonus: permanentBonus,
  };

  // Update lifetime stats based on action type
  if (actionType === "task") {
    profileUpdate.lifetime_tasks_completed = (typedProfile.lifetime_tasks_completed ?? 0) + 1;
    if (isHighPriority) {
      profileUpdate.lifetime_high_priority_completed =
        (typedProfile.lifetime_high_priority_completed ?? 0) + 1;
    }
  } else if (actionType === "habit") {
    profileUpdate.lifetime_habits_completed = (typedProfile.lifetime_habits_completed ?? 0) + 1;
  } else if (actionType === "focus") {
    profileUpdate.lifetime_focus_minutes =
      (typedProfile.lifetime_focus_minutes ?? 0) + focusMinutes;
    if (isLongFocusSession) {
      profileUpdate.lifetime_long_focus_sessions =
        (typedProfile.lifetime_long_focus_sessions ?? 0) + 1;
    }
  }

  // Track early bird / night owl
  if (completionHour !== undefined) {
    if (completionHour < 7) {
      profileUpdate.lifetime_early_bird_tasks =
        (typedProfile.lifetime_early_bird_tasks ?? 0) + 1;
    } else if (completionHour >= 22) {
      profileUpdate.lifetime_night_owl_tasks =
        (typedProfile.lifetime_night_owl_tasks ?? 0) + 1;
    }
  }

  // Track streak recovery
  if (streakBroken && newStreak === 1) {
    profileUpdate.lifetime_streak_recoveries =
      (typedProfile.lifetime_streak_recoveries ?? 0) + 1;
  }

  // Update challenge progress first to check for bonuses
  const challengeType =
    actionType === "task"
      ? isHighPriority
        ? "high_priority"
        : "tasks"
      : actionType === "habit"
      ? "habits"
      : "focus";

  const incrementValue = actionType === "focus" ? focusMinutes : 1;

  const { completed: dailyCompleted, dailySweep } = await updateDailyChallengeProgress(
    supabase,
    userId,
    challengeType as "tasks" | "focus" | "habits" | "high_priority",
    incrementValue,
    today
  );

  // Calculate daily sweep bonus if achieved
  let sweepXp = 0;
  if (dailySweep) {
    const sweepBreakdown = calculateXpWithBonuses(DAILY_SWEEP_BONUS, newStreak, permanentBonus);
    sweepXp = sweepBreakdown.totalXp;
  }

  // Update weekly challenge
  const weeklyActionType = challengeType === "high_priority" ? "tasks" : challengeType;
  const weeklyCompleted = await updateWeeklyChallengeProgress(
    supabase,
    userId,
    weeklyActionType as "tasks" | "focus" | "habits",
    incrementValue
  );

  // Check for perfect day
  const isPerfectDay = await checkPerfectDay(supabase, userId, today);
  let perfectDayXp = 0;
  if (isPerfectDay) {
    const perfectBreakdown = calculateXpWithBonuses(PERFECT_DAY_BONUS, newStreak, permanentBonus);
    perfectDayXp = perfectBreakdown.totalXp;
  }

  // Check achievements with projected profile state
  const projectedXpTotal = newXpTotal + sweepXp + perfectDayXp;
  const projectedProfile = {
    ...typedProfile,
    ...profileUpdate,
    xp_total: projectedXpTotal,
  } as UserProfileV2;

  const { unlocked: achievementsUnlocked, totalXpAwarded: achievementXp } =
    await checkAllAchievements(supabase, userId, projectedProfile);

  // Calculate final XP total with all bonuses
  const finalXpTotal = newXpTotal + sweepXp + perfectDayXp + achievementXp;
  const finalLevel = getLevelFromXpV2(finalXpTotal);
  const finalLeveledUp = finalLevel > typedProfile.level;

  // Update profile with final values (single database update)
  profileUpdate.xp_total = finalXpTotal;
  profileUpdate.level = finalLevel;
  await supabase.from("user_profiles").update(profileUpdate).eq("user_id", userId);

  // Update or create activity log
  await upsertActivityLog(supabase, userId, today, {
    xpEarned: actionTotalXp + sweepXp + perfectDayXp + achievementXp,
    tasksCompleted: actionType === "task" ? 1 : 0,
    focusMinutes: actionType === "focus" ? focusMinutes : 0,
    habitsCompleted: actionType === "habit" ? 1 : 0,
    streakMaintained: true,
  });

  // Check if user earned a streak freeze
  const { data: freezeData } = await supabase
    .from("user_streak_freezes")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (freezeData && earnedStreakFreeze(newStreak, freezeData.last_freeze_earned)) {
    if (freezeData.available_freezes < 3) {
      await supabase
        .from("user_streak_freezes")
        .update({
          available_freezes: freezeData.available_freezes + 1,
          last_freeze_earned: today,
        })
        .eq("user_id", userId);
    }
  }

  return {
    xpBreakdown,
    actionTotalXp, // Base + streak + permanent + first action + milestone (for accurate deduction)
    newXpTotal: finalXpTotal,
    newLevel: finalLeveledUp ? finalLevel : null,
    leveledUp: finalLeveledUp,
    newStreak,
    streakMilestone: streakMilestone?.days ?? null,
    achievementsUnlocked,
    challengesCompleted: {
      daily: dailyCompleted,
      weekly: weeklyCompleted,
    },
    bonusXp: {
      dailySweep,
      perfectDay: isPerfectDay,
      firstAction: isFirstAction,
    },
  };
}

/**
 * Update or create activity log entry.
 */
async function upsertActivityLog(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  stats: {
    xpEarned: number;
    tasksCompleted: number;
    focusMinutes: number;
    habitsCompleted: number;
    streakMaintained: boolean;
  }
): Promise<void> {
  const { data: existing } = await supabase
    .from("user_activity_log")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", date)
    .single();

  if (existing) {
    await supabase
      .from("user_activity_log")
      .update({
        xp_earned: existing.xp_earned + stats.xpEarned,
        tasks_completed: existing.tasks_completed + stats.tasksCompleted,
        focus_minutes: existing.focus_minutes + stats.focusMinutes,
        habits_completed: existing.habits_completed + stats.habitsCompleted,
        streak_maintained: stats.streakMaintained,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("user_activity_log").insert({
      user_id: userId,
      activity_date: date,
      xp_earned: stats.xpEarned,
      tasks_completed: stats.tasksCompleted,
      focus_minutes: stats.focusMinutes,
      habits_completed: stats.habitsCompleted,
      streak_maintained: stats.streakMaintained,
    });
  }
}

/**
 * Create an empty result for when profile is not found.
 */
function createEmptyResult(baseXp: number): XpAwardResult {
  return {
    xpBreakdown: {
      baseXp,
      streakMultiplier: 1,
      streakBonus: 0,
      permanentBonus: 0,
      totalXp: baseXp,
    },
    actionTotalXp: baseXp, // For empty result, action XP equals base XP
    newXpTotal: baseXp,
    newLevel: null,
    leveledUp: false,
    newStreak: 1,
    streakMilestone: null,
    achievementsUnlocked: [],
    challengesCompleted: {
      daily: [],
      weekly: null,
    },
    bonusXp: {
      dailySweep: false,
      perfectDay: false,
      firstAction: false,
    },
  };
}
