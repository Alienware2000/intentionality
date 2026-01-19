// =============================================================================
// WEEKLY PLAN SUMMARY API ROUTE
// Provides aggregated stats for a specific week for the planning flow.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getLocalDateString } from "@/app/lib/gamification";
import type { WeeklySummary, ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get the Monday of the week for a given date.
 */
function getWeekMonday(dateStr: ISODateString): ISODateString {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}` as ISODateString;
}

/**
 * Get Sunday of the week (week end).
 */
function getWeekSunday(mondayStr: ISODateString): ISODateString {
  const date = new Date(mondayStr);
  date.setDate(date.getDate() + 6);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}` as ISODateString;
}

// -----------------------------------------------------------------------------
// GET /api/weekly-plan/summary
// -----------------------------------------------------------------------------

/**
 * GET /api/weekly-plan/summary?week_start=YYYY-MM-DD
 *
 * Fetches aggregated stats for a specific week.
 * Used in the weekly planning flow to show progress.
 * Defaults to the previous week if week_start is not provided.
 *
 * @authentication Required
 * @query {string} [week_start] - Monday of the week in YYYY-MM-DD format
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {WeeklySummary} summary - Week's statistics
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const weekStartParam = params.get("week_start");

  // Default to previous week for review
  let weekStart: ISODateString;
  if (weekStartParam) {
    weekStart = getWeekMonday(weekStartParam as ISODateString);
  } else {
    const today = new Date();
    today.setDate(today.getDate() - 7); // Go back a week
    weekStart = getWeekMonday(getLocalDateString(today) as ISODateString);
  }

  const weekEnd = getWeekSunday(weekStart);

  // Fetch tasks completed during the week
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, completed, completed_at, xp_value, quest_id")
    .eq("user_id", user.id)
    .gte("due_date", weekStart)
    .lte("due_date", weekEnd)
    .is("deleted_at", null);

  // Fetch focus sessions for the week
  const startOfWeek = `${weekStart}T00:00:00.000Z`;
  const endOfWeek = `${weekEnd}T23:59:59.999Z`;

  const { data: focusSessions } = await supabase
    .from("focus_sessions")
    .select("work_duration, xp_awarded")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", startOfWeek)
    .lte("started_at", endOfWeek);

  // Fetch daily reflections for the week
  const { data: reflections } = await supabase
    .from("daily_reflections")
    .select("mood, energy, xp_awarded")
    .eq("user_id", user.id)
    .gte("date", weekStart)
    .lte("date", weekEnd);

  // Calculate stats
  const tasksList = tasks ?? [];
  const tasksCompleted = tasksList.filter(t => t.completed).length;

  // Count unique quests that had tasks completed
  const questsWithCompletedTasks = new Set<string>();
  for (const task of tasksList) {
    if (task.completed && task.quest_id) {
      questsWithCompletedTasks.add(task.quest_id);
    }
  }
  const questsProgressed = questsWithCompletedTasks.size;

  // Calculate XP earned
  let xpEarned = 0;

  // XP from tasks
  for (const task of tasksList) {
    if (task.completed) {
      xpEarned += task.xp_value ?? 0;
    }
  }

  // XP from focus sessions
  for (const session of focusSessions ?? []) {
    xpEarned += session.xp_awarded ?? 0;
  }

  // XP from reflections
  for (const reflection of reflections ?? []) {
    xpEarned += reflection.xp_awarded ?? 0;
  }

  // Focus minutes
  const focusMinutes = (focusSessions ?? []).reduce(
    (sum, s) => sum + (s.work_duration ?? 0),
    0
  );

  // Daily reviews completed
  const dailyReviewsCompleted = reflections?.length ?? 0;

  // Average mood and energy
  const moodValues = (reflections ?? [])
    .filter(r => r.mood !== null)
    .map(r => r.mood as number);
  const energyValues = (reflections ?? [])
    .filter(r => r.energy !== null)
    .map(r => r.energy as number);

  const averageMood = moodValues.length > 0
    ? Math.round((moodValues.reduce((a, b) => a + b, 0) / moodValues.length) * 10) / 10
    : null;

  const averageEnergy = energyValues.length > 0
    ? Math.round((energyValues.reduce((a, b) => a + b, 0) / energyValues.length) * 10) / 10
    : null;

  const summary: WeeklySummary = {
    weekStart,
    weekEnd,
    tasksCompleted,
    questsProgressed,
    xpEarned,
    focusMinutes,
    dailyReviewsCompleted,
    averageMood,
    averageEnergy,
  };

  return successResponse({ summary });
});
