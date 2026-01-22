// =============================================================================
// PATTERN COMPUTATION API ENDPOINT
// Triggers computation of user pattern aggregates.
//
// This endpoint can be called:
// 1. Manually by the user to refresh their patterns
// 2. By a cron job to update all users periodically
// 3. Automatically after significant user activity
//
// The actual computation happens in the database using the
// compute_user_patterns SQL function for efficiency.
// =============================================================================

import { NextResponse } from 'next/server';
import { withAuth, ApiErrors } from '@/app/lib/auth-middleware';
import type { UserPatternAggregates } from '@/app/lib/types';

// -----------------------------------------------------------------------------
// POST: Trigger pattern computation for the current user
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase }) => {
  try {
    // Call the database function to compute patterns
    // This function is defined in the migration and handles all calculations
    const { error: computeError } = await supabase.rpc('compute_user_patterns', {
      target_user_id: user.id,
    });

    if (computeError) {
      console.error('Failed to compute patterns:', computeError);
      return ApiErrors.serverError('Failed to compute patterns');
    }

    // Fetch the newly computed patterns
    const { data: patterns, error: fetchError } = await supabase
      .from('user_pattern_aggregates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      // Pattern may not exist if user has no activity
      return NextResponse.json({
        ok: true,
        patterns: null,
        message: 'Patterns computed but no data available yet',
      });
    }

    return NextResponse.json({
      ok: true,
      patterns: patterns as UserPatternAggregates,
    });
  } catch (error) {
    console.error('Pattern computation error:', error);
    return ApiErrors.serverError('Failed to compute patterns');
  }
});
