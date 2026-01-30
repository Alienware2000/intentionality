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
import { toISODateString } from "./date-utils";

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
  // Optional: for best day recognition
  bestCompletionDay: number | null;
  // Optional: user email for fallback name extraction
  userEmail?: string;
  // Optional: for optimal focus time recommendation
  commonFocusTimes?: string[];
  activeFocusSession?: boolean;
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
    actionHref: "/dashboard?section=tasks",
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
    actionHref: "/dashboard?section=tasks",
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
    actionHref: "/dashboard?section=habits",
  };
}

/**
 * Check if daily review is needed (evening).
 * Starts at 6 PM with escalating priority.
 * Disappears once the daily review is completed.
 */
function checkReviewReminder(ctx: RecommendationContext): DailyRecommendation | null {
  const { hasReviewedToday, currentTime } = ctx;

  if (hasReviewedToday) return null;

  const hour = currentTime.getHours();
  if (hour < 18) return null;

  const priority = hour >= 20 ? "high" : "medium";
  const title = hour >= 20
    ? "Don't forget your daily review!"
    : "Time for daily review";
  const description = hour >= 20
    ? "Take 5 minutes to reflect and plan tomorrow. Earn 20 XP!"
    : "Reflect on your day and plan for tomorrow. Earn 20 XP!";

  return {
    type: "review_reminder",
    priority,
    title,
    description,
    actionLabel: "Start Review",
    actionHref: "/review",
  };
}

/**
 * Check if weekly planning is needed (Sunday afternoon/Monday).
 * Sunday: Shows from 2 PM onwards with medium priority
 * Monday: All day with high priority (week has started!)
 * Disappears once a plan exists for the current week.
 */
function checkPlanningNeeded(ctx: RecommendationContext): DailyRecommendation | null {
  const { weeklyPlan, currentTime } = ctx;

  const dayOfWeek = currentTime.getDay();
  const hour = currentTime.getHours();

  const isSundayAfternoon = dayOfWeek === 0 && hour >= 14;
  const isMonday = dayOfWeek === 1;

  if (!isSundayAfternoon && !isMonday) return null;

  const today = toISODateString(currentTime);
  const monday = getWeekMonday(today);

  if (weeklyPlan?.week_start === monday) return null;

  const priority = isMonday ? "high" : "medium";

  return {
    type: "planning_needed",
    priority,
    title: isMonday ? "Plan your week!" : "Plan your week ahead",
    description: isMonday
      ? "Your week has started - set your goals and priorities. Earn 25 XP!"
      : "Set your intentions for the upcoming week. Earn 25 XP!",
    actionLabel: "Plan Week",
    actionHref: "/week",
  };
}

/**
 * Gentle prompt to plan weekly goals when user has no plan for the current week.
 * Shows any day (not just Sunday/Monday) with a friendly, non-naggy message.
 */
function checkPlanningPrompt(ctx: RecommendationContext): DailyRecommendation | null {
  const { weeklyPlan, currentTime } = ctx;

  // Check if there's a plan for this week
  const today = toISODateString(currentTime);
  const monday = getWeekMonday(today);

  // If user already has a plan for this week, don't show
  if (weeklyPlan?.week_start === monday) return null;

  // If it's Sunday or Monday, checkPlanningNeeded will handle it with higher urgency
  const dayOfWeek = currentTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 1) return null;

  return {
    type: "planning_prompt",
    priority: "low",
    title: "Plan your week",
    description: "Setting weekly goals helps you focus on what matters most.",
    actionLabel: "Plan Now",
    actionHref: "/week",
  };
}

/**
 * Check weekly goal progress and surface goals that need attention.
 * Only surfaces a recommendation if there are goals with linked tasks that are behind schedule.
 */
function checkWeeklyGoalProgress(ctx: RecommendationContext): DailyRecommendation | null {
  const { weeklyPlan, todayTasks, currentTime } = ctx;

  if (!weeklyPlan?.goals || weeklyPlan.goals.length === 0) return null;

  // Check if it's mid-week or later (Wednesday+)
  const dayOfWeek = currentTime.getDay();
  if (dayOfWeek < 3 && dayOfWeek !== 0) return null; // Only Wed-Sun

  // Check if any of today's tasks are linked to weekly goals
  const tasksWithGoals = todayTasks.filter(t =>
    t.weekly_goal_index !== null && t.weekly_goal_index !== undefined
  );

  if (tasksWithGoals.length === 0) return null;

  // Count incomplete tasks linked to goals
  const incompleteGoalTasks = tasksWithGoals.filter(t => !t.completed);

  if (incompleteGoalTasks.length === 0) return null;

  // Find the first incomplete task's goal
  const firstTask = incompleteGoalTasks[0];
  const goalIndex = firstTask.weekly_goal_index ?? 0;
  const goalText = typeof weeklyPlan.goals[goalIndex] === "string"
    ? weeklyPlan.goals[goalIndex]
    : (weeklyPlan.goals[goalIndex] as { text: string })?.text || "your goal";

  return {
    type: "weekly_goal",
    priority: "medium",
    title: "Weekly goal needs attention",
    description: `You have ${incompleteGoalTasks.length} task${incompleteGoalTasks.length > 1 ? "s" : ""} toward "${goalText}" that ${incompleteGoalTasks.length > 1 ? "need" : "needs"} to be completed.`,
    actionLabel: "View Tasks",
    actionHref: "/dashboard?section=tasks",
  };
}

