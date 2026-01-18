// =============================================================================
// ACTIVITY LOG API
// GET: Fetch user's activity log for calendar heatmap display.
// =============================================================================

import {
  withAuth,
  successResponse,
  ApiErrors,
  getSearchParams,
} from "@/app/lib/auth-middleware";
import { getLocalDateString } from "@/app/lib/gamification";

export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const daysParam = params.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 90;

  // Calculate start date
  const endDate = getLocalDateString();
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - days);
  const startDate = getLocalDateString(startDateObj);

  // Fetch activity log entries
  const { data: activityLog, error } = await supabase
    .from("user_activity_log")
    .select("*")
    .eq("user_id", user.id)
    .gte("activity_date", startDate)
    .lte("activity_date", endDate)
    .order("activity_date", { ascending: true });

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  // Create a map for quick lookup
  const activityMap = new Map(
    (activityLog ?? []).map((a) => [a.activity_date, a])
  );

  // Generate all dates in range
  const allDates: Array<{
    date: string;
    xpEarned: number;
    tasksCompleted: number;
    focusMinutes: number;
    habitsCompleted: number;
    streakMaintained: boolean;
    freezeUsed: boolean;
    hasActivity: boolean;
  }> = [];

  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dateStr = getLocalDateString(currentDate);
    const activity = activityMap.get(dateStr);

    allDates.push({
      date: dateStr,
      xpEarned: activity?.xp_earned ?? 0,
      tasksCompleted: activity?.tasks_completed ?? 0,
      focusMinutes: activity?.focus_minutes ?? 0,
      habitsCompleted: activity?.habits_completed ?? 0,
      streakMaintained: activity?.streak_maintained ?? false,
      freezeUsed: activity?.freeze_used ?? false,
      hasActivity:
        (activity?.xp_earned ?? 0) > 0 ||
        (activity?.tasks_completed ?? 0) > 0 ||
        (activity?.habits_completed ?? 0) > 0,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate summary stats
  const activeDays = allDates.filter((d) => d.hasActivity).length;
  const totalXp = allDates.reduce((sum, d) => sum + d.xpEarned, 0);
  const totalTasks = allDates.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const totalFocusMinutes = allDates.reduce((sum, d) => sum + d.focusMinutes, 0);
  const maxXpDay = allDates.reduce(
    (max, d) => (d.xpEarned > max.xpEarned ? d : max),
    allDates[0]
  );

  return successResponse({
    activity: allDates,
    summary: {
      startDate,
      endDate,
      totalDays: allDates.length,
      activeDays,
      totalXp,
      totalTasks,
      totalFocusMinutes,
      averageXpPerActiveDay: activeDays > 0 ? Math.round(totalXp / activeDays) : 0,
      maxXpDay: maxXpDay?.date,
      maxXpAmount: maxXpDay?.xpEarned ?? 0,
    },
  });
});
