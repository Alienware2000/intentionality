// =============================================================================
// DAILY BRIEFING API ENDPOINT
// Generates a personalized daily briefing for the dashboard.
//
// OPTIMIZATION: Fully Deterministic (No AI)
// -----------------------------------------
// Briefings are now 100% rule-based for efficiency and cost savings.
// This provides:
// - Instant response times (no AI latency)
// - Zero API costs (~60 calls/month saved per user)
// - Predictable, debuggable output
//
// The deterministic approach includes:
// - Time-based greetings (morning/afternoon/evening)
// - Task completion summaries with streak info
// - Context-aware insights (overdue, habits, streak milestones)
//
// AI features remain available for:
// - Chat (natural conversation)
// - Brain Dump (semantic parsing)
// =============================================================================

import { NextResponse } from 'next/server';
import { withAuth } from '@/app/lib/auth-middleware';
import { buildUserContext } from '@/app/lib/ai-context';
import type { AIBriefingResponse } from '@/app/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type BriefingInsight = {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionHref?: string;
};

type PlanningStatus = {
  hasTodayReview: boolean;
  hasThisWeekPlan: boolean;
  currentHour: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
};

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase, request }) => {
  const url = new URL(request.url);
  const timezone = url.searchParams.get('timezone') || undefined;
  const forceRefresh = url.searchParams.get('refresh') === 'true';

  // Get today's date in user's timezone (or UTC)
  const today = new Date().toISOString().split('T')[0];

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    try {
      const { data: cached } = await supabase
        .from('ai_briefing_cache')
        .select('content')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (cached?.content) {
        return NextResponse.json(cached.content as AIBriefingResponse);
      }
    } catch {
      // No cache found or error, continue to generate
    }
  }

  try {
    // Build user context for deterministic briefing
    const context = await buildUserContext(supabase, user, timezone);

    // Fetch planning status
    const planningStatus = await fetchPlanningStatus(supabase, user.id, today);

    // Generate deterministic briefing (no AI)
    const response: AIBriefingResponse = {
      ok: true,
      greeting: getSimpleGreeting(),
      summary: generateFallbackSummary(context),
      insights: generateFallbackInsights(context, planningStatus),
    };

    // Cache the response for today (fire-and-forget)
    (async () => {
      try {
        await supabase
          .from('ai_briefing_cache')
          .upsert({
            user_id: user.id,
            date: today,
            content: response,
            provider: 'deterministic',
          });
      } catch (err) {
        console.error('Failed to cache briefing:', err);
      }
    })();

    return NextResponse.json(response);
  } catch (error) {
    console.error('Briefing generation error:', error);

    // Return minimal fallback on error
    return NextResponse.json({
      ok: true,
      greeting: getSimpleGreeting(),
      summary: "Ready to be productive today!",
      insights: [],
    } satisfies AIBriefingResponse);
  }
});

// -----------------------------------------------------------------------------
// Planning Status Functions
// -----------------------------------------------------------------------------

/**
 * Fetch whether user has completed today's review and this week's plan.
 */
async function fetchPlanningStatus(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<PlanningStatus> {
  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday

  // Get this week's Monday
  const todayDate = new Date(today);
  const diff = todayDate.getDay() - 1;
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (diff < 0 ? 6 : diff));
  const weekStart = monday.toISOString().split('T')[0];

  // Check for today's review and this week's plan in parallel
  const [reviewResult, planResult] = await Promise.all([
    supabase
      .from('daily_reflections')
      .select('id')
      .eq('user_id', userId)
      .eq('date', today)
      .single(),
    supabase
      .from('weekly_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .single(),
  ]);

  return {
    hasTodayReview: !!reviewResult.data,
    hasThisWeekPlan: !!planResult.data,
    currentHour,
    dayOfWeek,
  };
}

// -----------------------------------------------------------------------------
// Fallback Functions
// -----------------------------------------------------------------------------

/**
 * Generate a simple time-based greeting.
 */
function getSimpleGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning!";
  if (hour < 17) return "Good afternoon!";
  return "Good evening!";
}

/**
 * Generate a fallback summary from context.
 */
function generateFallbackSummary(context: { today: { completedCount: number; totalCount: number }; profile: { currentStreak: number } }): string {
  const { completedCount, totalCount } = context.today;
  const streak = context.profile.currentStreak;

  if (totalCount === 0) {
    return "No tasks scheduled for today. Consider planning your day!";
  }

  if (completedCount === totalCount) {
    return `All ${totalCount} tasks completed! Great job. ${streak > 0 ? `${streak} day streak going strong.` : ''}`;
  }

  const remaining = totalCount - completedCount;
  return `${completedCount}/${totalCount} tasks done. ${remaining} remaining. ${streak > 0 ? `Keep your ${streak} day streak!` : ''}`;
}

/**
 * Generate fallback insights from context.
 */
function generateFallbackInsights(
  context: {
    today: { completedCount: number; totalCount: number; habits: Array<{ completedToday: boolean }> };
    upcoming: { overdueCount: number };
    profile: { currentStreak: number };
  },
  planningStatus?: PlanningStatus
): BriefingInsight[] {
  const insights: BriefingInsight[] = [];

  // Overdue tasks warning
  if (context.upcoming.overdueCount > 0) {
    insights.push({
      title: 'Overdue Tasks',
      description: `You have ${context.upcoming.overdueCount} overdue task${context.upcoming.overdueCount > 1 ? 's' : ''} that need attention.`,
      priority: 'high',
      actionLabel: 'View',
      actionHref: '/inbox',
    });
  }

  // Monday planning reminder (show on Monday if no plan for this week)
  if (planningStatus && planningStatus.dayOfWeek === 1 && !planningStatus.hasThisWeekPlan) {
    insights.push({
      title: 'Weekly Planning',
      description: 'Start your week strong! Set your goals and priorities for the week ahead.',
      priority: 'medium',
      actionLabel: 'Plan Week',
      actionHref: '/week',
    });
  }

  // Evening review reminder (show after 6 PM if no review today)
  if (planningStatus && planningStatus.currentHour >= 18 && !planningStatus.hasTodayReview) {
    insights.push({
      title: 'Daily Review',
      description: 'Take a moment to reflect on your day and plan for tomorrow.',
      priority: 'medium',
      actionLabel: 'Review',
      actionHref: '/review',
    });
  }

  // Incomplete habits
  const incompleteHabits = context.today.habits.filter(h => !h.completedToday).length;
  if (incompleteHabits > 0) {
    insights.push({
      title: 'Habits Remaining',
      description: `${incompleteHabits} habit${incompleteHabits > 1 ? 's' : ''} not completed yet.`,
      priority: 'medium',
      actionLabel: 'Dashboard',
      actionHref: '/',
    });
  }

  // Streak encouragement
  if (context.profile.currentStreak >= 7) {
    insights.push({
      title: 'Streak Milestone',
      description: `Amazing ${context.profile.currentStreak} day streak! Keep it up!`,
      priority: 'low',
    });
  }

  return insights.slice(0, 4); // Max 4 insights
}
