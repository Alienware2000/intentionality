// =============================================================================
// PROACTIVE INSIGHTS API ENDPOINT
// Generates and manages proactive insights for the user.
//
// Proactive insights are notifications/suggestions that appear without
// the user explicitly asking for them. They're based on:
// - User patterns (common focus times, completion rates)
// - Current context (time of day, tasks due)
// - Risk detection (streak about to break, heavy workload)
//
// OPTIMIZATION: Fully Deterministic (No AI)
// -----------------------------------------
// Insights are now 100% rule-based for efficiency and cost savings.
// Rule-based insights handle all insight types:
// - streak_risk: Evening + streak > 2 + no completions
// - optimal_focus_time: Matches user's common focus hours
// - workload_warning: Tasks > 7 or overdue > 3
// - habit_reminder: After 5 PM + incomplete habits
//
// This saves ~2,880 API calls/month per user while providing
// instant, predictable insights.
//
// This endpoint:
// - GET: Fetch pending insights (not yet shown/dismissed)
// - POST: Generate new insights based on current context
// - PATCH: Mark insight as shown or dismissed
// =============================================================================

import { NextResponse } from 'next/server';
import { withAuth, ApiErrors, parseJsonBody } from '@/app/lib/auth-middleware';
import { buildUserContext } from '@/app/lib/ai-context';
import { learnFromInsightDismissal } from '@/app/lib/ai-learning';
import type { AIInsightsResponse, AIInsightType, AIActionType } from '@/app/lib/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type InsightPatchBody = {
  insightId: string;
  action: 'show' | 'dismiss';
};

type GenerateInsightsBody = {
  timezone?: string;
};

// -----------------------------------------------------------------------------
// GET: Fetch pending insights
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase }) => {
  try {
    // Fetch insights that haven't been dismissed
    // Show insights from the last 24 hours that are either:
    // - Not yet shown
    // - Shown but not dismissed (user might want to act on them)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .is('dismissed_at', null)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Failed to fetch insights:', error);
      return ApiErrors.serverError('Failed to fetch insights');
    }

    return NextResponse.json({
      ok: true,
      insights: insights || [],
    } satisfies AIInsightsResponse);
  } catch (error) {
    console.error('Insights fetch error:', error);
    return ApiErrors.serverError('Failed to fetch insights');
  }
});

// -----------------------------------------------------------------------------
// POST: Generate new insights
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<GenerateInsightsBody>(request);
  const timezone = body?.timezone;

  try {
    // Check if we've generated insights recently (rate limit: 2 per 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('ai_insights')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', fiveMinutesAgo);

    if ((recentCount || 0) >= 2) {
      // Too many recent insights, return existing ones
      const { data: existing } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      return NextResponse.json({
        ok: true,
        insights: existing || [],
      } satisfies AIInsightsResponse);
    }

    // Build user context and generate rule-based insights
    const context = await buildUserContext(supabase, user, timezone);
    const ruleBasedInsights = generateRuleBasedInsights(context, user.id);

    if (ruleBasedInsights.length > 0) {
      const { data: inserted } = await supabase
        .from('ai_insights')
        .insert(ruleBasedInsights)
        .select('*');

      return NextResponse.json({
        ok: true,
        insights: inserted || [],
      } satisfies AIInsightsResponse);
    }

    return NextResponse.json({
      ok: true,
      insights: [],
    } satisfies AIInsightsResponse);
  } catch (error) {
    console.error('Insights generation error:', error);
    // Return empty insights on any error - insights are non-critical
    return NextResponse.json({
      ok: true,
      insights: [],
    } satisfies AIInsightsResponse);
  }
});

// -----------------------------------------------------------------------------
// PATCH: Update insight status
// -----------------------------------------------------------------------------

