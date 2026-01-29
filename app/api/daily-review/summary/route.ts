// =============================================================================
// DAILY REVIEW SUMMARY API ROUTE
// Provides aggregated stats for a specific day for the review flow.
// =============================================================================

import {
  withAuth,
  getSearchParams,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getLocalDateString } from "@/app/lib/gamification";
import type { DailySummary, DailySummaryHighlight, ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/daily-review/summary
// -----------------------------------------------------------------------------

/**
 * GET /api/daily-review/summary?date=YYYY-MM-DD
 *
 * Fetches aggregated stats for a specific day.
 * Used in the daily review flow to show what was accomplished.
 *
 * @authentication Required
 * @query {string} date - Date in YYYY-MM-DD format (defaults to today)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {DailySummary} summary - Day's statistics
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const params = getSearchParams(request);
  const date = (params.get("date") ?? getLocalDateString()) as ISODateString;

  // Fetch tasks for the day (include title for highlights)
  // Note: Tasks don't have user_id directly - they relate through quests.
  // RLS policies handle user scoping via quest_id → quests.user_id
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, completed, completed_at, xp_value")
    .eq("due_date", date)
    .is("deleted_at", null);

  // Fetch habits and their completions (include title for highlights)
  const { data: habits } = await supabase
    .from("habits")
    .select("id, title, xp_value")
    .eq("user_id", user.id);

  const habitIds = habits?.map(h => h.id) ?? [];

  const { data: habitCompletions } = await supabase
    .from("habit_completions")
    .select("habit_id, xp_awarded")
    .in("habit_id", habitIds.length > 0 ? habitIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("completed_date", date);

  // Fetch focus sessions for the day
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data: focusSessions } = await supabase
    .from("focus_sessions")
    .select("work_duration, xp_awarded, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("started_at", startOfDay)
    .lte("started_at", endOfDay);

  // Fetch schedule block completions
  const { data: scheduleCompletions } = await supabase
    .from("schedule_block_completions")
    .select("xp_awarded")
    .eq("user_id", user.id)
    .eq("completed_date", date);

  // Calculate stats
  const tasksList = tasks ?? [];
  const tasksCompleted = tasksList.filter(t => t.completed).length;
  const tasksTotal = tasksList.length;

  const habitsCompleted = habitCompletions?.length ?? 0;
  const habitsTotal = habits?.length ?? 0;

  // Calculate XP earned today
  let xpEarned = 0;

  // XP from completed tasks (only count those completed today)
  const today = getLocalDateString();
  for (const task of tasksList) {
    if (task.completed && task.completed_at) {
      const completedDate = task.completed_at.split("T")[0];
      if (completedDate === date || (date === today && completedDate === today)) {
        xpEarned += task.xp_value ?? 0;
      }
    }
  }

  // XP from habits
  for (const completion of habitCompletions ?? []) {
    xpEarned += completion.xp_awarded ?? 0;
  }

  // XP from focus sessions
  for (const session of focusSessions ?? []) {
    xpEarned += session.xp_awarded ?? 0;
  }

  // XP from schedule completions
  for (const completion of scheduleCompletions ?? []) {
    xpEarned += completion.xp_awarded ?? 0;
  }

  // Focus minutes
  const focusMinutes = (focusSessions ?? []).reduce(
    (sum, s) => sum + (s.work_duration ?? 0),
    0
  );

  // Check if streak was maintained (any activity)
  const hasActivity = tasksCompleted > 0 || habitsCompleted > 0 || (focusSessions?.length ?? 0) > 0;

  // Build highlights array - completed tasks and habits with titles
  const highlights: DailySummaryHighlight[] = [];

  // Add completed tasks to highlights
  for (const task of tasksList) {
    if (task.completed && task.completed_at) {
      const completedDate = task.completed_at.split("T")[0];
      if (completedDate === date || (date === today && completedDate === today)) {
        highlights.push({
          type: "task",
          title: task.title,
          xp: task.xp_value ?? 0,
        });
      }
    }
  }

  // Add completed habits to highlights
  const completedHabitIds = new Set(habitCompletions?.map(c => c.habit_id) ?? []);
  for (const habit of habits ?? []) {
    if (completedHabitIds.has(habit.id)) {
      const completion = habitCompletions?.find(c => c.habit_id === habit.id);
      highlights.push({
        type: "habit",
        title: habit.title,
        xp: completion?.xp_awarded ?? habit.xp_value ?? 0,
      });
    }
  }

  // Sort highlights by XP descending (show biggest wins first)
  highlights.sort((a, b) => b.xp - a.xp);

  const summary: DailySummary = {
    date,
    tasksCompleted,
    tasksTotal,
    habitsCompleted,
    habitsTotal,
    xpEarned,
    focusMinutes,
    streakMaintained: hasActivity,
    highlights,
  };

  return successResponse({ summary });
});