/**
 * Check if user is close to a streak milestone (7, 14, 21, 30 days).
 * Only shows when within 3 days of a milestone.
 */
function checkMilestoneCountdown(ctx: RecommendationContext): DailyRecommendation | null {
  const { profile } = ctx;

  if (!profile || profile.current_streak === 0) return null;

  const streak = profile.current_streak;
  const milestones = [7, 14, 21, 30, 60, 90, 180, 365];

  // Find the next milestone
  const nextMilestone = milestones.find(m => m > streak);
  if (!nextMilestone) return null;

  const daysUntil = nextMilestone - streak;

  // Only show when within 3 days
  if (daysUntil > 3 || daysUntil <= 0) return null;

  return {
    type: "milestone_countdown",
    priority: "low",
    title: daysUntil === 1
      ? `Tomorrow is your ${nextMilestone}-day streak!`
      : `${daysUntil} days until your ${nextMilestone}-day streak!`,
    description: `Keep the momentum going - you're almost there!`,
    actionLabel: "View Analytics",
    actionHref: "/analytics",
  };
}

/**
 * Recognize when it's the user's statistically best productivity day.
 * Only shows on that specific day, once per week.
 */
function checkBestDay(ctx: RecommendationContext): DailyRecommendation | null {
  const { bestCompletionDay, currentTime } = ctx;

  // bestCompletionDay: 0=Sunday, 1=Monday, ..., 6=Saturday
  if (bestCompletionDay === null || bestCompletionDay === undefined) return null;

  const todayDayOfWeek = currentTime.getDay();

  if (todayDayOfWeek !== bestCompletionDay) return null;

  const dayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  const dayName = dayNames[bestCompletionDay];

  return {
    type: "best_day",
    priority: "low",
    title: `${dayName} are your strongest day!`,
    description: `You've got this - historically you're most productive today.`,
  };
}

/**
 * Check if it's the user's optimal focus time based on their patterns.
 * Suggests starting a focus session when conditions are right.
 */
function checkOptimalFocusTime(ctx: RecommendationContext): DailyRecommendation | null {
  const { commonFocusTimes, activeFocusSession, currentTime } = ctx;

  // Skip if user is already focusing
  if (activeFocusSession) return null;

  // Skip if no pattern data available
  if (!commonFocusTimes || commonFocusTimes.length === 0) return null;

  const hour = currentTime.getHours();

  // Check if current hour matches any of the user's common focus times
  // commonFocusTimes format: ["9-10 AM", "2-3 PM"] or similar
  const isOptimalTime = commonFocusTimes.some(timeStr => {
    // Extract hour from strings like "9-10 AM", "14", "2 PM", etc.
    const hourMatch = timeStr.match(/^(\d{1,2})/);
    if (!hourMatch) return false;

    let matchHour = parseInt(hourMatch[1], 10);
    // Handle PM times
    if (timeStr.toLowerCase().includes("pm") && matchHour !== 12) {
      matchHour += 12;
    }
    // Handle AM times where 12 AM = 0
    if (timeStr.toLowerCase().includes("am") && matchHour === 12) {
      matchHour = 0;
    }

    return hour === matchHour;
  });

  if (!isOptimalTime) return null;

  return {
    type: "optimal_focus_time",
    priority: "low",
    title: "Great time to focus!",
    description: "Based on your patterns, this is one of your most productive hours.",
    actionLabel: "Start Focus",
    actionHref: "/dashboard?section=focus",
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Get the Monday of the week for a given date.
 */
function getWeekMonday(dateStr: ISODateString): ISODateString {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return toISODateString(date);
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
    checkWeeklyGoalProgress,
    checkQuestProgress,
    checkHabitReminder,
    checkReviewReminder,
    checkPlanningNeeded,
    checkPlanningPrompt,
    checkMilestoneCountdown,
    checkBestDay,
    checkOptimalFocusTime,
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
 * Extract a name from an email address (e.g., "john" from "john@email.com").
 * Capitalizes the first letter.
 */
function extractNameFromEmail(email: string | undefined): string | null {
  if (!email) return null;
  const localPart = email.split("@")[0];
  if (!localPart || localPart.length === 0) return null;
  // Clean up common patterns (numbers, dots, underscores)
  const cleaned = localPart.split(/[._\-0-9]/)[0];
  if (!cleaned || cleaned.length < 2) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

/**
 * Get a greeting based on the current time.
 * Optionally includes the user's name.
 *
 * @param displayName - User's preferred display name (from profile)
 * @param userEmail - User's email (fallback for extracting name)
 */
export function getTimeBasedGreeting(displayName?: string | null, userEmail?: string): string {
  const hour = new Date().getHours();

  let timeGreeting: string;
  if (hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour < 17) {
    timeGreeting = "Good afternoon";
  } else {
    timeGreeting = "Good evening";
  }

  // Determine the name to use
  const name = displayName || extractNameFromEmail(userEmail);

  if (name) {
    return `${timeGreeting}, ${name}!`;
  }

  return `${timeGreeting}!`;
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
