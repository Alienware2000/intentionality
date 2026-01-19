// =============================================================================
// ANALYTICS API ROUTE
// Provides aggregated statistics for the analytics dashboard.
// Returns XP history, completion rates, and focus stats.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getTodayISO, addDaysISO } from "@/app/lib/date-utils";
import type { ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Gets date string for N days ago.
 */
function daysAgo(days: number): string {
  return addDaysISO(getTodayISO(), -days);
}

/**
 * Generates array of dates between start and end.
 */
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDaysISO(current as ISODateString, 1);
  }

  return dates;
}

// -----------------------------------------------------------------------------
// GET /api/analytics
// -----------------------------------------------------------------------------

/**
 * GET /api/analytics?days=30
 *
 * Fetches analytics data for the specified time period.
 *
 * @authentication Required
 *
 * @query {number} [days=30] - Number of days to look back
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Object} overview - Summary statistics
 * @returns {Array} xpHistory - Daily XP earned
 * @returns {Object} completionRates - Task/habit completion percentages
 * @returns {Array} activityHeatmap - Daily activity for heatmap
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const days = Math.min(Math.max(parseInt(params.get("days") ?? "30"), 7), 365);

  const startDate = daysAgo(days);
  const endDate = daysAgo(0);
  const dateRange = getDateRange(startDate, endDate);

  try {
    // Fetch all data in parallel
    const [
      profileResult,
      tasksResult,
      habitCompletionsResult,
      focusSessionsResult,
    ] = await Promise.all([
      // User profile for current stats
      supabase
        .from("user_profiles")
        .select("xp_total, level, current_streak, longest_streak")
        .eq("user_id", user.id)
        .single(),

      // Tasks completed in date range
      supabase
        .from("tasks")
        .select("id, completed, completed_at, xp_value, due_date")
        .gte("due_date", startDate)
        .lte("due_date", endDate),

      // Habit completions in date range
      supabase
        .from("habit_completions")
        .select("id, completed_date, xp_awarded")
        .gte("completed_date", startDate)
        .lte("completed_date", endDate),

      // Focus sessions in date range
      supabase
        .from("focus_sessions")
        .select("id, work_duration, status, xp_awarded, completed_at")
        .eq("status", "completed")
        .gte("completed_at", `${startDate}T00:00:00`)
        .lte("completed_at", `${endDate}T23:59:59`),
    ]);

    if (profileResult.error) {
      return ApiErrors.serverError(profileResult.error.message);
    }

    const profile = profileResult.data;
    const tasks = tasksResult.data ?? [];
    const habitCompletions = habitCompletionsResult.data ?? [];
    const focusSessions = focusSessionsResult.data ?? [];

    // Calculate overview stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const taskCompletionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const totalFocusMinutes = focusSessions.reduce(
      (sum, s) => sum + (s.work_duration ?? 0),
      0
    );

    // Build XP history by day
    const xpByDay: Record<string, number> = {};
    for (const date of dateRange) {
      xpByDay[date] = 0;
    }

    // Add task XP (use completed_at date)
    for (const task of tasks) {
      if (task.completed && task.completed_at) {
        const date = task.completed_at.split("T")[0];
        if (xpByDay[date] !== undefined) {
          xpByDay[date] += task.xp_value ?? 0;
        }
      }
    }

    // Add habit completion XP
    for (const completion of habitCompletions) {
      const date = completion.completed_date;
      if (xpByDay[date] !== undefined) {
        xpByDay[date] += completion.xp_awarded ?? 0;
      }
    }

    // Add focus session XP
    for (const session of focusSessions) {
      if (session.completed_at) {
        const date = session.completed_at.split("T")[0];
        if (xpByDay[date] !== undefined) {
          xpByDay[date] += session.xp_awarded ?? 0;
        }
      }
    }

    // Convert to array for charting
    const xpHistory = dateRange.map((date) => ({
      date,
      xp: xpByDay[date],
    }));

    // Build activity heatmap data (activity count per day)
    const activityByDay: Record<string, number> = {};
    for (const date of dateRange) {
      activityByDay[date] = 0;
    }

    // Count completed tasks
    for (const task of tasks) {
      if (task.completed && task.completed_at) {
        const date = task.completed_at.split("T")[0];
        if (activityByDay[date] !== undefined) {
          activityByDay[date]++;
        }
      }
    }

    // Count habit completions
    for (const completion of habitCompletions) {
      const date = completion.completed_date;
      if (activityByDay[date] !== undefined) {
        activityByDay[date]++;
      }
    }

    // Count focus sessions
    for (const session of focusSessions) {
      if (session.completed_at) {
        const date = session.completed_at.split("T")[0];
        if (activityByDay[date] !== undefined) {
          activityByDay[date]++;
        }
      }
    }

    const activityHeatmap = dateRange.map((date) => ({
      date,
      count: activityByDay[date],
    }));

    // Calculate total XP earned in period
    const totalXpInPeriod = Object.values(xpByDay).reduce((sum, xp) => sum + xp, 0);

    return successResponse({
      overview: {
        xpTotal: profile?.xp_total ?? 0,
        level: profile?.level ?? 1,
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        totalTasks,
        completedTasks,
        taskCompletionRate,
        totalFocusMinutes,
        focusSessionsCompleted: focusSessions.length,
        habitCompletions: habitCompletions.length,
        xpEarnedInPeriod: totalXpInPeriod,
      },
      xpHistory,
      activityHeatmap,
      period: {
        days,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    return ApiErrors.serverError(
      error instanceof Error ? error.message : "Failed to fetch analytics"
    );
  }
});
