// =============================================================================
// CHALLENGE LOGIC
// Functions for generating and managing daily/weekly challenges.
// =============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  DailyChallengeTemplate,
  UserDailyChallenge,
  UserWeeklyChallenge,
  WeeklyChallengeTemplate,
} from "./types";
import { getLocalDateString } from "./gamification";

/**
 * Daily sweep bonus XP when all 3 daily challenges are completed.
 * @deprecated No longer awarded - removed as part of XP transparency redesign.
 * XP is now awarded per individual challenge completion, not as a hidden sweep bonus.
 */
export const DAILY_SWEEP_BONUS = 25;

/**
 * Perfect day bonus XP (all habits + 3+ tasks).
 * @deprecated No longer awarded - removed as part of XP transparency redesign.
 * Was a hidden bonus that users didn't see - now removed for fairness.
 */
export const PERFECT_DAY_BONUS = 50;

/**
 * First action of the day bonus XP.
 * @deprecated No longer awarded - removed as part of XP transparency redesign.
 * Was a hidden bonus that users didn't see - now removed for fairness.
 */
export const FIRST_ACTION_BONUS = 5;

/**
 * Get the Monday of the current week.
 */
export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return getLocalDateString(d);
}

/**
 * Shuffle array using Fisher-Yates algorithm with seed.
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let m = result.length;
  let t: T;
  let i: number;

  while (m) {
    // Simple seeded random
    seed = (seed * 9301 + 49297) % 233280;
    i = Math.floor((seed / 233280) * m--);
    t = result[m];
    result[m] = result[i];
    result[i] = t;
  }

  return result;
}

/**
 * Generate a seed from a date string for deterministic challenge selection.
 */
