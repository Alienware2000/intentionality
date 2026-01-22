// =============================================================================
// AI LEARNING SIGNAL EXTRACTION
// Extracts learning signals from user conversations to build personalization.
//
// LEARNING: Implicit vs Explicit Learning
// ---------------------------------------
// We learn about users in two ways:
//
// 1. EXPLICIT: User directly states something
//    - "My goal is to finish my thesis"
//    - "I work best in the morning"
//    - "Stop reminding me about habits"
//
// 2. IMPLICIT: We infer from behavior
//    - User always dismisses habit reminders → dislike habit_reminder insights
//    - User ignores evening insights → quiet hours after 9pm
//    - User acts on focus suggestions → high acceptance rate
//
// This module handles EXPLICIT learning by parsing user messages using LLM.
// Implicit learning happens in the pattern aggregation system.
//
// ARCHITECTURE: LLM-Based Signal Extraction
// -----------------------------------------
// We use Groq's LLaMA 3.3 70B for signal extraction because:
// - Understands natural, unstructured "brain dump" style input
// - Handles emotional/stressed language ("ugh", "so much to do")
// - Detects implicit signals ("mornings are rough" → low morning productivity)
// - Filters hypotheticals ("if my goal was..." → should NOT be saved)
// - Runs async, parallel with chat response (non-blocking)
// - Uses temperature=0 for consistent extraction
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LearningSignal,
  WorkStyle,
  MotivationDriver,
  AIInsightType,
  UserLearningProfile,
} from './types';
import { extractSignalsWithLLM } from './ai-signal-extraction';

// -----------------------------------------------------------------------------
// Profile Update Functions
// -----------------------------------------------------------------------------

/**
 * Apply extracted learning signals to update the user's learning profile.
 *
 * @param signals - Array of extracted learning signals
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 */
export async function applyLearningSignals(
  signals: LearningSignal[],
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  if (signals.length === 0) return;

  try {
    // Fetch current profile
    const { data: currentProfile } = await supabase
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Build updates
    const updates: Partial<UserLearningProfile> = {};
    const currentGoals = (currentProfile?.stated_goals as string[]) || [];
    const currentMotivators = (currentProfile?.motivation_drivers as MotivationDriver[]) || [];
    const currentDislikes = (currentProfile?.disliked_insight_types as AIInsightType[]) || [];
    const currentWorkHours = currentProfile?.preferred_work_hours || {
      morning: null,
      afternoon: null,
      evening: null,
      night: null,
    };

    for (const signal of signals) {
      // Only apply signals with sufficient confidence
      if (signal.confidence < 0.6) continue;

      switch (signal.type) {
        case 'goal_stated':
          // Add goal if not already present (case-insensitive check)
          if (!currentGoals.some(g => g.toLowerCase() === signal.content.toLowerCase())) {
            updates.stated_goals = [...currentGoals, signal.content].slice(0, 10); // Max 10 goals
          }
          break;

        case 'work_style_indicated':
          if (['deep-work', 'task-switching', 'balanced'].includes(signal.content)) {
            updates.work_style = signal.content as WorkStyle;
          }
          break;

        case 'preference_expressed':
          if (signal.content.startsWith('preferred_work_hours:')) {
            const period = signal.content.split(':')[1] as keyof typeof currentWorkHours;
            if (period in currentWorkHours) {
              updates.preferred_work_hours = {
                ...currentWorkHours,
                [period]: 0.8, // High productivity score
              };
            }
          } else if (signal.content.startsWith('motivation:')) {
            const driver = signal.content.split(':')[1] as MotivationDriver;
            if (!currentMotivators.includes(driver)) {
              updates.motivation_drivers = [...currentMotivators, driver].slice(0, 5);
            }
          } else if (signal.content.startsWith('focus_duration:')) {
            const duration = parseInt(signal.content.split(':')[1], 10);
            if (duration >= 5 && duration <= 120) {
              updates.preferred_focus_duration = duration;
            }
          }
          break;

        case 'feedback_given':
          if (signal.content.startsWith('dislike:')) {
            const insightType = signal.content.split(':')[1] as AIInsightType;
            if (!currentDislikes.includes(insightType)) {
              updates.disliked_insight_types = [...currentDislikes, insightType].slice(0, 10);
            }
          }
          break;
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      if (currentProfile) {
        await supabase
          .from('user_learning_profiles')
          .update(updates)
          .eq('user_id', userId);
      } else {
        // Create profile if it doesn't exist
        await supabase
          .from('user_learning_profiles')
          .insert({
            user_id: userId,
            ...updates,
          });
      }
    }
  } catch (error) {
    // Learning is non-critical, log and continue
    console.warn('Failed to apply learning signals:', error);
  }
}

/**
 * Process a user message for learning and apply signals.
 * This is the main entry point for learning from conversations.
 *
 * Uses LLM-based extraction to understand natural language, including:
 * - Emotional/stressed language ("ugh", "so much to do")
 * - Implicit signals ("mornings are rough" → low morning productivity)
 * - Hypotheticals filtered out ("if my goal was..." → NOT saved)
 *
 * @param message - The user's message text
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 * @returns Array of extracted signals (for debugging/transparency)
 */
export async function learnFromMessage(
  message: string,
  supabase: SupabaseClient,
  userId: string
): Promise<LearningSignal[]> {
  // Use LLM-based extraction for better natural language understanding
  const signals = await extractSignalsWithLLM(message, userId);

  if (signals.length > 0) {
    await applyLearningSignals(signals, supabase, userId);
  }

  return signals;
}

// -----------------------------------------------------------------------------
// Insight Dismissal Learning
// -----------------------------------------------------------------------------

/**
 * Learn from an insight dismissal.
 * If a user dismisses the same type of insight multiple times,
 * add it to their disliked_insight_types.
 *
 * @param insightType - The type of insight that was dismissed
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 */
export async function learnFromInsightDismissal(
  insightType: string,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    // Count recent dismissals of this type (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from('ai_insights')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('insight_type', insightType)
      .not('dismissed_at', 'is', null)
      .gte('created_at', weekAgo);

    // If dismissed 3+ times in a week, add to disliked types
    if ((count || 0) >= 3) {
      const { data: profile } = await supabase
        .from('user_learning_profiles')
        .select('disliked_insight_types')
        .eq('user_id', userId)
        .single();

      const currentDislikes = (profile?.disliked_insight_types as string[]) || [];

      if (!currentDislikes.includes(insightType)) {
        if (profile) {
          await supabase
            .from('user_learning_profiles')
            .update({
              disliked_insight_types: [...currentDislikes, insightType],
            })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('user_learning_profiles')
            .insert({
              user_id: userId,
              disliked_insight_types: [insightType],
            });
        }
      }
    }
  } catch (error) {
    console.warn('Failed to learn from insight dismissal:', error);
  }
}
