// =============================================================================
// SMART RECOMMENDATIONS
// Rule-based recommendation engine for the daily briefing.
// Analyzes user data to surface relevant suggestions and alerts.
// =============================================================================

import type {
  Task,
  HabitWithStatus,
  Quest,
  UserProfile,
  DailyRecommendation,
  WeeklyPlan,
  ISODateString,
} from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type RecommendationContext = {
  todayTasks: Task[];
  overdueTasks: Task[];
  habits: HabitWithStatus[];
  quests: Quest[];
  profile: UserProfile | null;
  weeklyPlan: WeeklyPlan | null;
  hasReviewedToday: boolean;
  currentTime: Date;
};

// -----------------------------------------------------------------------------
// Recommendation Generators
// -----------------------------------------------------------------------------

/**
 * Check for urgent overdue high-priority tasks.
 */
function checkUrgentTasks(ctx: RecommendationContext): DailyRecommendation | null {
  const urgentOverdue = ctx.overdueTasks.filter(t => t.priority === "high" && !t.completed);

  if (urgentOverdue.length === 0) return null;

  return {
    type: "urgent",
    priority: "high",
    title: urgentOverdue.length === 1
      ? "Urgent task overdue!"
      : `${urgentOverdue.length} urgent tasks overdue!`,
    description: urgentOverdue.length === 1
      ? `"${urgentOverdue[0].title}" needs your attention`
      : `You have high-priority tasks that need immediate attention`,
    actionLabel: "View Tasks",
    actionHref: "/",
    relatedId: urgentOverdue[0]?.id,
  };
}

/**
 * Check if streak is at risk (nothing completed today and it's afternoon+).
 */
function checkStreakAtRisk(ctx: RecommendationContext): DailyRecommendation | null {
  const { profile, todayTasks, habits, currentTime } = ctx;

  if (!profile || profile.current_streak === 0) return null;

  const hour = currentTime.getHours();
  if (hour < 14) return null; // Only warn after 2 PM

  // Check if anything was completed today
  const hasCompletedTask = todayTasks.some(t => t.completed);
  const hasCompletedHabit = habits.some(h => h.completedToday);

  if (hasCompletedTask || hasCompletedHabit) return null;

  return {
    type: "streak_at_risk",
    priority: "high",
    title: "Streak at risk!",
    description: `You have a ${profile.current_streak}-day streak. Complete something to keep it going!`,
    actionLabel: "View Tasks",
    actionHref: "/",
  };
}

/**
 * Check if the day has too many tasks (8+ tasks).
 */
function checkHeavyDay(ctx: RecommendationContext): DailyRecommendation | null {
  const incompleteTasks = ctx.todayTasks.filter(t => !t.completed);

  if (incompleteTasks.length < 8) return null;

  return {
    type: "heavy_day",
    priority: "medium",
    title: "Heavy day ahead",
    description: `You have ${incompleteTasks.length} tasks today. Consider moving some to tomorrow.`,
    actionLabel: "View Week",
    actionHref: "/week",
  };
}

/**
 * Check for quests close to completion (80%+).
 */
function checkQuestProgress(ctx: RecommendationContext): DailyRecommendation | null {
  const { quests, todayTasks } = ctx;

  for (const quest of quests) {
    const questTasks = todayTasks.filter(t => t.quest_id === quest.id);
    if (questTasks.length < 3) continue;

    const completed = questTasks.filter(t => t.completed).length;
    const progress = completed / questTasks.length;

    if (progress >= 0.8 && progress < 1) {
      const remaining = questTasks.length - completed;
      return {
        type: "quest_progress",
        priority: "medium",
        title: "Quest almost complete!",
        description: `"${quest.title}" is ${Math.round(progress * 100)}% done. Just ${remaining} more task${remaining > 1 ? "s" : ""}!`,
        actionLabel: "View Quest",
        actionHref: "/quests",
        relatedId: quest.id,
      };
    }
  }

  return null;
}

/**
 * Check for incomplete daily habits (afternoon reminder).
 */
