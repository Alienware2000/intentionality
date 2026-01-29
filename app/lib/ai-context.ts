// =============================================================================
// AI CONTEXT BUILDER
// Aggregates user data to provide context for AI prompts.
//
// LEARNING: Context for LLMs
// --------------------------
// LLMs have no memory between requests. To make responses personalized
// and relevant, we need to inject context about the user into each prompt.
//
// This module gathers data from various sources:
// - User profile (level, streak, XP)
// - Today's tasks and habits
// - Recent activity patterns
// - Upcoming deadlines
//
// The challenge is fitting all this into the model's token budget while
// keeping the most relevant information. We prioritize:
// 1. Immediate context (today's tasks, current streak)
// 2. Urgent items (overdue tasks, streak at risk)
// 3. Patterns (common focus times, completion rates)
//
// TOKEN BUDGET MANAGEMENT
// -----------------------
// Gemini Flash has a 1M token context window, but we budget conservatively:
// - System prompt: ~500 tokens
// - User context: ~1500 tokens
// - Conversation history: ~2000 tokens
// - User message: ~500 tokens
// Total: ~4500 tokens (leaving plenty of room for response)
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type {
  AIUserContext,
  AILearningContext,
  Task,
  HabitWithStatus,
  ScheduleBlock,
  FocusSession,
  WeeklyPlan,
  DailyReflection,
  AICommunicationStyle,
  UserLearningProfile,
  UserPatternAggregates,
  AIInsightType,
} from './types';
import { getTitleForLevel } from './gamification';
import { estimateTokens } from './gemini';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Maximum tokens to allocate for user context */
const MAX_CONTEXT_TOKENS = 1500;

/** Days to look back for "recent" statistics */
const RECENT_DAYS = 7;

/** Day names for human-readable context */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get today's date in the user's timezone (YYYY-MM-DD format).
 * Uses the client-provided timezone or defaults to UTC.
 */
function getTodayDate(timezone?: string): string {
  const now = new Date();
  if (timezone) {
    try {
      const formatted = now.toLocaleDateString('en-CA', { timeZone: timezone });
      return formatted; // en-CA gives YYYY-MM-DD format
    } catch {
      // Fall back to UTC if timezone is invalid
    }
  }
  return now.toISOString().split('T')[0];
}

/**
 * Get tomorrow's date in YYYY-MM-DD format.
 */
function getTomorrowDate(timezone?: string): string {
  const today = new Date(getTodayDate(timezone));
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
}

/**
 * Get the date N days ago in YYYY-MM-DD format.
 */
function getDateDaysAgo(days: number, timezone?: string): string {
  const today = new Date(getTodayDate(timezone));
  today.setDate(today.getDate() - days);
  return today.toISOString().split('T')[0];
}

/**
 * Get the current day of week name.
 */
function getDayOfWeek(date: string): string {
  // Parse date parts directly to avoid UTC interpretation
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  return DAY_NAMES[d.getDay()];
}

/**
 * Parse time string to hour for pattern analysis.
 */
function getHourFromTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10);
}

/**
 * Format hour as human-readable time range.
 * e.g., 9 -> "9-10 AM"
 */
function formatHourRange(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const nextHour = (hour + 1) % 24;
  const nextPeriod = nextHour >= 12 ? 'PM' : 'AM';
  const nextDisplayHour = nextHour > 12 ? nextHour - 12 : nextHour === 0 ? 12 : nextHour;

  return `${displayHour}-${nextDisplayHour} ${period === nextPeriod ? period : period + '/' + nextPeriod}`;
}

// -----------------------------------------------------------------------------
// Data Fetchers
// -----------------------------------------------------------------------------

/**
 * Fetch user's gamification profile.
 */
async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ level: number; currentStreak: number; xpTotal: number; title: string } | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('level, current_streak, xp_total')
    .eq('user_id', userId)
    .single();

  if (!data) return null;

  return {
    level: data.level,
    currentStreak: data.current_streak,
    xpTotal: data.xp_total,
    title: getTitleForLevel(data.level),
  };
}

/**
 * Fetch user's AI preferences.
 */
