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
import { getMonday } from "@/app/lib/date-utils";
import type { WeeklySummary, ISODateString, WeeklyPlan, WeeklyGoal } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type GoalProgress = {
  goalIndex: number;
  goalText: string;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  taskTitles: string[];
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Normalize goals from either string[] (legacy), WeeklyGoal[] (enhanced),
 * or stringified JSON from TEXT[] column.
 */
function normalizeGoals(goals: string[] | WeeklyGoal[]): WeeklyGoal[] {
  if (!goals || goals.length === 0) return [];

  // Check if it's already in enhanced format
  if (typeof goals[0] === "object" && goals[0] !== null && "text" in goals[0]) {
    return goals as WeeklyGoal[];
  }

  // Handle stringified JSON from TEXT[] column or plain strings
  return (goals as string[]).map((item) => {
    if (typeof item === "string" && item.startsWith("{")) {
      try {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed.text === "string") {
          return { text: parsed.text, quest_id: parsed.quest_id || null };
        }
      } catch {
        // Not valid JSON, use as plain text
      }
    }
    return { text: item, quest_id: null };
  });
}

/**
 * Get Sunday of the week (week end) using safe date parsing.
 */
function getWeekSunday(mondayStr: ISODateString): ISODateString {
  const [year, month, dayNum] = mondayStr.split("-").map(Number);
  const date = new Date(year, month - 1, dayNum + 6);
  const sundayYear = date.getFullYear();
  const sundayMonth = String(date.getMonth() + 1).padStart(2, "0");
  const sundayDay = String(date.getDate()).padStart(2, "0");
  return `${sundayYear}-${sundayMonth}-${sundayDay}` as ISODateString;
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
    weekStart = getMonday(weekStartParam as ISODateString);
  } else {
    const today = new Date();
    today.setDate(today.getDate() - 7); // Go back a week
    weekStart = getMonday(getLocalDateString(today) as ISODateString);
  }

  const weekEnd = getWeekSunday(weekStart);

  // Fetch the weekly plan for this week
  const { data: weeklyPlan } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  // Fetch tasks completed during the week
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, completed, completed_at, xp_value, quest_id, weekly_goal_index, week_start")
    .gte("due_date", weekStart)
    .lte("due_date", weekEnd)
    .is("deleted_at", null);

  // Also fetch tasks linked to this week's goals (even if due_date is different)
  const { data: linkedTasks } = await supabase
    .from("tasks")
    .select("id, title, completed, completed_at, xp_value, quest_id, weekly_goal_index, week_start")
    .eq("week_start", weekStart)
    .is("deleted_at", null)
    .not("weekly_goal_index", "is", null);

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

  // Combine tasks and linked tasks (deduplicate by id)
  const taskMap = new Map<string, (typeof tasks extends (infer T)[] | null ? T : never)>();
  for (const task of tasks ?? []) {
    taskMap.set(task.id, task);
  }
  for (const task of linkedTasks ?? []) {
    if (!taskMap.has(task.id)) {
      taskMap.set(task.id, task);
    }
  }
  const allTasks = Array.from(taskMap.values());

  // Calculate goal progress
  const normalizedGoals = normalizeGoals(weeklyPlan?.goals || []);
  const goalProgress: GoalProgress[] = normalizedGoals.map((goal, goalIndex) => {
    const tasksForGoal = allTasks.filter(
      (t) => t.weekly_goal_index === goalIndex && t.week_start === weekStart
    );
    const completed = tasksForGoal.filter((t) => t.completed).length;
    const total = tasksForGoal.length;

    return {
      goalIndex,
      goalText: goal.text,
      completedTasks: completed,
      totalTasks: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      taskTitles: tasksForGoal.map((t) => t.title),
    };
  });

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

  return successResponse({
    summary,
    plan: weeklyPlan as WeeklyPlan | null,
    goalProgress,
  });
});