function dateToSeed(dateString: string): number {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Generate daily challenges for a user on a specific date.
 * Selects 1 easy, 1 medium, and 1 hard challenge.
 */
export async function generateDailyChallenges(
  supabase: SupabaseClient,
  userId: string,
  date: string = getLocalDateString()
): Promise<UserDailyChallenge[]> {
  // Check if challenges already exist for this date
  const { data: existing } = await supabase
    .from("user_daily_challenges")
    .select("*, template:daily_challenge_templates(*)")
    .eq("user_id", userId)
    .eq("challenge_date", date);

  if (existing && existing.length === 3) {
    return existing.map((c) => ({
      ...c,
      template: c.template,
    }));
  }

  // Fetch all templates grouped by difficulty
  const { data: templates, error } = await supabase
    .from("daily_challenge_templates")
    .select("*");

  if (error || !templates) {
    console.error("Error fetching challenge templates:", error);
    return [];
  }

  const easy = templates.filter((t) => t.difficulty === "easy");
  const medium = templates.filter((t) => t.difficulty === "medium");
  const hard = templates.filter((t) => t.difficulty === "hard");

  // Use date as seed for deterministic but varied selection
  const seed = dateToSeed(date + userId);

  const shuffledEasy = seededShuffle(easy, seed);
  const shuffledMedium = seededShuffle(medium, seed + 1);
  const shuffledHard = seededShuffle(hard, seed + 2);

  const selectedTemplates = [
    shuffledEasy[0],
    shuffledMedium[0],
    shuffledHard[0],
  ].filter(Boolean) as DailyChallengeTemplate[];

  // Insert new challenges (skip if already partially exists)
  const existingTemplateIds = new Set(existing?.map((e) => e.template_id) ?? []);

  const toInsert = selectedTemplates
    .filter((t) => !existingTemplateIds.has(t.id))
    .map((template) => ({
      user_id: userId,
      template_id: template.id,
      challenge_date: date,
      progress: 0,
      completed: false,
    }));

  if (toInsert.length > 0) {
    await supabase.from("user_daily_challenges").insert(toInsert);
  }

  // Fetch the complete challenges
  const { data: challenges } = await supabase
    .from("user_daily_challenges")
    .select("*, template:daily_challenge_templates(*)")
    .eq("user_id", userId)
    .eq("challenge_date", date);

  return (challenges ?? []).map((c) => ({
    ...c,
    template: c.template,
  }));
}

/**
 * Generate weekly challenge for a user.
 */
export async function generateWeeklyChallenge(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string = getWeekStartDate()
): Promise<UserWeeklyChallenge | null> {
  // Check if challenge already exists for this week
  const { data: existing } = await supabase
    .from("user_weekly_challenges")
    .select("*, template:weekly_challenge_templates(*)")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .single();

  if (existing) {
    return {
      ...existing,
      template: existing.template,
    };
  }

  // Fetch all weekly templates
  const { data: templates, error } = await supabase
    .from("weekly_challenge_templates")
    .select("*");

  if (error || !templates || templates.length === 0) {
    console.error("Error fetching weekly templates:", error);
    return null;
  }

  // Use week start as seed for deterministic selection
  const seed = dateToSeed(weekStart + userId);
  const shuffled = seededShuffle(templates, seed);
  const selected = shuffled[0] as WeeklyChallengeTemplate;

  // Insert new challenge
  const { data: challenge, error: insertError } = await supabase
    .from("user_weekly_challenges")
    .insert({
      user_id: userId,
      template_id: selected.id,
      week_start: weekStart,
      progress: 0,
      completed: false,
    })
    .select("*, template:weekly_challenge_templates(*)")
    .single();

  if (insertError) {
    console.error("Error inserting weekly challenge:", insertError);
    return null;
  }

  return challenge
    ? {
        ...challenge,
        template: challenge.template,
      }
    : null;
}

/**
 * Update daily challenge progress based on action type.
 */
export async function updateDailyChallengeProgress(
  supabase: SupabaseClient,
  userId: string,
  actionType: "tasks" | "focus" | "habits" | "high_priority",
  incrementValue: number,
  date: string = getLocalDateString()
): Promise<{ completed: UserDailyChallenge[]; dailySweep: boolean }> {
  // Ensure challenges exist
  await generateDailyChallenges(supabase, userId, date);

  // Fetch user's daily challenges with templates
  const { data: challenges } = await supabase
    .from("user_daily_challenges")
    .select("*, template:daily_challenge_templates(*)")
    .eq("user_id", userId)
    .eq("challenge_date", date);

  if (!challenges) {
    return { completed: [], dailySweep: false };
  }

  const newlyCompleted: UserDailyChallenge[] = [];

  for (const challenge of challenges) {
    if (challenge.completed) continue;

    const template = challenge.template as DailyChallengeTemplate;
    if (!template) continue;

    // Check if this challenge tracks this action type
    if (template.challenge_type !== actionType) continue;

    // Update progress
    const newProgress = challenge.progress + incrementValue;

    // Check completion
    // target_value of -1 means "all" (handled separately)
    const isComplete =
      template.target_value > 0 && newProgress >= template.target_value;

    const updateData: Partial<UserDailyChallenge> = {
      progress: newProgress,
    };

    if (isComplete && !challenge.completed) {
      updateData.completed = true;
      updateData.completed_at = new Date().toISOString();
      updateData.xp_awarded = template.xp_reward;

      newlyCompleted.push({
        ...challenge,
        ...updateData,
        template,
      });
    }

    await supabase
      .from("user_daily_challenges")
      .update(updateData)
      .eq("id", challenge.id);
  }

  // Check for daily sweep (all 3 completed)
  const { data: updatedChallenges } = await supabase
    .from("user_daily_challenges")
    .select("completed")
    .eq("user_id", userId)
    .eq("challenge_date", date);

  const dailySweep =
    updatedChallenges?.length === 3 &&
    updatedChallenges.every((c) => c.completed);

  return { completed: newlyCompleted, dailySweep };
}

/**
 * Check and complete "complete all habits" challenge.
 */
export async function checkAllHabitsChallenge(
  supabase: SupabaseClient,
  userId: string,
  date: string = getLocalDateString()
): Promise<UserDailyChallenge | null> {
  // Count total habits for user
  const { count: totalHabits } = await supabase
    .from("habits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!totalHabits || totalHabits === 0) return null;

  // Count completed habits today
  const { count: completedHabits } = await supabase
    .from("habit_completions")
    .select("*", { count: "exact", head: true })
    .eq("completed_date", date);

  if (completedHabits !== totalHabits) return null;

  // Find the "complete all habits" challenge
  const { data: challenge } = await supabase
    .from("user_daily_challenges")
    .select("*, template:daily_challenge_templates(*)")
    .eq("user_id", userId)
    .eq("challenge_date", date)
    .eq("completed", false)
    .single();

  if (!challenge) return null;

  const template = challenge.template as DailyChallengeTemplate;
  if (template?.key !== "complete_all_habits") return null;

  // Complete the challenge
  await supabase
    .from("user_daily_challenges")
    .update({
      progress: totalHabits,
      completed: true,
      completed_at: new Date().toISOString(),
      xp_awarded: template.xp_reward,
    })
    .eq("id", challenge.id);

  return {
    ...challenge,
    completed: true,
    xp_awarded: template.xp_reward,
    template,
  };
}

/**
 * Update weekly challenge progress.
 */
export async function updateWeeklyChallengeProgress(
  supabase: SupabaseClient,
  userId: string,
  actionType: "tasks" | "focus" | "habits" | "streak" | "daily_challenges",
  incrementValue: number,
  weekStart: string = getWeekStartDate()
): Promise<UserWeeklyChallenge | null> {
  // Ensure challenge exists
  await generateWeeklyChallenge(supabase, userId, weekStart);

  // Fetch the challenge
  const { data: challenge } = await supabase
    .from("user_weekly_challenges")
    .select("*, template:weekly_challenge_templates(*)")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .single();

  if (!challenge || challenge.completed) return null;

  const template = challenge.template as WeeklyChallengeTemplate;
  if (!template || template.challenge_type !== actionType) return null;

  // Update progress
  const newProgress = challenge.progress + incrementValue;
  const isComplete = newProgress >= template.target_value;

  const updateData: Partial<UserWeeklyChallenge> = {
    progress: newProgress,
  };

  if (isComplete) {
    updateData.completed = true;
    updateData.completed_at = new Date().toISOString();
    updateData.xp_awarded = template.xp_reward;
  }

  await supabase
    .from("user_weekly_challenges")
    .update(updateData)
    .eq("id", challenge.id);

  return isComplete
    ? {
        ...challenge,
        ...updateData,
        template,
      }
    : null;
}

/**
 * Get today's daily challenges for a user.
 */
export async function getTodaysChallenges(
  supabase: SupabaseClient,
  userId: string
): Promise<UserDailyChallenge[]> {
  const today = getLocalDateString();
  return generateDailyChallenges(supabase, userId, today);
}

/**
 * Get this week's challenge for a user.
 */
export async function getThisWeeksChallenge(
  supabase: SupabaseClient,
  userId: string
): Promise<UserWeeklyChallenge | null> {
  const weekStart = getWeekStartDate();
  return generateWeeklyChallenge(supabase, userId, weekStart);
}

/**
 * Check if this is the first action of the day.
 * @deprecated No longer used - first action bonus removed (XP transparency redesign).
 * Kept for reference, may be removed in future.
 */
export async function isFirstActionOfDay(
  supabase: SupabaseClient,
  userId: string,
  date: string = getLocalDateString()
): Promise<boolean> {
  const { data: activity } = await supabase
    .from("user_activity_log")
    .select("tasks_completed, habits_completed, focus_minutes")
    .eq("user_id", userId)
    .eq("activity_date", date)
    .single();

  if (!activity) return true;

  const totalActions =
    (activity.tasks_completed ?? 0) +
    (activity.habits_completed ?? 0) +
    (activity.focus_minutes > 0 ? 1 : 0);

  return totalActions === 0;
}

/**
 * Check for perfect day (all habits + 3+ tasks).
 * @deprecated No longer used - perfect day bonus removed (XP transparency redesign).
 * Kept for reference, may be removed in future.
 */
export async function checkPerfectDay(
  supabase: SupabaseClient,
  userId: string,
  date: string = getLocalDateString()
): Promise<boolean> {
  // Count total habits
  const { count: totalHabits } = await supabase
    .from("habits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!totalHabits || totalHabits === 0) return false;

  // Count completed habits today
  const { count: completedHabits } = await supabase
    .from("habit_completions")
    .select("*", { count: "exact", head: true })
    .eq("completed_date", date);

  if (completedHabits !== totalHabits) return false;

  // Count tasks completed today
  const { data: activity } = await supabase
    .from("user_activity_log")
    .select("tasks_completed")
    .eq("user_id", userId)
    .eq("activity_date", date)
    .single();

  return (activity?.tasks_completed ?? 0) >= 3;
}
