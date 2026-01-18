// =============================================================================
// ACHIEVEMENTS CHECK API
// POST: Check for newly unlocked achievements and award XP.
// =============================================================================

import { withAuth, successResponse, ApiErrors } from "@/app/lib/auth-middleware";
import { checkAllAchievements } from "@/app/lib/achievements";
import { getLevelFromXpV2 } from "@/app/lib/gamification";
import type { UserProfileV2 } from "@/app/lib/types";

export const POST = withAuth(async ({ user, supabase }) => {
  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return ApiErrors.notFound("Profile not found");
  }

  const typedProfile = profile as UserProfileV2;

  // Check all achievements
  const { unlocked, totalXpAwarded } = await checkAllAchievements(
    supabase,
    user.id,
    typedProfile
  );

  let newLevel = null;
  let leveledUp = false;

  // Award XP for achievements if any were unlocked
  if (totalXpAwarded > 0) {
    const newXpTotal = typedProfile.xp_total + totalXpAwarded;
    const currentLevel = getLevelFromXpV2(typedProfile.xp_total);
    const calculatedNewLevel = getLevelFromXpV2(newXpTotal);

    leveledUp = calculatedNewLevel > currentLevel;
    if (leveledUp) {
      newLevel = calculatedNewLevel;
    }

    // Update profile with new XP
    await supabase
      .from("user_profiles")
      .update({
        xp_total: newXpTotal,
        level: calculatedNewLevel,
      })
      .eq("user_id", user.id);
  }

  return successResponse({
    unlocked,
    totalXpAwarded,
    leveledUp,
    newLevel,
  });
});
