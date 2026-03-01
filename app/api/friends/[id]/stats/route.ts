// =============================================================================
// FRIEND STATS API
// Returns analytics data for a specific friend, with comparison to current user.
// Used by the friend profile page.
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { toISODateString } from "@/app/lib/date-utils";

// Service role client for cross-user queries (bypasses RLS)
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// -----------------------------------------------------------------------------
// GET /api/friends/[id]/stats
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase, request }) => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return ApiErrors.serverError("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const friendId = pathParts[pathParts.indexOf("friends") + 1];

  if (!friendId) return ApiErrors.badRequest("Friend ID is required");
  if (friendId === user.id) return ApiErrors.badRequest("Cannot view your own friend profile");

  const days = parseInt(url.searchParams.get("days") || "30", 10);
  const validDays = Math.min(Math.max(days, 7), 365);

  // ---------------------------------------------------------------------------
  // 1. Check friendship (RLS client)
  // ---------------------------------------------------------------------------

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
    )
    .limit(1)
    .maybeSingle();

  if (!friendship) {
    return ApiErrors.notFound("This user is not your friend");
  }

  // ---------------------------------------------------------------------------
  // 2. Admin client for cross-user queries
  // ---------------------------------------------------------------------------

  const admin = createAdminClient();

  // ---------------------------------------------------------------------------
  // 3. Privacy settings + friend profile (parallel)
  // ---------------------------------------------------------------------------

  const [privacyResult, profileResult] = await Promise.all([
    admin
      .from("user_privacy_settings")
      .select("show_activity_feed, show_habits_to_friends, show_xp, show_level, show_streak")
      .eq("user_id", friendId)
      .maybeSingle(),
    admin
      .from("user_profiles")
      .select("user_id, display_name, username, xp_total, level, current_streak, longest_streak, title")
      .eq("user_id", friendId)
      .single(),
  ]);

  if (!profileResult.data) {
    return ApiErrors.notFound("User not found");
  }

  const privacy = {
    show_activity: privacyResult.data?.show_activity_feed ?? true,
    show_habits: (privacyResult.data?.show_habits_to_friends ?? true) &&
      (privacyResult.data?.show_activity_feed ?? true),
    show_xp: privacyResult.data?.show_xp ?? true,
    show_level: privacyResult.data?.show_level ?? true,
    show_streak: privacyResult.data?.show_streak ?? true,
  };

  const profile = {
    user_id: profileResult.data.user_id,
    display_name: profileResult.data.display_name,
    username: profileResult.data.username,
    xp_total: privacy.show_xp ? profileResult.data.xp_total : null,
    level: privacy.show_level ? profileResult.data.level : null,
    current_streak: privacy.show_streak ? profileResult.data.current_streak : null,
    longest_streak: privacy.show_streak ? profileResult.data.longest_streak : null,
    title: profileResult.data.title,
  };

  // ---------------------------------------------------------------------------
  // 4. Friend's period stats (if activity visible)
  // ---------------------------------------------------------------------------

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - validDays);
  const periodStartISO = periodStart.toISOString();
  const periodStartDate = periodStartISO.split("T")[0];

  let periodStats = null;
  if (privacy.show_activity) {
    // Get friend's habit IDs first (habit_completions has no user_id column)
    const { data: friendHabits } = await admin
      .from("habits")
      .select("id")
      .eq("user_id", friendId);
    const friendHabitIds = friendHabits?.map((h: { id: string }) => h.id) ?? [];

    // Get friend's quest IDs (tasks have no user_id column — owned through quests)
    const { data: friendQuests } = await admin
      .from("quests")
      .select("id")
      .eq("user_id", friendId);
    const friendQuestIds = friendQuests?.map((q: { id: string }) => q.id) ?? [];

    const [tasksResult, focusResult, habitsResult] = await Promise.all([
      friendQuestIds.length > 0
        ? admin
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .in("quest_id", friendQuestIds)
            .eq("completed", true)
            .gte("completed_at", periodStartISO)
        : Promise.resolve({ count: 0, data: null, error: null }),
      admin
        .from("focus_sessions")
        .select("work_duration")
        .eq("user_id", friendId)
        .eq("status", "completed")
        .gte("started_at", periodStartISO),
      friendHabitIds.length > 0
        ? admin
            .from("habit_completions")
            .select("id", { count: "exact", head: true })
            .in("habit_id", friendHabitIds)
            .gte("completed_date", periodStartDate)
        : Promise.resolve({ count: 0, data: null, error: null }),
    ]);

    const focusMinutes = (focusResult.data ?? []).reduce(
      (sum: number, s: { work_duration: number | null }) => sum + (s.work_duration || 0),
      0
    );

    periodStats = {
      tasks_completed: tasksResult.count ?? 0,
      focus_minutes: focusMinutes,
      habits_completed: habitsResult.count ?? 0,
      xp_earned: null,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Current user's comparison stats (RLS client — own data)
  // ---------------------------------------------------------------------------

  // Get own habit IDs first
  const { data: myHabits } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", user.id);
  const myHabitIds = myHabits?.map((h: { id: string }) => h.id) ?? [];

  const [myProfileResult, myTasksResult, myFocusResult, myHabitsResult] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("xp_total, level, current_streak, longest_streak")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("completed_at", periodStartISO),
      supabase
        .from("focus_sessions")
        .select("work_duration")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", periodStartISO),
      myHabitIds.length > 0
        ? supabase
            .from("habit_completions")
            .select("id", { count: "exact", head: true })
            .in("habit_id", myHabitIds)
            .gte("completed_date", periodStartDate)
        : Promise.resolve({ count: 0, data: null, error: null }),
    ]);

  const myFocusMinutes = (myFocusResult.data ?? []).reduce(
    (sum: number, s: { work_duration: number | null }) => sum + (s.work_duration || 0),
    0
  );

  const comparison = {
    level: myProfileResult.data?.level ?? 1,
    current_streak: myProfileResult.data?.current_streak ?? 0,
    longest_streak: myProfileResult.data?.longest_streak ?? 0,
    xp_total: myProfileResult.data?.xp_total ?? 0,
    tasks_completed: myTasksResult.count ?? 0,
    focus_minutes: myFocusMinutes,
    habits_completed: myHabitsResult.count ?? 0,
  };

  // ---------------------------------------------------------------------------
  // 6. Friend's habits + completions (if privacy allows)
  // ---------------------------------------------------------------------------

  let habits = null;
  if (privacy.show_habits) {
    const { data: habitData } = await admin
      .from("habits")
      .select("*")
      .eq("user_id", friendId)
      .eq("is_archived", false)
      .order("created_at", { ascending: true });

    if (habitData && habitData.length > 0) {
      const habitIds = habitData.map((h: { id: string }) => h.id);
      const { data: completionData } = await admin
        .from("habit_completions")
        .select("habit_id, completed_date")
        .in("habit_id", habitIds)
        .gte("completed_date", periodStartDate);

      const completions: Record<string, string[]> = {};
      for (const c of completionData ?? []) {
        if (!completions[c.habit_id]) completions[c.habit_id] = [];
        completions[c.habit_id].push(c.completed_date);
      }

      habits = { habits: habitData, completions };
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Activity heatmap (year to date: Jan 1 → today)
  // ---------------------------------------------------------------------------

  let heatmap = null;
  if (privacy.show_activity) {
    const now = new Date();
    const yearStartDate = `${now.getFullYear()}-01-01`;
    const yearStartISO = `${yearStartDate}T00:00:00`;

    // Get friend's habit IDs for heatmap
    const { data: heatHabitData } = await admin
      .from("habits")
      .select("id")
      .eq("user_id", friendId);
    const heatHabitIds = heatHabitData?.map((h: { id: string }) => h.id) ?? [];

    // Get friend's quest IDs for heatmap (tasks owned through quests)
    const { data: heatQuestData } = await admin
      .from("quests")
      .select("id")
      .eq("user_id", friendId);
    const heatQuestIds = heatQuestData?.map((q: { id: string }) => q.id) ?? [];

    const [heatTasks, heatFocus, heatHabits] = await Promise.all([
      heatQuestIds.length > 0
        ? admin
            .from("tasks")
            .select("completed_at")
            .in("quest_id", heatQuestIds)
            .eq("completed", true)
            .gte("completed_at", yearStartISO)
        : Promise.resolve({ data: [], error: null }),
      admin
        .from("focus_sessions")
        .select("started_at, work_duration")
        .eq("user_id", friendId)
        .eq("status", "completed")
        .gte("started_at", yearStartISO),
      heatHabitIds.length > 0
        ? admin
            .from("habit_completions")
            .select("completed_date")
            .in("habit_id", heatHabitIds)
            .gte("completed_date", yearStartDate)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Pre-fill Jan 1 → today with zeros so the heatmap gets a complete grid
    const dayMap: Record<string, { count: number; minutes: number }> = {};
    const today = new Date();
    const jan1 = new Date(today.getFullYear(), 0, 1);
    for (let d = new Date(jan1); d <= today; d.setDate(d.getDate() + 1)) {
      dayMap[toISODateString(d)] = { count: 0, minutes: 0 };
    }

    for (const t of heatTasks.data ?? []) {
      const day = t.completed_at?.split("T")[0];
      if (day && dayMap[day]) {
        dayMap[day].count++;
      }
    }

    for (const f of heatFocus.data ?? []) {
      const day = f.started_at?.split("T")[0];
      if (day && dayMap[day]) {
        dayMap[day].count++;
        dayMap[day].minutes += f.work_duration || 0;
      }
    }

    for (const h of heatHabits.data ?? []) {
      const day = h.completed_date;
      if (day && dayMap[day]) {
        dayMap[day].count++;
      }
    }

    heatmap = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { count, minutes }]) => ({
        date,
        count,
        minutes,
      }));
  }

  // ---------------------------------------------------------------------------
  // 8. Return combined response
  // ---------------------------------------------------------------------------

  return successResponse({
    friend: {
      profile,
      period_stats: periodStats,
      show_habits: privacy.show_habits,
      show_activity: privacy.show_activity,
    },
    comparison,
    habits,
    heatmap,
  });
});
