// =============================================================================
// FRIENDS JOIN API ROUTE
// Handles joining via invite link - creates auto-accepted friendship.
// Called after signup when user came through an invite link.
// Awards referral XP to the inviter.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { LevelTitle } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** XP awarded to inviter for successful referral */
const REFERRAL_XP = 50;

/** Bonus XP for first referral */
const FIRST_REFERRAL_BONUS_XP = 25;

/** XP awarded to new user for completing invite flow */
const NEW_USER_BONUS_XP = 10;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type JoinRequestBody = {
  /** Invite code to use for joining */
  invite_code?: string;
  /** Username to use for joining (alternative to code) */
  username?: string;
};

// -----------------------------------------------------------------------------
// POST /api/friends/join
// -----------------------------------------------------------------------------

/**
 * POST /api/friends/join
 *
 * Accepts an invite and creates a mutual friendship.
 * Called after signup when user came through invite link.
 *
 * @authentication Required
 *
 * @body {string} invite_code - Invite code from the inviter
 * @body {string} username - Username of inviter (alternative to code)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Object} inviter - Inviter's profile info
 * @returns {string} message - Success message
 * @returns {number} inviter_xp_earned - XP earned by inviter
 * @returns {number} user_xp_earned - XP earned by new user
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing invite_code/username or invalid
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<JoinRequestBody>(request);
  const inviteCode = body?.invite_code;
  const username = body?.username;

  if (!inviteCode && !username) {
    return ApiErrors.badRequest("invite_code or username is required");
  }

  // Look up the inviter by invite code or username
  let query = supabase
    .from("user_profiles")
    .select(`
      user_id,
      display_name,
      username,
      level,
      current_streak,
      title,
      xp_total,
      referral_count
    `);

  if (inviteCode) {
    query = query.eq("invite_code", inviteCode.toUpperCase());
  } else if (username) {
    query = query.ilike("username", username);
  }

  const { data: inviter, error: inviterError } = await query.single();

  if (inviterError || !inviter) {
    return ApiErrors.badRequest("Invalid invite code or username");
  }

  // Can't invite yourself
  if (inviter.user_id === user.id) {
    return ApiErrors.badRequest("You cannot use your own invite link");
  }

  // Check if either user has blocked the other (using database function)
  const { data: isBlocked } = await supabase.rpc("users_blocked", {
    user1: user.id,
    user2: inviter.user_id,
  });

  if (isBlocked) {
    return ApiErrors.badRequest("Unable to connect with this user");
  }

  // Check if already friends or have pending request
  const { data: existingFriendship } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${inviter.user_id}),and(user_id.eq.${inviter.user_id},friend_id.eq.${user.id})`
    )
    .single();

  if (existingFriendship) {
    if (existingFriendship.status === "accepted") {
      return successResponse({
        inviter: {
          user_id: inviter.user_id,
          display_name: inviter.display_name,
          username: inviter.username,
          level: inviter.level,
          current_streak: inviter.current_streak,
          title: (inviter.title as LevelTitle) ?? "Novice",
        },
        message: "You are already friends!",
        inviter_xp_earned: 0,
        user_xp_earned: 0,
        already_friends: true,
      });
    }
    // Prevent blocked users from using invite link to reconnect
    if (existingFriendship.status === "blocked") {
      return ApiErrors.badRequest("Unable to connect with this user");
    }
    // If pending, we'll accept it below
  }

  // Get current user's profile
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("referred_by, xp_total, level")
    .eq("user_id", user.id)
    .single();

  // Check if user was already referred by someone
  const alreadyReferred = userProfile?.referred_by !== null;

  // Create or update friendship to accepted
  if (existingFriendship) {
    // Update existing pending request to accepted
    // Only update if status is pending (extra safety check)
    await supabase
      .from("friendships")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", existingFriendship.id)
      .eq("status", "pending");
  } else {
    // Create new auto-accepted friendship (inviter is the requester)
    await supabase.from("friendships").insert({
      user_id: inviter.user_id,
      friend_id: user.id,
      status: "accepted",
      requested_at: new Date().toISOString(),
      responded_at: new Date().toISOString(),
    });
  }

  let inviterXpEarned = 0;
  let userXpEarned = 0;

  // Award XP only if this is a new referral (user wasn't already referred)
  // Use atomic database function for idempotency and race condition prevention
  if (!alreadyReferred) {
    const { data: referralResult, error: referralError } = await supabase.rpc(
      "process_referral",
      {
        p_referrer_id: inviter.user_id,
        p_referee_id: user.id,
        p_base_xp: REFERRAL_XP,
        p_first_bonus: FIRST_REFERRAL_BONUS_XP,
        p_referee_bonus: NEW_USER_BONUS_XP,
      }
    );

    if (referralError) {
      // Log error but don't fail the request - friendship is already created
      console.error("Referral processing error:", referralError);
    } else if (referralResult?.success && !referralResult.already_processed) {
      inviterXpEarned = referralResult.referrer_xp ?? 0;
      userXpEarned = referralResult.referee_xp ?? 0;
      const isFirstReferral = referralResult.is_first_referral ?? false;

      // Create notification for inviter
      await supabase.from("notifications").insert({
        user_id: inviter.user_id,
        type: "friend_accepted",
        title: "Someone joined via your invite!",
        body: `+${inviterXpEarned} XP earned for your referral`,
        from_user_id: user.id,
        metadata: {
          referral: true,
          xp_earned: inviterXpEarned,
          is_first_referral: isFirstReferral,
        },
      });
    }
  }

  return successResponse({
    inviter: {
      user_id: inviter.user_id,
      display_name: inviter.display_name,
      username: inviter.username,
      level: inviter.level,
      current_streak: inviter.current_streak,
      title: (inviter.title as LevelTitle) ?? "Novice",
    },
    message: `You're now connected with ${inviter.display_name || inviter.username}!`,
    inviter_xp_earned: inviterXpEarned,
    user_xp_earned: userXpEarned,
    already_friends: false,
  });
});
