// =============================================================================
// GAMIFICATION PROFILE API
// GET: Fetch full gamification profile including stats, streaks, and progress.
// =============================================================================

import { withAuth, successResponse, ApiErrors } from "@/app/lib/auth-middleware";
import { getLevelProgressV2, getStreakMultiplier, getTitleForLevel } from "@/app/lib/gamification";
import { getAchievementsWithProgress } from "@/app/lib/achievements";
import { getTodaysChallenges, getThisWeeksChallenge } from "@/app/lib/challenges";
import type { GamificationProfile, UserProfileV2 } from "@/app/lib/types";

export const GET = withAuth(async ({ user, supabase }) => {
  // Fetch user profile with V2 fields
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return ApiErrors.notFound("Profile not found");
  }

  const typedProfile = profile as UserProfileV2;

  // Calculate level progress
  const levelProgress = getLevelProgressV2(typedProfile.xp_total);

  // Get streak info with multiplier
  const streakMultiplier = getStreakMultiplier(typedProfile.current_streak);

  // Fetch streak freezes
  const { data: freezeData } = await supabase
    .from("user_streak_freezes")
    .select("available_freezes")
    .eq("user_id", user.id)
    .single();

  // Get achievements with progress
  const achievements = await getAchievementsWithProgress(supabase, user.id, typedProfile);

  // Count unlocked achievements
  const unlockedCount = achievements.filter(
    (a) => a.userProgress?.current_tier
  ).length;

  // Get recent unlocks (last 3)
  const recentUnlocks = achievements
    .filter((a) => a.userProgress?.current_tier)
    .sort((a, b) => {
      const aDate = a.userProgress?.gold_unlocked_at ||
        a.userProgress?.silver_unlocked_at ||
        a.userProgress?.bronze_unlocked_at || "";
      const bDate = b.userProgress?.gold_unlocked_at ||
        b.userProgress?.silver_unlocked_at ||
        b.userProgress?.bronze_unlocked_at || "";
      return bDate.localeCompare(aDate);
    })
    .slice(0, 3);

  // Get today's daily challenges
  const dailyChallenges = await getTodaysChallenges(supabase, user.id);

  // Get this week's challenge
  const weeklyChallenge = await getThisWeeksChallenge(supabase, user.id);

  const response: GamificationProfile = {
    profile: typedProfile,
    levelProgress: {
      ...levelProgress,
      title: getTitleForLevel(levelProgress.currentLevel),
      nextTitle: levelProgress.nextTitle,
    },
    streakInfo: {
      currentStreak: typedProfile.current_streak,
      longestStreak: typedProfile.longest_streak,
      multiplier: streakMultiplier,
      freezesAvailable: freezeData?.available_freezes ?? 1,
      lastActiveDate: typedProfile.last_active_date,
    },
    achievementsSummary: {
      unlocked: unlockedCount,
      total: achievements.length,
      recentUnlocks,
    },
    dailyChallenges,
    weeklyChallenge,
  };

  return successResponse(response);
});