async function fetchAIPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<{ communicationStyle: AICommunicationStyle; proactiveEnabled: boolean }> {
  const { data } = await supabase
    .from('user_ai_preferences')
    .select('communication_style, proactive_enabled')
    .eq('user_id', userId)
    .single();

  // Return defaults if no preferences set
  return {
    communicationStyle: (data?.communication_style as AICommunicationStyle) || 'friendly',
    proactiveEnabled: data?.proactive_enabled ?? true,
  };
}

/**
 * Fetch tasks for today and overdue tasks.
 */
async function fetchTodayTasks(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<{ todayTasks: Task[]; overdueCount: number }> {
  // Get tasks for today
  const { data: todayData } = await supabase
    .from('tasks')
    .select('id, title, priority, completed, scheduled_time, quest_id')
    .eq('due_date', today)
    .is('deleted_at', null)
    .order('scheduled_time', { ascending: true, nullsFirst: false });

  // Count overdue tasks (not completed, due before today)
  const { count: overdueCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .lt('due_date', today)
    .eq('completed', false)
    .is('deleted_at', null);

  return {
    todayTasks: (todayData as Task[]) || [],
    overdueCount: overdueCount || 0,
  };
}

/**
 * Fetch tasks due tomorrow.
 */
async function fetchTomorrowTasks(
  supabase: SupabaseClient,
  userId: string,
  tomorrow: string
): Promise<Array<{ id: string; title: string; priority: string }>> {
  const { data } = await supabase
    .from('tasks')
    .select('id, title, priority')
    .eq('due_date', tomorrow)
    .eq('completed', false)
    .is('deleted_at', null)
    .limit(5);

  return (data || []) as Array<{ id: string; title: string; priority: string }>;
}

/**
 * Fetch today's habits with completion status.
 */
async function fetchTodayHabits(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<HabitWithStatus[]> {
  // Get all habits
  const { data: habits } = await supabase
    .from('habits')
    .select('id, title, current_streak')
    .eq('user_id', userId);

  if (!habits || habits.length === 0) return [];

  // Get completions for today
  const { data: completions } = await supabase
    .from('habit_completions')
    .select('habit_id')
    .eq('completed_date', today)
    .in('habit_id', habits.map(h => h.id));

  const completedIds = new Set(completions?.map(c => c.habit_id) || []);

  return habits.map(h => ({
    ...h,
    completedToday: completedIds.has(h.id),
  })) as HabitWithStatus[];
}

/**
 * Fetch today's schedule blocks.
 */
async function fetchTodayScheduleBlocks(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<Array<{ title: string; start_time: string; end_time: string }>> {
  // Parse date parts directly to avoid UTC interpretation
  // new Date("YYYY-MM-DD") parses as UTC midnight, which can give wrong day
  const [year, month, day] = today.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid DST issues
  const dayOfWeek = date.getDay() || 7; // Convert Sunday from 0 to 7

  const { data } = await supabase
    .from('schedule_blocks')
    .select('title, start_time, end_time')
    .eq('user_id', userId)
    .contains('days_of_week', [dayOfWeek])
    .order('start_time');

  return (data || []) as Array<{ title: string; start_time: string; end_time: string }>;
}

/**
 * Fetch today's focus sessions.
 */
async function fetchTodayFocusSessions(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<Array<{ title: string | null; work_duration: number; status: string }>> {
  const todayStart = `${today}T00:00:00`;
  const todayEnd = `${today}T23:59:59`;

  const { data } = await supabase
    .from('focus_sessions')
    .select('title, work_duration, status')
    .eq('user_id', userId)
    .gte('started_at', todayStart)
    .lte('started_at', todayEnd);

  return (data || []) as Array<{ title: string | null; work_duration: number; status: string }>;
}

/**
 * Fetch recent activity statistics.
 */
async function fetchRecentStats(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<{
  tasksCompletedThisWeek: number;
  averageDailyCompletion: number;
  commonFocusTimes: string[];
  moodTrend: 'improving' | 'stable' | 'declining' | null;
}> {
  const weekAgo = getDateDaysAgo(RECENT_DAYS, today);

  // Count tasks completed this week
  const { count: completedCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('completed', true)
    .gte('completed_at', `${weekAgo}T00:00:00`)
    .is('deleted_at', null);

  // Calculate average daily completion
  // Get total tasks due in the past week and how many were completed
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('completed')
    .gte('due_date', weekAgo)
    .lte('due_date', today)
    .is('deleted_at', null);

  const total = recentTasks?.length || 1;
  const completed = recentTasks?.filter(t => t.completed).length || 0;
  const averageDailyCompletion = Math.round((completed / total) * 100);

  // Find common focus session times
  const { data: focusSessions } = await supabase
    .from('focus_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', `${weekAgo}T00:00:00`);

  const hourCounts: Record<number, number> = {};
  for (const session of focusSessions || []) {
    const hour = new Date(session.started_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  // Get top 3 focus hours
  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => formatHourRange(parseInt(hour, 10)));

  // Get mood trend from daily reflections
  const { data: reflections } = await supabase
    .from('daily_reflections')
    .select('mood')
    .eq('user_id', userId)
    .gte('date', weekAgo)
    .not('mood', 'is', null)
    .order('date', { ascending: true });

  let moodTrend: 'improving' | 'stable' | 'declining' | null = null;
  if (reflections && reflections.length >= 3) {
    const moods = reflections.map(r => r.mood as number);
    const firstHalf = moods.slice(0, Math.floor(moods.length / 2));
    const secondHalf = moods.slice(Math.floor(moods.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg > firstAvg + 0.5) {
      moodTrend = 'improving';
    } else if (secondAvg < firstAvg - 0.5) {
      moodTrend = 'declining';
    } else {
      moodTrend = 'stable';
    }
  }

  return {
    tasksCompletedThisWeek: completedCount || 0,
    averageDailyCompletion,
    commonFocusTimes: sortedHours,
    moodTrend,
  };
}

/**
 * Fetch current weekly goals with task progress.
 */
async function fetchWeeklyGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  // Get the current week's Monday
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStart = monday.toISOString().split('T')[0];

  const { data } = await supabase
    .from('weekly_plans')
    .select('goals')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single();

  if (!data?.goals) return [];

  // Normalize goals - handle both string[] and WeeklyGoal[] formats
  const goals = data.goals as Array<string | { text: string }>;
  return goals.map(g => typeof g === 'string' ? g : g.text);
}

/**
 * Fetch yesterday's priorities from daily reflection.
 */
async function fetchYesterdayPriorities(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<string[]> {
  // Get yesterday's date
  const todayDate = new Date(today);
  todayDate.setDate(todayDate.getDate() - 1);
  const yesterday = todayDate.toISOString().split('T')[0];

  const { data } = await supabase
    .from('daily_reflections')
    .select('tomorrow_priorities')
    .eq('user_id', userId)
    .eq('date', yesterday)
    .single();

  return (data?.tomorrow_priorities as string[]) || [];
}

/**
 * Fetch recent challenges from daily reflections (last 7 days).
 */
async function fetchRecentChallenges(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<string[]> {
  // Get date 7 days ago
  const todayDate = new Date(today);
  todayDate.setDate(todayDate.getDate() - 7);
  const weekAgo = todayDate.toISOString().split('T')[0];

  const { data } = await supabase
    .from('daily_reflections')
    .select('challenges')
    .eq('user_id', userId)
    .gte('date', weekAgo)
    .lte('date', today)
    .order('date', { ascending: false })
    .limit(3);

  // Flatten and deduplicate challenges
  const allChallenges: string[] = [];
  for (const reflection of data || []) {
    const challenges = reflection.challenges as string[];
    for (const challenge of challenges || []) {
      if (!allChallenges.includes(challenge)) {
        allChallenges.push(challenge);
      }
    }
  }

  return allChallenges.slice(0, 5); // Limit to 5 most recent
}

/**
 * Fetch user's learning profile.
 */
async function fetchLearningProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserLearningProfile | null> {
  const { data } = await supabase
    .from('user_learning_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data as UserLearningProfile | null;
}

/**
 * Fetch user's pattern aggregates.
 */
async function fetchPatternAggregates(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPatternAggregates | null> {
  const { data } = await supabase
    .from('user_pattern_aggregates')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data as UserPatternAggregates | null;
}

/**
 * Convert day number to day name.
 */
function getDayNameFromNumber(dayNum: number | null): string | null {
  if (dayNum === null) return null;
  return DAY_NAMES[dayNum] || null;
}

/**
 * Build learning context from profile and patterns.
 */
function buildLearningContext(
  profile: UserLearningProfile | null,
  patterns: UserPatternAggregates | null
): AILearningContext | undefined {
  // If learning is disabled or no profile exists, return undefined
  if (!profile || profile.learning_enabled === false) {
    return undefined;
  }

  // Determine personalization level based on data availability
  let personalizationLevel: 'low' | 'medium' | 'high' = 'low';

  const hasGoals = profile.stated_goals.length > 0;
  const hasPatterns = patterns && patterns.days_analyzed > 7;
  const hasPreferences = profile.work_style !== 'balanced' || profile.motivation_drivers.length > 0;

  if (hasGoals && hasPatterns && hasPreferences) {
    personalizationLevel = 'high';
  } else if (hasGoals || hasPatterns || hasPreferences) {
    personalizationLevel = 'medium';
  }

  // Format focus hours
  const preferredFocusHours = patterns?.preferred_focus_hours
    ? patterns.preferred_focus_hours.map(formatHourRange)
    : [];

  // Get top 3 most successful advice types
  const mostSuccessfulAdvice = patterns?.most_successful_advice_types
    ? Object.entries(patterns.most_successful_advice_types)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([type]) => type)
    : [];

  return {
    goals: profile.stated_goals,
    workStyle: profile.work_style,
    motivationDrivers: profile.motivation_drivers,
    preferredFocusDuration: profile.preferred_focus_duration,
    dislikedInsightTypes: profile.disliked_insight_types as AIInsightType[],
    quietHours: profile.quiet_hours,
    avgCompletionRate: patterns?.avg_completion_rate || 0,
    bestCompletionDay: getDayNameFromNumber(patterns?.best_completion_day ?? null),
    preferredFocusHours,
    aiAdviceAcceptanceRate: patterns?.ai_advice_acceptance_rate || 0,
    mostSuccessfulAdvice,
    personalizationLevel,
  };
}

// -----------------------------------------------------------------------------
// Main Builder Function
// -----------------------------------------------------------------------------

/**
 * Build the complete user context for AI prompts.
 *
 * LEARNING: Balancing Detail vs Tokens
 * ------------------------------------
 * We can't send everything to the AI - it would use too many tokens
 * and the model might focus on less relevant information.
 *
 * Strategy:
 * 1. Always include: profile, today's summary, preferences
 * 2. Include details for: first few tasks/habits (most important)
 * 3. Summarize: counts for larger lists
 * 4. Skip: completed items details, old history
 *
 * @param supabase - Authenticated Supabase client
 * @param user - Authenticated user
 * @param timezone - User's timezone for date calculations
 * @returns Formatted user context within token budget
 */
export async function buildUserContext(
  supabase: SupabaseClient,
  user: User,
  timezone?: string
): Promise<AIUserContext> {
  const today = getTodayDate(timezone);
  const tomorrow = getTomorrowDate(timezone);
  const userId = user.id;

  // Fetch all data in parallel for efficiency
  // LEARNING: Promise.all for Parallel Fetches
  // Instead of awaiting each fetch sequentially, we run them all at once.
  // This is much faster when calls don't depend on each other.
  const [
    profile,
    preferences,
    { todayTasks, overdueCount },
    tomorrowTasks,
    habits,
    scheduleBlocks,
    focusSessions,
    recentStats,
    weeklyGoals,
    yesterdayPriorities,
    recentChallenges,
    learningProfile,
    patternAggregates,
  ] = await Promise.all([
    fetchUserProfile(supabase, userId),
    fetchAIPreferences(supabase, userId),
    fetchTodayTasks(supabase, userId, today),
    fetchTomorrowTasks(supabase, userId, tomorrow),
    fetchTodayHabits(supabase, userId, today),
    fetchTodayScheduleBlocks(supabase, userId, today),
    fetchTodayFocusSessions(supabase, userId, today),
    fetchRecentStats(supabase, userId, today),
    fetchWeeklyGoals(supabase, userId),
    fetchYesterdayPriorities(supabase, userId, today),
    fetchRecentChallenges(supabase, userId, today),
    fetchLearningProfile(supabase, userId),
    fetchPatternAggregates(supabase, userId),
  ]);

  // Build the context object
  // We limit array lengths to control token usage
  const context: AIUserContext = {
    profile: profile || {
      level: 1,
      currentStreak: 0,
      xpTotal: 0,
      title: 'Novice',
    },
    today: {
      date: today,
      dayOfWeek: getDayOfWeek(today),
      tasks: todayTasks.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        completed: t.completed,
        scheduled_time: t.scheduled_time,
      })),
      completedCount: todayTasks.filter(t => t.completed).length,
      totalCount: todayTasks.length,
      habits: habits.slice(0, 5).map(h => ({
        id: h.id,
        title: h.title,
        completedToday: h.completedToday,
        currentStreak: h.current_streak,
      })),
      scheduleBlocks: scheduleBlocks.slice(0, 5),
      focusSessions: focusSessions.slice(0, 3),
    },
    recent: recentStats,
    upcoming: {
      tasksDueTomorrow: tomorrowTasks.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority as 'low' | 'medium' | 'high',
      })),
      overdueCount,
      weeklyGoals: weeklyGoals.slice(0, 5),
    },
    planning: {
      yesterdayPriorities: yesterdayPriorities.slice(0, 3),
      recentChallenges: recentChallenges.slice(0, 5),
    },
    preferences,
    // Add learning context if available
    learning: buildLearningContext(learningProfile, patternAggregates),
  };

  return context;
}

/**
 * Format user context as a string for injection into prompts.
 *
 * LEARNING: Context Formatting
 * ----------------------------
 * How you format context affects how well the AI uses it.
 * Clear labels and structure help the model find relevant info.
 *
 * We use a structured format that's both human-readable (for debugging)
 * and machine-parseable (for the AI).
 */
export function formatContextForPrompt(context: AIUserContext): string {
  const lines: string[] = [];

  // Profile section
  lines.push('=== USER PROFILE ===');
  lines.push(`Level: ${context.profile.level} (${context.profile.title})`);
  lines.push(`XP: ${context.profile.xpTotal.toLocaleString()}`);
  lines.push(`Current Streak: ${context.profile.currentStreak} days`);
  lines.push('');

  // Today section
  lines.push('=== TODAY ===');
  lines.push(`Date: ${context.today.dayOfWeek}, ${context.today.date}`);
  lines.push(`Tasks: ${context.today.completedCount}/${context.today.totalCount} completed`);

  if (context.today.tasks.length > 0) {
    lines.push('Tasks today:');
    for (const task of context.today.tasks) {
      const status = task.completed ? '[x]' : '[ ]';
      const time = task.scheduled_time ? ` (${task.scheduled_time})` : '';
      const priority = task.priority === 'high' ? ' !' : task.priority === 'medium' ? ' *' : '';
      lines.push(`  ${status} ${task.title}${time}${priority}`);
    }
  }

  if (context.today.habits.length > 0) {
    lines.push('Habits:');
    for (const habit of context.today.habits) {
      const status = habit.completedToday ? '[x]' : '[ ]';
      const streak = habit.currentStreak > 0 ? ` (${habit.currentStreak} day streak)` : '';
      lines.push(`  ${status} ${habit.title}${streak}`);
    }
  }

  if (context.today.scheduleBlocks.length > 0) {
    lines.push('Schedule:');
    for (const block of context.today.scheduleBlocks) {
      lines.push(`  ${block.start_time}-${block.end_time}: ${block.title}`);
    }
  }

  if (context.today.focusSessions.length > 0) {
    lines.push('Focus sessions today:');
    for (const session of context.today.focusSessions) {
      const title = session.title || 'Untitled';
      lines.push(`  ${title} (${session.work_duration}min, ${session.status})`);
    }
  }
  lines.push('');

  // Upcoming section
  lines.push('=== UPCOMING ===');
  if (context.upcoming.overdueCount > 0) {
    lines.push(`Overdue tasks: ${context.upcoming.overdueCount}`);
  }
  if (context.upcoming.tasksDueTomorrow.length > 0) {
    lines.push('Tomorrow:');
    for (const task of context.upcoming.tasksDueTomorrow) {
      const priority = task.priority === 'high' ? ' !' : task.priority === 'medium' ? ' *' : '';
      lines.push(`  [ ] ${task.title}${priority}`);
    }
  }
  if (context.upcoming.weeklyGoals.length > 0) {
    lines.push('Weekly goals:');
    for (const goal of context.upcoming.weeklyGoals) {
      // Check if goal has progress info (WeeklyGoalWithProgress format)
      if (typeof goal === 'object' && 'completedTasks' in goal) {
        const g = goal as { text: string; completedTasks: number; totalTasks: number };
        if (g.totalTasks > 0) {
          lines.push(`  - ${g.text} (${g.completedTasks}/${g.totalTasks} tasks done)`);
        } else {
          lines.push(`  - ${g.text}`);
        }
      } else {
        lines.push(`  - ${goal}`);
      }
    }
  }
  lines.push('');

  // Recent patterns section
  lines.push('=== RECENT PATTERNS ===');
  lines.push(`Tasks completed this week: ${context.recent.tasksCompletedThisWeek}`);
  lines.push(`Average completion rate: ${context.recent.averageDailyCompletion}%`);
  if (context.recent.commonFocusTimes.length > 0) {
    lines.push(`Common focus times: ${context.recent.commonFocusTimes.join(', ')}`);
  }
  if (context.recent.moodTrend) {
    lines.push(`Mood trend: ${context.recent.moodTrend}`);
  }

  // Planning context section (from daily reviews)
  const hasPlanningData =
    context.planning.yesterdayPriorities.length > 0 ||
    context.planning.recentChallenges.length > 0;

  if (hasPlanningData) {
    lines.push('');
    lines.push('=== PLANNING CONTEXT ===');
    if (context.planning.yesterdayPriorities.length > 0) {
      lines.push("Yesterday's priorities (what user planned to do today):");
      for (const priority of context.planning.yesterdayPriorities) {
        lines.push(`  - ${priority}`);
      }
    }
    if (context.planning.recentChallenges.length > 0) {
      lines.push('Recent challenges (use for personalized advice):');
      for (const challenge of context.planning.recentChallenges) {
        lines.push(`  - ${challenge}`);
      }
    }
  }

  // Learning context section (if available)
  if (context.learning) {
    lines.push('');
    lines.push('=== WHAT YOU\'VE LEARNED ABOUT THIS USER ===');

    // Goals (highest priority for personalization)
    if (context.learning.goals.length > 0) {
      lines.push(`Goals: ${context.learning.goals.join(', ')}`);
    }

    // Work style and patterns
    if (context.learning.workStyle !== 'balanced') {
      const styleDescriptions: Record<string, string> = {
        'deep-work': 'prefers long focus blocks',
        'task-switching': 'prefers varied, shorter tasks',
      };
      lines.push(`Work style: ${context.learning.workStyle} (${styleDescriptions[context.learning.workStyle] || ''})`);
    }

    // Productivity patterns
    if (context.learning.bestCompletionDay) {
      lines.push(`Most productive day: ${context.learning.bestCompletionDay}`);
    }
    if (context.learning.preferredFocusHours.length > 0) {
      lines.push(`Best focus times: ${context.learning.preferredFocusHours.join(', ')}`);
    }
    if (context.learning.preferredFocusDuration !== 25) {
      lines.push(`Preferred focus duration: ${context.learning.preferredFocusDuration} minutes`);
    }

    // Motivation and advice effectiveness
    if (context.learning.motivationDrivers.length > 0) {
      lines.push(`Motivation drivers: ${context.learning.motivationDrivers.join(', ')}`);
    }
    if (context.learning.aiAdviceAcceptanceRate > 0) {
      const rate = Math.round(context.learning.aiAdviceAcceptanceRate * 100);
      lines.push(`Advice acceptance rate: ${rate}%${rate < 50 ? ' (offer options, not directives)' : ''}`);
    }

    // Things to avoid
    if (context.learning.dislikedInsightTypes.length > 0) {
      lines.push(`Dislikes: ${context.learning.dislikedInsightTypes.join(', ')} insights`);
    }
    if (context.learning.quietHours.length > 0) {
      lines.push(`Quiet hours: ${context.learning.quietHours.join(', ')}`);
    }

    // Personalization level indicator
    lines.push(`Personalization level: ${context.learning.personalizationLevel}`);
  }

  return lines.join('\n');
}

/**
 * Estimate tokens for a context object.
 * Used for budget management before making API calls.
 */
export function estimateContextTokens(context: AIUserContext): number {
  const formatted = formatContextForPrompt(context);
  return estimateTokens(formatted);
}
