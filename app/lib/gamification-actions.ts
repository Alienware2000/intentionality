// =============================================================================
// GAMIFICATION ACTIONS
// Shared functions for awarding XP and updating stats across toggle routes.
//
// XP SYSTEM DESIGN PRINCIPLES:
// 1. Transparency: Every XP source is clearly shown and celebrated
// 2. Fairness: Full reversal when unchecking (base XP only)
// 3. No silent bonuses: If XP is awarded, user sees it
//
// XP Sources:
// - Core actions (tasks, habits, focus, etc.) award base XP directly
// - Daily challenges award XP when completed (celebrated with toast)
// - Achievements award XP when unlocked (celebrated with modal)
// - NO hidden multipliers (streak, permanent level bonus, etc.)
// =============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfileV2, XpAwardResult } from "./types";
import {
  getLevelFromXpV2,
  getLocalDateString,
  earnedStreakFreeze,
  getTitleForLevel,
} from "./gamification";
import { checkAllAchievements } from "./achievements";
import {
  updateDailyChallengeProgress,
  updateWeeklyChallengeProgress,
} from "./challenges";
import { getWeekStartUTC } from "./date-utils";

/**
 * Group challenge completion result.
 */
export type GroupChallengeResult = {
  challenge_id: string;
  group_id: string;
  completed: boolean;
  xp_reward: number;
};

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
 *
 * XP TRANSPARENCY:
 * - baseXp is awarded directly (no hidden multipliers)
 * - Challenge XP is returned separately for celebration
 * - Achievement XP is returned separately for celebration
 * - actionTotalXp = baseXp (for accurate reversal on uncheck)
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

  // Calculate streak (for tracking/achievements, NOT for XP multipliers)
  const { newStreak, streakBroken } = calculateNewStreak(
    typedProfile.last_active_date,
    typedProfile.current_streak,
    today
  );

  // XP TRANSPARENCY: Award exactly baseXp - no hidden multipliers
  const actionTotalXp = baseXp;
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

  // Track early bird / night owl (for achievements)
  if (completionHour !== undefined) {
    if (completionHour < 7) {
      profileUpdate.lifetime_early_bird_tasks =
        (typedProfile.lifetime_early_bird_tasks ?? 0) + 1;
    } else if (completionHour >= 22) {
      profileUpdate.lifetime_night_owl_tasks =
        (typedProfile.lifetime_night_owl_tasks ?? 0) + 1;
    }
  }

  // Track streak recovery (for achievements)
  if (streakBroken && newStreak === 1) {
    profileUpdate.lifetime_streak_recoveries =
      (typedProfile.lifetime_streak_recoveries ?? 0) + 1;
  }

  // Update challenge progress
  const challengeType =
    actionType === "task"
      ? isHighPriority
        ? "high_priority"
        : "tasks"
      : actionType === "habit"
      ? "habits"
      : "focus";

  const incrementValue = actionType === "focus" ? focusMinutes : 1;

  // Track daily challenge progress - XP from challenges is awarded separately
  const { completed: dailyCompleted } = await updateDailyChallengeProgress(
    supabase,
    userId,
    challengeType as "tasks" | "focus" | "habits" | "high_priority",
    incrementValue,
    today
  );

  // Calculate challenge XP (awarded separately, celebrated with toast)
  let challengeXp = 0;
  for (const challenge of dailyCompleted) {
    if (challenge.xp_awarded) {
      challengeXp += challenge.xp_awarded;
    }
  }

  // Update weekly challenge
  const weeklyActionType = challengeType === "high_priority" ? "tasks" : challengeType;
  const weeklyCompleted = await updateWeeklyChallengeProgress(
    supabase,
    userId,
    weeklyActionType as "tasks" | "focus" | "habits",
    incrementValue
  );

  // Add weekly challenge XP if completed
  if (weeklyCompleted?.xp_awarded) {
    challengeXp += weeklyCompleted.xp_awarded;
  }

  // Check achievements with projected profile state
  const projectedXpTotal = newXpTotal + challengeXp;
  const projectedProfile = {
    ...typedProfile,
    ...profileUpdate,
    xp_total: projectedXpTotal,
  } as UserProfileV2;

  const { unlocked: achievementsUnlocked, totalXpAwarded: achievementXp } =
    await checkAllAchievements(supabase, userId, projectedProfile);

  // Calculate final XP total (base + challenge + achievement)
  const finalXpTotal = newXpTotal + challengeXp + achievementXp;
  const finalLevel = getLevelFromXpV2(finalXpTotal);
  const finalLeveledUp = finalLevel > typedProfile.level;

  // Update profile with final values (single database update)
  profileUpdate.xp_total = finalXpTotal;
  profileUpdate.level = finalLevel;
  profileUpdate.title = getTitleForLevel(finalLevel);
  await supabase.from("user_profiles").update(profileUpdate).eq("user_id", userId);

  // Update or create activity log
  await upsertActivityLog(supabase, userId, today, {
    xpEarned: actionTotalXp + challengeXp + achievementXp,
    tasksCompleted: actionType === "task" ? 1 : 0,
    focusMinutes: actionType === "focus" ? focusMinutes : 0,
    habitsCompleted: actionType === "habit" ? 1 : 0,
    streakMaintained: true,
  });

  // Update group weekly XP and challenge progress
  await updateGroupProgress(supabase, userId, actionTotalXp, actionType, incrementValue);

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

  // XP Breakdown for transparency (no hidden multipliers)
  const xpBreakdown = {
    baseXp,
    streakMultiplier: 1, // No longer used - kept for type compatibility
    streakBonus: 0,
    permanentBonus: 0,
    totalXp: baseXp,
  };

  return {
    xpBreakdown,
    actionTotalXp, // Exactly baseXp - for accurate deduction on uncheck
    newXpTotal: finalXpTotal,
    newLevel: finalLeveledUp ? finalLevel : null,
    leveledUp: finalLeveledUp,
    newStreak,
    streakMilestone: null, // No longer awarding XP for streak milestones
    achievementsUnlocked,
    challengesCompleted: {
      daily: dailyCompleted,
      weekly: weeklyCompleted,
    },
    // Bonus XP tracking for celebrations
    bonusXp: {
      dailySweep: false, // Removed - was hidden bonus
      perfectDay: false, // Removed - was hidden bonus
      firstAction: false, // Removed - was hidden bonus
      challengeXp, // NEW: Track challenge XP for celebration
      achievementXp, // NEW: Track achievement XP for celebration
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
      challengeXp: 0,
      achievementXp: 0,
    },
  };
}

