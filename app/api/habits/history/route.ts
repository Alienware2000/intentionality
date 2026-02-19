// =============================================================================
// HABIT HISTORY API
// Returns month-level habit completion data and computed stats.
// Used by the analytics Habits tab for the monthly grid visualization.
// =============================================================================

import { withAuth, getSearchParams, successResponse, ApiErrors } from "@/app/lib/auth-middleware";
import { getTodayISO, isActiveDay, toISODateString } from "@/app/lib/date-utils";
import type { Habit, Id, ISODateString, HabitMonthlyStats } from "@/app/lib/types";

export const GET = withAuth(async ({ supabase, request }) => {
  const params = getSearchParams(request);
  const monthParam = params.get("month"); // YYYY-MM

  // Parse month or default to current
  const today = getTodayISO();
  let year: number;
  let month: number; // 0-indexed

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
  }

  // Compute date range for the month
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Parallel fetch: all user habits + completions within range
  const [habitsResult, completionsResult] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("habit_id, completed_date")
      .gte("completed_date", monthStart)
      .lte("completed_date", monthEnd),
  ]);

  if (habitsResult.error) return ApiErrors.serverError(habitsResult.error.message);
  if (completionsResult.error) return ApiErrors.serverError(completionsResult.error.message);

  const habits: Habit[] = habitsResult.data ?? [];
  const completionRows = completionsResult.data ?? [];

  // Build completions map: { habit_id: [date1, date2, ...] }
  const completions: Record<Id, ISODateString[]> = {};
  for (const habit of habits) {
    completions[habit.id] = [];
  }
  for (const row of completionRows) {
    if (!completions[row.habit_id]) {
      completions[row.habit_id] = [];
    }
    completions[row.habit_id].push(row.completed_date);
  }

  // Compute stats by iterating each day of the month (up to today)
  const stats: HabitMonthlyStats = {
    totalScheduled: 0,
    totalCompleted: 0,
    consistencyRate: 0,
    perfectDays: 0,
    todayDone: 0,
    todayTotal: 0,
  };

  // Determine the last day to count (don't count future days)
  const endDate = monthEnd < today ? monthEnd : today;

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` as ISODateString;
    if (dateStr > endDate) break;

    let dayScheduled = 0;
    let dayCompleted = 0;

    for (const habit of habits) {
      // Only count days from habit creation onward
      const habitCreatedDate = toISODateString(new Date(habit.created_at));
      if (dateStr < habitCreatedDate) continue;

      const activeDays = habit.active_days ?? [1, 2, 3, 4, 5, 6, 7];
      if (!isActiveDay(dateStr, activeDays)) continue;

      dayScheduled++;
      stats.totalScheduled++;

      if (completions[habit.id]?.includes(dateStr)) {
        dayCompleted++;
        stats.totalCompleted++;
      }
    }

    // Perfect day: all scheduled habits completed (and at least 1 was scheduled)
    if (dayScheduled > 0 && dayCompleted === dayScheduled) {
      stats.perfectDays++;
    }

    // Today-specific stats
    if (dateStr === today) {
      stats.todayDone = dayCompleted;
      stats.todayTotal = dayScheduled;
    }
  }

  stats.consistencyRate = stats.totalScheduled > 0
    ? Math.round((stats.totalCompleted / stats.totalScheduled) * 100)
    : 0;

  return successResponse({ habits, completions, stats });
});