function checkHabitReminder(ctx: RecommendationContext): DailyRecommendation | null {
  const { habits, currentTime } = ctx;

  const hour = currentTime.getHours();
  if (hour < 16) return null; // Only remind after 4 PM

  const incompleteHabits = habits.filter(h => !h.completedToday);
  if (incompleteHabits.length === 0) return null;

  return {
    type: "habit_reminder",
    priority: "medium",
    title: incompleteHabits.length === 1
      ? "Don't forget your habit!"
      : `${incompleteHabits.length} habits remaining`,
    description: incompleteHabits.length === 1
      ? `"${incompleteHabits[0].title}" still needs to be done today`
      : `You still have daily habits to complete`,
    actionLabel: "View Habits",
    actionHref: "/",
  };
}

/**
 * Check if daily review is needed (evening).
 */
function checkReviewReminder(ctx: RecommendationContext): DailyRecommendation | null {
  const { hasReviewedToday, currentTime } = ctx;

  if (hasReviewedToday) return null;

  const hour = currentTime.getHours();
  if (hour < 19) return null; // Only remind after 7 PM

  return {
    type: "review_reminder",
    priority: "low",
    title: "Time for daily review",
    description: "Reflect on your day and plan for tomorrow. Earn 15 XP!",
    actionLabel: "Start Review",
    actionHref: "/review",
  };
}

/**
 * Check if weekly planning is needed (Sunday/Monday).
 */
function checkPlanningNeeded(ctx: RecommendationContext): DailyRecommendation | null {
  const { weeklyPlan, currentTime } = ctx;

  const dayOfWeek = currentTime.getDay();
  const isPlanningDay = dayOfWeek === 0 || dayOfWeek === 1; // Sunday or Monday

  if (!isPlanningDay) return null;

  // Check if there's a plan for this week
  const today = currentTime.toISOString().split("T")[0];
  const monday = getWeekMonday(today);

  if (weeklyPlan?.week_start === monday) return null;

  return {
    type: "planning_needed",
    priority: "medium",
    title: dayOfWeek === 0 ? "Plan your week tomorrow" : "Weekly planning time!",
    description: dayOfWeek === 0
      ? "Set your goals for the upcoming week. Earn 25 XP!"
      : "Start your week with clear intentions. Earn 25 XP!",
    actionLabel: "Start Planning",
    actionHref: "/plan",
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Get the Monday of the week for a given date.
 */
function getWeekMonday(dateStr: ISODateString): ISODateString {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0] as ISODateString;
}

// -----------------------------------------------------------------------------
// Main Function
// -----------------------------------------------------------------------------

/**
 * Generate smart recommendations based on user context.
 * Returns sorted list of recommendations (highest priority first).
 */
export function generateRecommendations(ctx: RecommendationContext): DailyRecommendation[] {
  const recommendations: DailyRecommendation[] = [];

  // Run all recommendation generators
  const generators = [
    checkUrgentTasks,
    checkStreakAtRisk,
    checkHeavyDay,
    checkQuestProgress,
    checkHabitReminder,
    checkReviewReminder,
    checkPlanningNeeded,
  ];

  for (const generator of generators) {
    const recommendation = generator(ctx);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }

  // Sort by priority
  const priorityOrder: Record<DailyRecommendation["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Limit to top 3
  return recommendations.slice(0, 3);
}

/**
 * Get a greeting based on the current time.
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Get an encouraging message based on progress.
 */
export function getEncouragingMessage(
  tasksCompleted: number,
  tasksTotal: number,
  streak: number
): string {
  if (tasksTotal === 0) {
    return "No tasks scheduled. Enjoy your day!";
  }

  const progress = tasksCompleted / tasksTotal;

  if (progress === 1) {
    return streak > 7
      ? `All done! Your ${streak}-day streak is impressive!`
      : "All done for today!";
  }

  if (progress >= 0.75) {
    return "Almost there! You're crushing it today.";
  }

  if (progress >= 0.5) {
    return "Great progress! Keep the momentum going.";
  }

  if (progress > 0) {
    return "Good start! Focus on your high-priority items.";
  }

  // Nothing done yet
  const hour = new Date().getHours();
  if (hour < 10) {
    return "Fresh start! What's your top priority today?";
  }
  if (hour < 14) {
    return "Let's get moving! Pick one task to start with.";
  }
  return "The day's not over yet. You've got this!";
}
