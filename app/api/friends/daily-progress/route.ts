// =============================================================================
// FRIEND DAILY PROGRESS API
// Returns today's productivity stats for all accepted friends.
// Used by friend cards to show daily progress visibility.
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { FriendDailyProgress } from "@/app/lib/types";

// Service role client for cross-user queries (bypasses RLS)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// -----------------------------------------------------------------------------
// GET /api/friends/daily-progress
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase }) => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return ApiErrors.serverError("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  // Get accepted friends (RLS client — user can see their friendships)
  const { data: friendships, error: friendError } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (friendError) {
    return ApiErrors.serverError(friendError.message);
  }

  if (!friendships || friendships.length === 0) {
    return successResponse({ progress: {} });
  }

  const friendIds = friendships.map((f) =>
    f.user_id === user.id ? f.friend_id : f.user_id
  );

  const admin = createAdminClient();

  // Get privacy settings to filter hidden friends
  const { data: privacyData } = await admin
    .from("user_privacy_settings")
    .select("user_id, show_activity_feed")
    .in("user_id", friendIds);

  const hiddenSet = new Set<string>();
  for (const p of privacyData ?? []) {
    if (p.show_activity_feed === false) hiddenSet.add(p.user_id);
  }

  const visibleIds = friendIds.filter((id) => !hiddenSet.has(id));
  if (visibleIds.length === 0) {
    return successResponse({ progress: {} });
  }

  // Get today's stats for visible friends (parallel)
  const today = new Date().toISOString().split("T")[0];
  const todayStart = `${today}T00:00:00.000Z`;

  const [tasksResult, habitsResult, focusResult] = await Promise.all([
    admin
      .from("tasks")
      .select("user_id, completed_at")
      .in("user_id", visibleIds)
      .eq("completed", true)
      .gte("completed_at", todayStart),
    admin
      .from("habit_completions")
      .select("habit_id, completed_at, completed_date")
      .eq("completed_date", today),
    admin
      .from("focus_sessions")
      .select("user_id, actual_duration, ended_at")
      .in("user_id", visibleIds)
      .eq("status", "completed")
      .gte("started_at", todayStart),
  ]);

  // Build habit_id → user_id mapping (habit_completions has no user_id)
  const habitUserMap = new Map<string, string>();
  if (habitsResult.data && habitsResult.data.length > 0) {
    const habitIds = [...new Set(habitsResult.data.map((h) => h.habit_id))];
    const { data: habits } = await admin
      .from("habits")
      .select("id, user_id")
      .in("id", habitIds)
      .in("user_id", visibleIds);
    for (const h of habits ?? []) {
      habitUserMap.set(h.id, h.user_id);
    }
  }

  // Aggregate per friend
  const progress: Record<string, FriendDailyProgress> = {};
  for (const id of visibleIds) {
    progress[id] = {
      tasks_completed: 0,
      habits_completed: 0,
      focus_minutes: 0,
      is_active_today: false,
      last_active: null,
    };
  }

  for (const t of tasksResult.data ?? []) {
    if (progress[t.user_id]) {
      progress[t.user_id].tasks_completed++;
      if (!progress[t.user_id].last_active || t.completed_at > progress[t.user_id].last_active!) {
        progress[t.user_id].last_active = t.completed_at;
      }
    }
  }

  for (const h of habitsResult.data ?? []) {
    const userId = habitUserMap.get(h.habit_id);
    if (userId && progress[userId]) {
      progress[userId].habits_completed++;
      if (h.completed_at && (!progress[userId].last_active || h.completed_at > progress[userId].last_active!)) {
        progress[userId].last_active = h.completed_at;
      }
    }
  }

  for (const f of focusResult.data ?? []) {
    if (progress[f.user_id]) {
      progress[f.user_id].focus_minutes += f.actual_duration || 0;
      if (f.ended_at && (!progress[f.user_id].last_active || f.ended_at > progress[f.user_id].last_active!)) {
        progress[f.user_id].last_active = f.ended_at;
      }
    }
  }

  for (const id of visibleIds) {
    const p = progress[id];
    p.is_active_today = p.tasks_completed > 0 || p.habits_completed > 0 || p.focus_minutes > 0;
  }

  return successResponse({ progress });
});
