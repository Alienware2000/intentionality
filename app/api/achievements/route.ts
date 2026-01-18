// =============================================================================
// ACHIEVEMENTS API
// GET: Fetch all achievements with user progress for display.
// =============================================================================

import { withAuth, successResponse, ApiErrors, getSearchParams } from "@/app/lib/auth-middleware";
import { getAchievementsWithProgress } from "@/app/lib/achievements";
import type { UserProfileV2, AchievementCategory } from "@/app/lib/types";

export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const category = params.get("category") as AchievementCategory | null;

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return ApiErrors.notFound("Profile not found");
  }

  // Get all achievements with progress
  let achievements = await getAchievementsWithProgress(
    supabase,
    user.id,
    profile as UserProfileV2
  );

  // Filter by category if specified
  if (category) {
    achievements = achievements.filter((a) => a.category === category);
  }

  // Group by category for display
  const grouped = achievements.reduce((acc, achievement) => {
    const cat = achievement.category;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(achievement);
    return acc;
  }, {} as Record<AchievementCategory, typeof achievements>);

  // Calculate summary stats
  const totalCount = achievements.length;
  const unlockedCount = achievements.filter(
    (a) => a.userProgress?.current_tier
  ).length;

  // Count by tier
  const bronzeCount = achievements.filter(
    (a) => a.userProgress?.bronze_unlocked_at
  ).length;
  const silverCount = achievements.filter(
    (a) => a.userProgress?.silver_unlocked_at
  ).length;
  const goldCount = achievements.filter(
    (a) => a.userProgress?.gold_unlocked_at
  ).length;

  return successResponse({
    achievements,
    grouped,
    summary: {
      total: totalCount,
      unlocked: unlockedCount,
      bronze: bronzeCount,
      silver: silverCount,
      gold: goldCount,
    },
  });
});
