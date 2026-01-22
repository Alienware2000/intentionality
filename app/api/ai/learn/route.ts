// =============================================================================
// AI LEARNING PROFILE API ENDPOINT
// CRUD operations for user learning profiles and pattern aggregates.
//
// LEARNING: Personalization Data Management
// -----------------------------------------
// This endpoint manages the "memory" of the AI assistant:
// - Learning profiles store explicit preferences and goals
// - Pattern aggregates store computed behavioral patterns
//
// The data from this endpoint is used to:
// 1. Inject context into AI prompts for personalized responses
// 2. Customize insight thresholds based on user patterns
// 3. Allow users to view and edit what the AI has learned
//
// Endpoints:
// - GET: Fetch user's learning profile and patterns
// - POST: Create initial learning profile
// - PATCH: Update learning profile fields
// - DELETE: Clear learned data (reset)
// =============================================================================

import { NextResponse } from 'next/server';
import { withAuth, ApiErrors, parseJsonBody } from '@/app/lib/auth-middleware';
import type {
  AILearnResponse,
  AILearnUpdateRequest,
  UserLearningProfile,
  UserPatternAggregates,
} from '@/app/lib/types';

// -----------------------------------------------------------------------------
// GET: Fetch learning profile and patterns
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase }) => {
  try {
    // Fetch learning profile
    const { data: profile, error: profileError } = await supabase
      .from('user_learning_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no profile exists, create a default one
    let learningProfile: UserLearningProfile;

    if (profileError?.code === 'PGRST116' || !profile) {
      // No profile found - create default
      const { data: newProfile, error: createError } = await supabase
        .from('user_learning_profiles')
        .insert({
          user_id: user.id,
          stated_goals: [],
          preferred_work_hours: {
            morning: null,
            afternoon: null,
            evening: null,
            night: null,
          },
          preferred_focus_duration: 25,
          work_style: 'balanced',
          motivation_drivers: [],
          stress_indicators: [],
          disliked_insight_types: [],
          quiet_hours: [],
          learning_enabled: true,
        })
        .select('*')
        .single();

      if (createError || !newProfile) {
        console.error('Failed to create learning profile:', createError);
        return ApiErrors.serverError('Failed to initialize learning profile');
      }

      learningProfile = newProfile as UserLearningProfile;
    } else if (profileError) {
      console.error('Failed to fetch learning profile:', profileError);
      return ApiErrors.serverError('Failed to fetch learning profile');
    } else {
      learningProfile = profile as UserLearningProfile;
    }

    // Fetch pattern aggregates (may not exist yet)
    const { data: patterns } = await supabase
      .from('user_pattern_aggregates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      ok: true,
      profile: learningProfile,
      patterns: (patterns as UserPatternAggregates) || null,
    } satisfies AILearnResponse);
  } catch (error) {
    console.error('Learning profile fetch error:', error);
    return ApiErrors.serverError('Failed to fetch learning data');
  }
});

// -----------------------------------------------------------------------------
// POST: Initialize learning profile with explicit data
// Used when user provides initial goals or preferences
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<AILearnUpdateRequest>(request);

  try {
    // Upsert learning profile
    const { data: profile, error } = await supabase
      .from('user_learning_profiles')
      .upsert(
        {
          user_id: user.id,
          stated_goals: body?.stated_goals || [],
          preferred_work_hours: body?.preferred_work_hours || {
            morning: null,
            afternoon: null,
            evening: null,
            night: null,
          },
          preferred_focus_duration: body?.preferred_focus_duration || 25,
          work_style: body?.work_style || 'balanced',
          motivation_drivers: body?.motivation_drivers || [],
          stress_indicators: body?.stress_indicators || [],
          quiet_hours: body?.quiet_hours || [],
          learning_enabled: body?.learning_enabled ?? true,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select('*')
      .single();

    if (error || !profile) {
      console.error('Failed to create learning profile:', error);
      return ApiErrors.serverError('Failed to create learning profile');
    }

    return NextResponse.json({
      ok: true,
      profile: profile as UserLearningProfile,
      patterns: null,
    } satisfies AILearnResponse);
  } catch (error) {
    console.error('Learning profile creation error:', error);
    return ApiErrors.serverError('Failed to create learning profile');
  }
});

// -----------------------------------------------------------------------------
// PATCH: Update specific fields in learning profile
// -----------------------------------------------------------------------------