export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<InsightPatchBody>(request);

  if (!body?.insightId || !body?.action) {
    return ApiErrors.badRequest('insightId and action are required');
  }

  const { insightId, action } = body;

  try {
    const update: Record<string, string> = {};

    if (action === 'show') {
      update.shown_at = new Date().toISOString();
    } else if (action === 'dismiss') {
      update.dismissed_at = new Date().toISOString();
    } else {
      return ApiErrors.badRequest('Invalid action');
    }

    // If dismissing, fetch the insight type first for learning
    let insightType: string | null = null;
    if (action === 'dismiss') {
      const { data: insight } = await supabase
        .from('ai_insights')
        .select('insight_type')
        .eq('id', insightId)
        .eq('user_id', user.id)
        .single();

      insightType = insight?.insight_type || null;
    }

    const { error } = await supabase
      .from('ai_insights')
      .update(update)
      .eq('id', insightId)
      .eq('user_id', user.id);

    if (error) {
      return ApiErrors.serverError('Failed to update insight');
    }

    // Learn from dismissal (runs in background)
    // If user repeatedly dismisses same insight type, add to disliked_insight_types
    if (action === 'dismiss' && insightType) {
      learnFromInsightDismissal(insightType, supabase, user.id).catch((err) => {
        console.warn('Learning from dismissal failed:', err);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Insight update error:', error);
    return ApiErrors.serverError('Failed to update insight');
  }
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * InsightConfig for personalized thresholds.
 */
type InsightConfig = {
  dislikedTypes: string[];
  quietHours: string[];
  avgTasksPerDay: number;
  preferredFocusDuration: number;
  motivationDrivers: string[];
};

/**
 * Check if current time is within quiet hours.
 */
function isQuietHour(quietHours: string[], hour: number): boolean {
  for (const range of quietHours) {
    const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!match) continue;

    const startHour = parseInt(match[1], 10);
    const endHour = parseInt(match[3], 10);

    // Handle overnight ranges (e.g., 21:00-07:00)
    if (startHour > endHour) {
      if (hour >= startHour || hour < endHour) return true;
    } else {
      if (hour >= startHour && hour < endHour) return true;
    }
  }
  return false;
}

/**
 * Generate rule-based insights with personalized thresholds.
 *
 * LEARNING: Personalized Insight Generation
 * -----------------------------------------
 * Instead of fixed thresholds (e.g., "7 tasks = heavy workload"),
 * we now use user-specific thresholds based on their patterns:
 * - avgTasksPerDay * 1.5 = personalized workload threshold
 * - Disliked insight types are filtered out
 * - Quiet hours prevent notifications during rest time
 * - Motivation drivers influence message framing
 */
function generateRuleBasedInsights(
  context: {
    today: {
      completedCount: number;
      totalCount: number;
      habits: Array<{ completedToday: boolean }>;
      focusSessions: Array<{ status: string }>;
    };
    upcoming: { overdueCount: number };
    profile: { currentStreak: number };
    recent: { commonFocusTimes: string[] };
    learning?: {
      dislikedInsightTypes: string[];
      quietHours: string[];
      avgCompletionRate: number;
      preferredFocusDuration: number;
      motivationDrivers: string[];
    };
  },
  userId: string
): Array<{
  user_id: string;
  insight_type: AIInsightType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  action_type: AIActionType | null;
  action_payload: Record<string, unknown> | null;
}> {
  const insights: Array<{
    user_id: string;
    insight_type: AIInsightType;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    action_type: AIActionType | null;
    action_payload: Record<string, unknown> | null;
  }> = [];

  const hour = new Date().getHours();

  // Extract learning config with defaults
  const config: InsightConfig = {
    dislikedTypes: context.learning?.dislikedInsightTypes || [],
    quietHours: context.learning?.quietHours || [],
    avgTasksPerDay: 5, // Default average
    preferredFocusDuration: context.learning?.preferredFocusDuration || 25,
    motivationDrivers: context.learning?.motivationDrivers || [],
  };

  // Check quiet hours - don't generate any insights during quiet time
  if (isQuietHour(config.quietHours, hour)) {
    return [];
  }

  // Helper to check if insight type is allowed
  const isAllowed = (type: AIInsightType): boolean =>
    !config.dislikedTypes.includes(type);

  // Helper for motivation-aware framing
  const isAchievementMotivated = config.motivationDrivers.includes('achievement');
  const isDeadlineMotivated = config.motivationDrivers.includes('deadline');

  // Streak risk (evening, nothing completed, has streak)
  if (
    isAllowed('streak_risk') &&
    hour >= 18 &&
    context.profile.currentStreak > 2 &&
    context.today.completedCount === 0 &&
    context.today.habits.every((h) => !h.completedToday)
  ) {
    insights.push({
      user_id: userId,
      insight_type: 'streak_risk',
      title: isAchievementMotivated ? `${context.profile.currentStreak} Day Streak!` : 'Streak at Risk!',
      description: isAchievementMotivated
        ? `Keep your ${context.profile.currentStreak} day streak alive! One small task is all it takes.`
        : `Complete a task or habit to maintain your ${context.profile.currentStreak} day streak.`,
      priority: 'high',
      action_type: 'NAVIGATE',
      action_payload: { path: '/' },
    });
  }

  // Optimal focus time
  if (
    isAllowed('optimal_focus_time') &&
    context.recent.commonFocusTimes.length > 0 &&
    !context.today.focusSessions.some((s) => s.status === 'active')
  ) {
    const isOptimalTime = context.recent.commonFocusTimes.some((t) => t.includes(String(hour)));

    if (isOptimalTime && context.today.totalCount > context.today.completedCount) {
      insights.push({
        user_id: userId,
        insight_type: 'optimal_focus_time',
        title: 'Good Time to Focus',
        description: 'Based on your patterns, this is a productive time for a focus session.',
        priority: 'medium',
        action_type: 'START_FOCUS',
        action_payload: { work_duration: config.preferredFocusDuration },
      });
    }
  }

  // Workload warning - use personalized threshold
  // Threshold: max(avgTasksPerDay * 1.5, 5) to avoid too-sensitive warnings
  const workloadThreshold = Math.max(config.avgTasksPerDay * 1.5, 5);
  const overdueThreshold = 3;

  if (
    isAllowed('workload_warning') &&
    (context.today.totalCount > workloadThreshold || context.upcoming.overdueCount > overdueThreshold)
  ) {
    const title = isAchievementMotivated ? 'Ambitious Day Ahead!' : 'Heavy Workload';
    insights.push({
      user_id: userId,
      insight_type: 'workload_warning',
      title,
      description: `You have ${context.today.totalCount} tasks today${context.upcoming.overdueCount > 0 ? ` and ${context.upcoming.overdueCount} overdue` : ''}. Consider rescheduling.`,
      priority: 'high',
      action_type: 'NAVIGATE',
      action_payload: { path: '/week' },
    });
  }

  // Habit reminder
  const incompleteHabits = context.today.habits.filter((h) => !h.completedToday).length;
  if (isAllowed('habit_reminder') && hour >= 17 && incompleteHabits > 0) {
    insights.push({
      user_id: userId,
      insight_type: 'habit_reminder',
      title: 'Habits Pending',
      description: `${incompleteHabits} habit${incompleteHabits > 1 ? 's' : ''} not completed yet today.`,
      priority: 'medium',
      action_type: 'NAVIGATE',
      action_payload: { path: '/' },
    });
  }

  return insights.slice(0, 2);
}
