// =============================================================================
// PREMIUM USAGE API
// GET endpoint to retrieve today's AI usage across all features.
// Returns usage counts and limits for displaying in the UI.
// =============================================================================

import { withAuth, successResponse, ApiErrors } from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Daily Limits (matching ai-router.ts)
// -----------------------------------------------------------------------------

const DAILY_LIMITS = {
  chat: 50,
  brain_dump: 20,
  insights: 48,
  briefing: 5,
} as const;

type FeatureKey = keyof typeof DAILY_LIMITS;

// -----------------------------------------------------------------------------
// GET Handler
// Returns today's usage for all AI features
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase }) => {
  try {
    // Get today's date in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    // Query usage counts for each feature today
    const { data: usageLogs, error } = await supabase
      .from("ai_usage_log")
      .select("feature")
      .eq("user_id", user.id)
      .gte("created_at", todayIso);

    if (error) {
      console.error("Failed to fetch AI usage:", error);
      return ApiErrors.serverError("Failed to fetch usage data");
    }

    // Count usage per feature
    const counts: Record<string, number> = {};
    for (const log of usageLogs || []) {
      const feature = log.feature as string;
      counts[feature] = (counts[feature] || 0) + 1;
    }

    // Build response with used/limit for each feature
    const usage: Record<FeatureKey, { used: number; limit: number }> = {
      chat: { used: counts["chat"] || 0, limit: DAILY_LIMITS.chat },
      brain_dump: { used: counts["brain_dump"] || 0, limit: DAILY_LIMITS.brain_dump },
      insights: { used: counts["insights"] || 0, limit: DAILY_LIMITS.insights },
      briefing: { used: counts["briefing"] || 0, limit: DAILY_LIMITS.briefing },
    };

    return successResponse({ usage });
  } catch (error) {
    console.error("Error fetching premium usage:", error);
    return ApiErrors.serverError("Failed to fetch usage data");
  }
});
