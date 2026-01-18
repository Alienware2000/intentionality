// =============================================================================
// ACHIEVEMENT LOGIC
// Functions for checking, awarding, and managing achievements.
// =============================================================================

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Achievement,
  AchievementTier,
  AchievementWithProgress,
  UserAchievement,
  UserProfileV2,
} from "./types";

/**
 * Stat keys that map to user profile columns.
 */
export type StatKey =
  | "current_streak"
  | "lifetime_tasks_completed"
  | "lifetime_high_priority_completed"
  | "lifetime_habits_completed"
  | "lifetime_quests_completed"
  | "lifetime_focus_minutes"
  | "lifetime_perfect_weeks"
  | "lifetime_brain_dumps_processed"
  | "lifetime_early_bird_tasks"
  | "lifetime_night_owl_tasks"
  | "lifetime_long_focus_sessions"
  | "lifetime_streak_recoveries";

/**
 * Get the current value for a stat from the user profile.
 */
export function getStatValue(profile: UserProfileV2, statKey: StatKey): number {
  switch (statKey) {
    case "current_streak":
      return profile.current_streak;
    case "lifetime_tasks_completed":
      return profile.lifetime_tasks_completed ?? 0;
    case "lifetime_high_priority_completed":
      return profile.lifetime_high_priority_completed ?? 0;
    case "lifetime_habits_completed":
      return profile.lifetime_habits_completed ?? 0;
    case "lifetime_quests_completed":
      return profile.lifetime_quests_completed ?? 0;
    case "lifetime_focus_minutes":
      return profile.lifetime_focus_minutes ?? 0;
    case "lifetime_perfect_weeks":
      return profile.lifetime_perfect_weeks ?? 0;
    case "lifetime_brain_dumps_processed":
      return profile.lifetime_brain_dumps_processed ?? 0;
    case "lifetime_early_bird_tasks":
      return profile.lifetime_early_bird_tasks ?? 0;
    case "lifetime_night_owl_tasks":
      return profile.lifetime_night_owl_tasks ?? 0;
    case "lifetime_long_focus_sessions":
      return profile.lifetime_long_focus_sessions ?? 0;
    case "lifetime_streak_recoveries":
      return profile.lifetime_streak_recoveries ?? 0;
    default:
      return 0;
  }
}

/**
 * Determine which tier(s) should be unlocked based on current stat value.
 */
export function getUnlockedTiers(
  achievement: Achievement,
  currentValue: number
): { tier: AchievementTier; xpReward: number }[] {
  const unlocked: { tier: AchievementTier; xpReward: number }[] = [];

  if (currentValue >= achievement.bronze_threshold) {
    unlocked.push({ tier: "bronze", xpReward: achievement.bronze_xp });
  }
  if (currentValue >= achievement.silver_threshold) {
    unlocked.push({ tier: "silver", xpReward: achievement.silver_xp });
  }
  if (currentValue >= achievement.gold_threshold) {
    unlocked.push({ tier: "gold", xpReward: achievement.gold_xp });
  }

  return unlocked;
}

/**
 * Get the highest unlocked tier from a list.
 */
export function getHighestTier(
  tiers: { tier: AchievementTier }[]
): AchievementTier | null {
  if (tiers.some((t) => t.tier === "gold")) return "gold";
  if (tiers.some((t) => t.tier === "silver")) return "silver";
  if (tiers.some((t) => t.tier === "bronze")) return "bronze";
  return null;
}

/**
 * Get progress towards next tier.
 */
export function getProgressToNextTier(
  achievement: Achievement,
  currentValue: number,
  currentTier: AchievementTier | null
): { nextTier: AchievementTier | null; progress: number; target: number } {
  if (currentTier === "gold") {
    return {
      nextTier: null,
      progress: achievement.gold_threshold,
      target: achievement.gold_threshold,
    };
  }

  if (currentTier === "silver" || currentValue >= achievement.silver_threshold) {
    return {
      nextTier: "gold",
      progress: currentValue,
      target: achievement.gold_threshold,
    };
  }

  if (currentTier === "bronze" || currentValue >= achievement.bronze_threshold) {
    return {
      nextTier: "silver",
      progress: currentValue,
      target: achievement.silver_threshold,
    };
  }

  return {
    nextTier: "bronze",
    progress: currentValue,
    target: achievement.bronze_threshold,
  };
}

/**
 * Check a single achievement and return newly unlocked tiers.
 */
export function checkAchievementProgress(
  achievement: Achievement,
  currentValue: number,
  userProgress: UserAchievement | null
): { newTiers: { tier: AchievementTier; xpReward: number }[]; totalXp: number } {
  const unlockedTiers = getUnlockedTiers(achievement, currentValue);
  const newTiers: { tier: AchievementTier; xpReward: number }[] = [];
  let totalXp = 0;

  for (const { tier, xpReward } of unlockedTiers) {
    // Check if this tier wasn't previously unlocked
    const wasUnlocked =
      (tier === "bronze" && userProgress?.bronze_unlocked_at) ||
      (tier === "silver" && userProgress?.silver_unlocked_at) ||
      (tier === "gold" && userProgress?.gold_unlocked_at);

    if (!wasUnlocked) {
      newTiers.push({ tier, xpReward });
      totalXp += xpReward;
    }
  }

  return { newTiers, totalXp };
}

