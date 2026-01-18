// =============================================================================
// STREAK FREEZE API
// GET: Fetch user's streak freeze inventory.
// POST: Use a streak freeze to protect the streak.
// =============================================================================

import {
  withAuth,
  successResponse,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLocalDateString } from "@/app/lib/gamification";

export const GET = withAuth(async ({ user, supabase }) => {
  // Fetch user's streak freeze inventory
  const { data: freezeData, error } = await supabase
    .from("user_streak_freezes")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return ApiErrors.serverError(error.message);
  }

  // Create default record if doesn't exist
  if (!freezeData) {
    const { data: newFreezeData, error: insertError } = await supabase
      .from("user_streak_freezes")
      .insert({ user_id: user.id, available_freezes: 1 })
      .select()
      .single();

    if (insertError) {
      return ApiErrors.serverError(insertError.message);
    }

    return successResponse({ freezes: newFreezeData });
  }

  return successResponse({ freezes: freezeData });
});

export const POST = withAuth(async ({ user, supabase }) => {
  const today = getLocalDateString();

  // Fetch current freeze inventory
  const { data: freezeData, error: fetchError } = await supabase
    .from("user_streak_freezes")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    return ApiErrors.serverError(fetchError.message);
  }

  // Create record if doesn't exist
  if (!freezeData) {
    await supabase
      .from("user_streak_freezes")
      .insert({ user_id: user.id, available_freezes: 1 });
  }

  const availableFreezes = freezeData?.available_freezes ?? 1;
  const lastUsed = freezeData?.last_freeze_used;

  // Check if already used today
  if (lastUsed === today) {
    return ApiErrors.badRequest("Streak freeze already used today");
  }

  // Check if any freezes available
  if (availableFreezes <= 0) {
    return ApiErrors.badRequest("No streak freezes available");
  }

  // Use the freeze
  const { error: updateError } = await supabase
    .from("user_streak_freezes")
    .update({
      available_freezes: availableFreezes - 1,
      last_freeze_used: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  // Update activity log to mark freeze used
  const { data: activityLog } = await supabase
    .from("user_activity_log")
    .select("id")
    .eq("user_id", user.id)
    .eq("activity_date", today)
    .single();

  if (activityLog) {
    await supabase
      .from("user_activity_log")
      .update({ freeze_used: true })
      .eq("id", activityLog.id);
  } else {
    await supabase.from("user_activity_log").insert({
      user_id: user.id,
      activity_date: today,
      freeze_used: true,
      streak_maintained: true,
    });
  }

  return successResponse({
    used: true,
    remainingFreezes: availableFreezes - 1,
  });
});
