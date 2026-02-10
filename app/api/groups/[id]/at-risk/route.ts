// =============================================================================
// GROUPS [ID] AT-RISK API ROUTE
// Returns members who are at risk of breaking their streak.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { getParamFromUrl } from "@/app/lib/api-utils";
import type { AtRiskMember } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/groups/[id]/at-risk
// -----------------------------------------------------------------------------

/**
 * GET /api/groups/[id]/at-risk
 *
 * Get members who are at risk of breaking their streak (18+ hours inactive).
 *
 * @authentication Required
 *
 * @param {string} id - Group ID from URL
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {AtRiskMember[]} at_risk_members - Array of at-risk members
 *
 * @throws {401} Not authenticated
 * @throws {403} Not a member
 * @throws {404} Group not found
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase, request }) => {
  const groupId = getParamFromUrl(request, "groups");

  if (!groupId) {
    return ApiErrors.badRequest("Group ID is required");
  }

  // Check if user is a member
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return ApiErrors.notFound("Group not found");
  }

  // First, update at-risk status
  await supabase.rpc("update_at_risk_status", { p_group_id: groupId });

  // Fetch at-risk members with their profiles
  const { data: atRiskData, error: atRiskError } = await supabase
    .from("group_member_streak_status")
    .select(`
      user_id,
      last_productive_action,
      last_nudged_at,
      nudge_count_today
    `)
    .eq("group_id", groupId)
    .eq("is_at_risk", true);

  if (atRiskError) {
    return ApiErrors.serverError(atRiskError.message);
  }

  if (!atRiskData || atRiskData.length === 0) {
    return successResponse({ at_risk_members: [] });
  }

  // Get user IDs (excluding current user - you can't nudge yourself)
  const userIds = atRiskData
    .filter((m) => m.user_id !== user.id)
    .map((m) => m.user_id);

  if (userIds.length === 0) {
    return successResponse({ at_risk_members: [] });
  }

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, level, current_streak")
    .in("user_id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  // Check which members the current user has nudged today
  const today = new Date().toISOString().split("T")[0];
  const { data: nudgesToday } = await supabase
    .from("nudges")
    .select("to_user_id")
    .eq("from_user_id", user.id)
    .in("to_user_id", userIds)
    .gte("created_at", `${today}T00:00:00Z`);

  const nudgedTodaySet = new Set(nudgesToday?.map((n) => n.to_user_id) ?? []);

  // Build response
  const now = new Date();
  const atRiskMembers: AtRiskMember[] = atRiskData
    .filter((m) => m.user_id !== user.id)
    .map((m) => {
      const profile = profileMap.get(m.user_id);
      const lastAction = m.last_productive_action
        ? new Date(m.last_productive_action)
        : null;
      const hoursInactive = lastAction
        ? Math.floor((now.getTime() - lastAction.getTime()) / (1000 * 60 * 60))
        : 999; // Unknown = very long

      return {
        user_id: m.user_id,
        display_name: profile?.display_name ?? null,
        level: profile?.level ?? 1,
        current_streak: profile?.current_streak ?? 0,
        last_productive_action: m.last_productive_action,
        hours_inactive: hoursInactive,
        can_nudge: !nudgedTodaySet.has(m.user_id),
      };
    })
    .sort((a, b) => b.hours_inactive - a.hours_inactive);

  return successResponse({ at_risk_members: atRiskMembers });
});