/**
 * Check all achievements for a user and return newly unlocked ones.
 */
export async function checkAllAchievements(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfileV2
): Promise<{
  unlocked: AchievementWithProgress[];
  totalXpAwarded: number;
}> {
  // Fetch all achievements
  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("*")
    .order("sort_order");

  if (achievementsError || !achievements) {
    console.error("Error fetching achievements:", achievementsError);
    return { unlocked: [], totalXpAwarded: 0 };
  }

  // Fetch user's current achievement progress
  const { data: userAchievements, error: userAchievementsError } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId);

  if (userAchievementsError) {
    console.error("Error fetching user achievements:", userAchievementsError);
    return { unlocked: [], totalXpAwarded: 0 };
  }

  const userAchievementsMap = new Map<string, UserAchievement>(
    (userAchievements ?? []).map((ua) => [ua.achievement_id, ua])
  );

  const unlocked: AchievementWithProgress[] = [];
  let totalXpAwarded = 0;

  for (const achievement of achievements) {
    const statValue = getStatValue(profile, achievement.stat_key as StatKey);
    const userProgress = userAchievementsMap.get(achievement.id) || null;

    const { newTiers, totalXp } = checkAchievementProgress(
      achievement,
      statValue,
      userProgress
    );

    if (newTiers.length > 0) {
      totalXpAwarded += totalXp;

      const now = new Date().toISOString();
      const highestNewTier = getHighestTier(newTiers);

      // Upsert user achievement progress
      const updateData: Partial<UserAchievement> = {
        progress_value: statValue,
        current_tier: highestNewTier,
      };

      for (const { tier } of newTiers) {
        if (tier === "bronze") updateData.bronze_unlocked_at = now;
        if (tier === "silver") updateData.silver_unlocked_at = now;
        if (tier === "gold") updateData.gold_unlocked_at = now;
      }

      if (userProgress) {
        // Update existing record
        await supabase
          .from("user_achievements")
          .update(updateData)
          .eq("id", userProgress.id);
      } else {
        // Insert new record
        await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: achievement.id,
          ...updateData,
        });
      }

      // Add to unlocked list
      unlocked.push({
        ...achievement,
        userProgress: {
          id: userProgress?.id ?? "",
          user_id: userId,
          achievement_id: achievement.id,
          current_tier: highestNewTier,
          bronze_unlocked_at:
            updateData.bronze_unlocked_at ?? userProgress?.bronze_unlocked_at ?? null,
          silver_unlocked_at:
            updateData.silver_unlocked_at ?? userProgress?.silver_unlocked_at ?? null,
          gold_unlocked_at:
            updateData.gold_unlocked_at ?? userProgress?.gold_unlocked_at ?? null,
          progress_value: statValue,
        },
      });
    } else if (statValue !== (userProgress?.progress_value ?? 0)) {
      // Update progress even if no new tier unlocked
      if (userProgress) {
        await supabase
          .from("user_achievements")
          .update({ progress_value: statValue })
          .eq("id", userProgress.id);
      } else {
        await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_id: achievement.id,
          progress_value: statValue,
          current_tier: null,
        });
      }
    }
  }

  // Update achievements_unlocked count in profile
  if (totalXpAwarded > 0) {
    const { data: countData } = await supabase
      .from("user_achievements")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .not("current_tier", "is", null);

    const newUnlockedCount = countData?.length ?? 0;

    await supabase
      .from("user_profiles")
      .update({ achievements_unlocked: newUnlockedCount })
      .eq("user_id", userId);
  }

  return { unlocked, totalXpAwarded };
}

/**
 * Get all achievements with user progress for display.
 */
export async function getAchievementsWithProgress(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfileV2
): Promise<AchievementWithProgress[]> {
  // Fetch all achievements
  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("*")
    .order("sort_order");

  if (achievementsError || !achievements) {
    console.error("Error fetching achievements:", achievementsError);
    return [];
  }

  // Fetch user's achievement progress
  const { data: userAchievements, error: userAchievementsError } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId);

  if (userAchievementsError) {
    console.error("Error fetching user achievements:", userAchievementsError);
  }

  const userAchievementsMap = new Map<string, UserAchievement>(
    (userAchievements ?? []).map((ua) => [ua.achievement_id, ua])
  );

  return achievements.map((achievement) => {
    const userProgress = userAchievementsMap.get(achievement.id) || null;
    const statValue = getStatValue(profile, achievement.stat_key as StatKey);

    return {
      ...achievement,
      userProgress: userProgress
        ? { ...userProgress, progress_value: statValue }
        : {
            id: "",
            user_id: userId,
            achievement_id: achievement.id,
            current_tier: null,
            bronze_unlocked_at: null,
            silver_unlocked_at: null,
            gold_unlocked_at: null,
            progress_value: statValue,
          },
    };
  });
}
