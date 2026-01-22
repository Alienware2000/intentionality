// =============================================================================
// AI CONTEXT API ENDPOINT
// Fetches and returns the user's context for AI interactions.
//
// This endpoint is useful for:
// - Debugging AI responses (seeing what context the AI sees)
// - Client-side context display (showing users what AI knows)
// - Prefetching context for faster chat responses
//
// LEARNING: Context Aggregation Endpoints
// ---------------------------------------
// Instead of making the client fetch data from multiple endpoints,
// we aggregate everything the AI needs in one endpoint.
// This simplifies the client code and reduces HTTP requests.
// =============================================================================

import { NextResponse } from 'next/server';
import { withAuth, ApiErrors } from '@/app/lib/auth-middleware';
import { buildUserContext, formatContextForPrompt, estimateContextTokens } from '@/app/lib/ai-context';

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase, request }) => {
  const url = new URL(request.url);
  const timezone = url.searchParams.get('timezone') || undefined;
  const format = url.searchParams.get('format'); // 'raw' or 'formatted'

  try {
    // Build the user context
    const context = await buildUserContext(supabase, user, timezone);

    // Calculate token estimate
    const tokenEstimate = estimateContextTokens(context);

    if (format === 'formatted') {
      // Return the formatted string version (what the AI sees)
      const formatted = formatContextForPrompt(context);
      return NextResponse.json({
        ok: true,
        formatted,
        tokenEstimate,
      });
    }

    // Return the structured context
    return NextResponse.json({
      ok: true,
      context,
      tokenEstimate,
    });
  } catch (error) {
    console.error('Failed to build context:', error);
    return ApiErrors.serverError('Failed to build user context');
  }
});