// =============================================================================
// GROUP PROGRESS TRACKING
// Updates group weekly XP and challenge progress when user earns XP.
// =============================================================================

/**
 * Update group progress when a user earns XP.
 * - Updates weekly_xp for all groups the user is in
 * - Updates group challenge progress
 * - Clears at-risk status since user was productive
 */
async function updateGroupProgress(
  supabase: SupabaseClient,
  userId: string,
  xpEarned: number,
  actionType: GamificationActionType,
  incrementValue: number
): Promise<void> {
  try {
    // Get all groups the user is a member of
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, weekly_xp")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) {
      return;
    }

    // Update weekly XP for each group membership
    for (const membership of memberships) {
      await supabase
        .from("group_members")
        .update({ weekly_xp: (membership.weekly_xp || 0) + xpEarned })
        .eq("user_id", userId)
        .eq("group_id", membership.group_id);

      // Also update group's total_xp
      const { data: group } = await supabase
        .from("groups")
        .select("total_xp")
        .eq("id", membership.group_id)
        .single();

      if (group) {
        await supabase
          .from("groups")
          .update({ total_xp: (group.total_xp || 0) + xpEarned })
          .eq("id", membership.group_id);
      }
    }

    // Record productive action (clears at-risk status) using SQL function
    await supabase.rpc("record_productive_action", { p_user_id: userId });

    // Map action type to challenge type
    const challengeType =
      actionType === "task"
        ? "tasks"
        : actionType === "habit"
        ? "habits"
        : actionType === "focus"
        ? "focus"
        : "xp";

    // Get current week start for challenge lookup
    const weekStart = getWeekStartUTC();

    const groupIds = memberships.map((m) => m.group_id);

    // Update group challenges
    for (const groupId of groupIds) {
      // Update challenge for action type
      const { data: actionChallenge } = await supabase
        .from("group_challenges")
        .select("id, current_progress, target_value, completed")
        .eq("group_id", groupId)
        .eq("week_start", weekStart)
        .eq("challenge_type", challengeType)
        .eq("completed", false)
        .single();

      if (actionChallenge) {
        const newProgress = actionChallenge.current_progress + incrementValue;
        const isNowCompleted = newProgress >= actionChallenge.target_value;

        await supabase
          .from("group_challenges")
          .update({
            current_progress: newProgress,
            completed: isNowCompleted,
            completed_at: isNowCompleted ? new Date().toISOString() : null,
          })
          .eq("id", actionChallenge.id);
      }

      // Also update XP-type challenges if different
      if (challengeType !== "xp") {
        const { data: xpChallenge } = await supabase
          .from("group_challenges")
          .select("id, current_progress, target_value, completed")
          .eq("group_id", groupId)
          .eq("week_start", weekStart)
          .eq("challenge_type", "xp")
          .eq("completed", false)
          .single();

        if (xpChallenge) {
          const newProgress = xpChallenge.current_progress + xpEarned;
          const isNowCompleted = newProgress >= xpChallenge.target_value;

          await supabase
            .from("group_challenges")
            .update({
              current_progress: newProgress,
              completed: isNowCompleted,
              completed_at: isNowCompleted ? new Date().toISOString() : null,
            })
            .eq("id", xpChallenge.id);
        }
      }
    }
  } catch (error) {
    // Group features may not be set up yet - log error but continue
    // This prevents group feature failures from blocking main XP flow
    console.error(
      "[updateGroupProgress] Error updating group progress (non-fatal):",
      error instanceof Error ? error.message : error
    );
  }
}