export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<AILearnUpdateRequest>(request);

  if (!body || Object.keys(body).length === 0) {
    return ApiErrors.badRequest('No update fields provided');
  }

  try {
    // Build update object with only provided fields
    const updates: Partial<UserLearningProfile> = {};

    if (body.stated_goals !== undefined) {
      updates.stated_goals = body.stated_goals;
    }
    if (body.preferred_work_hours !== undefined) {
      updates.preferred_work_hours = body.preferred_work_hours;
    }
    if (body.preferred_focus_duration !== undefined) {
      // Validate range
      if (body.preferred_focus_duration < 5 || body.preferred_focus_duration > 120) {
        return ApiErrors.badRequest('preferred_focus_duration must be between 5 and 120 minutes');
      }
      updates.preferred_focus_duration = body.preferred_focus_duration;
    }
    if (body.work_style !== undefined) {
      if (!['deep-work', 'task-switching', 'balanced'].includes(body.work_style)) {
        return ApiErrors.badRequest('Invalid work_style value');
      }
      updates.work_style = body.work_style;
    }
    if (body.motivation_drivers !== undefined) {
      updates.motivation_drivers = body.motivation_drivers;
    }
    if (body.stress_indicators !== undefined) {
      updates.stress_indicators = body.stress_indicators;
    }
    if (body.quiet_hours !== undefined) {
      // Validate quiet hours format (should be like "21:00-07:00")
      const timeRangeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      for (const range of body.quiet_hours) {
        if (!timeRangeRegex.test(range)) {
          return ApiErrors.badRequest(`Invalid quiet_hours format: ${range}. Use HH:MM-HH:MM`);
        }
      }
      updates.quiet_hours = body.quiet_hours;
    }
    if (body.learning_enabled !== undefined) {
      updates.learning_enabled = body.learning_enabled;
    }

    // Update the profile
    const { data: profile, error } = await supabase
      .from('user_learning_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      // If no profile exists, create one first
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('user_learning_profiles')
          .insert({
            user_id: user.id,
            ...updates,
          })
          .select('*')
          .single();

        if (createError || !newProfile) {
          return ApiErrors.serverError('Failed to create learning profile');
        }

        return NextResponse.json({
          ok: true,
          profile: newProfile as UserLearningProfile,
          patterns: null,
        } satisfies AILearnResponse);
      }

      console.error('Failed to update learning profile:', error);
      return ApiErrors.serverError('Failed to update learning profile');
    }

    // Fetch patterns
    const { data: patterns } = await supabase
      .from('user_pattern_aggregates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      ok: true,
      profile: profile as UserLearningProfile,
      patterns: (patterns as UserPatternAggregates) || null,
    } satisfies AILearnResponse);
  } catch (error) {
    console.error('Learning profile update error:', error);
    return ApiErrors.serverError('Failed to update learning profile');
  }
});

// -----------------------------------------------------------------------------
// DELETE: Clear all learned data (reset)
// Keeps the profile but resets to defaults
// -----------------------------------------------------------------------------

export const DELETE = withAuth(async ({ user, supabase }) => {
  try {
    // Reset learning profile to defaults
    const { data: profile, error: profileError } = await supabase
      .from('user_learning_profiles')
      .update({
        stated_goals: [],
        preferred_work_hours: {
          morning: null,
          afternoon: null,
          evening: null,
          night: null,
        },
        preferred_focus_duration: 25,
        work_style: 'balanced',
        motivation_drivers: [],
        stress_indicators: [],
        disliked_insight_types: [],
        quiet_hours: [],
        learning_enabled: true,
      })
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (profileError) {
      console.error('Failed to reset learning profile:', profileError);
      return ApiErrors.serverError('Failed to reset learning profile');
    }

    // Clear pattern aggregates
    await supabase
      .from('user_pattern_aggregates')
      .delete()
      .eq('user_id', user.id);

    // Clear interaction outcomes (optional - might want to keep for analysis)
    await supabase
      .from('ai_interaction_outcomes')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json({
      ok: true,
      profile: profile as UserLearningProfile,
      patterns: null,
    } satisfies AILearnResponse);
  } catch (error) {
    console.error('Learning data reset error:', error);
    return ApiErrors.serverError('Failed to reset learning data');
  }
});
