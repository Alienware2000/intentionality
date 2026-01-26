// =============================================================================
// FRIENDS API ROUTE
// Handles listing friends and sending friend requests.
// RLS policies enforce that users can only access their own friendships.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { FriendWithProfile, FriendRequest, LevelTitle } from "@/app/lib/types";

// Valid level titles for type safety
const VALID_TITLES: Set<LevelTitle> = new Set([
  "Novice", "Apprentice", "Scholar", "Adept", "Expert",
  "Master", "Grandmaster", "Legend", "Mythic", "Transcendent", "Ascended"
]);

/** Safely convert a string to LevelTitle with fallback */
function toLevelTitle(value: string | null | undefined): LevelTitle {
  if (value && VALID_TITLES.has(value as LevelTitle)) {
    return value as LevelTitle;
  }
  return "Novice";
}

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/friends */
type SendFriendRequestBody = {
  user_id?: string;
};

// -----------------------------------------------------------------------------
// GET /api/friends
// -----------------------------------------------------------------------------

/**
 * GET /api/friends
 *
 * Fetches all friends for the current user including pending requests.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {FriendWithProfile[]} friends - Array of accepted friends with profiles
 * @returns {FriendRequest[]} pending_requests - Array of incoming friend requests
 * @returns {FriendWithProfile[]} sent_requests - Array of outgoing pending requests
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ user, supabase }) => {
  // Fetch all friendships where user is involved
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (friendshipsError) {
    return ApiErrors.serverError(friendshipsError.message);
  }

  // Separate into accepted, pending incoming, and pending outgoing
  const acceptedFriendships = friendships?.filter((f) => f.status === "accepted") ?? [];
  const pendingIncoming = friendships?.filter(
    (f) => f.status === "pending" && f.friend_id === user.id
  ) ?? [];
  const pendingOutgoing = friendships?.filter(
    (f) => f.status === "pending" && f.user_id === user.id
  ) ?? [];

  // Get unique user IDs to fetch profiles for
  const userIds = new Set<string>();
  acceptedFriendships.forEach((f) => {
    userIds.add(f.user_id === user.id ? f.friend_id : f.user_id);
  });
  pendingIncoming.forEach((f) => userIds.add(f.user_id));
  pendingOutgoing.forEach((f) => userIds.add(f.friend_id));

  // Fetch profiles for all relevant users
  const userIdArray = Array.from(userIds);
  let profiles: Record<string, {
    display_name: string | null;
    xp_total: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    title: string;
  }> = {};

  if (userIdArray.length > 0) {
    const { data: profilesData } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, xp_total, level, current_streak, longest_streak, title")
      .in("user_id", userIdArray);

    if (profilesData) {
      profiles = Object.fromEntries(
        profilesData.map((p) => [p.user_id, p])
      );
    }
  }

  // Build friends list with profiles
  const friends: FriendWithProfile[] = acceptedFriendships.map((f) => {
    const friendUserId = f.user_id === user.id ? f.friend_id : f.user_id;
    const profile = profiles[friendUserId];
    return {
      friendship_id: f.id,
      user_id: friendUserId,
      status: f.status,
      display_name: profile?.display_name ?? null,
      xp_total: profile?.xp_total ?? 0,
      level: profile?.level ?? 1,
      current_streak: profile?.current_streak ?? 0,
      longest_streak: profile?.longest_streak ?? 0,
      title: toLevelTitle(profile?.title),
      is_requester: f.user_id === user.id,
      requested_at: f.requested_at,
      responded_at: f.responded_at,
    };
  });

  // Build pending incoming requests
  const pending_requests: FriendRequest[] = pendingIncoming.map((f) => {
    const profile = profiles[f.user_id];
    return {
      id: f.id,
      from_user_id: f.user_id,
      from_display_name: profile?.display_name ?? null,
      from_level: profile?.level ?? 1,
      from_current_streak: profile?.current_streak ?? 0,
      requested_at: f.requested_at,
    };
  });

  // Build sent requests
  const sent_requests: FriendWithProfile[] = pendingOutgoing.map((f) => {
    const profile = profiles[f.friend_id];
    return {
      friendship_id: f.id,
      user_id: f.friend_id,
      status: f.status,
      display_name: profile?.display_name ?? null,
      xp_total: profile?.xp_total ?? 0,
      level: profile?.level ?? 1,
      current_streak: profile?.current_streak ?? 0,
      longest_streak: profile?.longest_streak ?? 0,
      title: toLevelTitle(profile?.title),
      is_requester: true,
      requested_at: f.requested_at,
      responded_at: f.responded_at,
    };
  });

  return successResponse({
    friends,
    pending_requests,
    sent_requests,
  });
});

// -----------------------------------------------------------------------------
// POST /api/friends
// -----------------------------------------------------------------------------

/**
 * POST /api/friends
 *
 * Sends a friend request to another user.
 *
 * @authentication Required
 *
 * @body {string} user_id - UUID of the user to send request to (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Friendship} friendship - The created friendship record
 * @returns {string} message - Success message
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing user_id or invalid request
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<SendFriendRequestBody>(request);
  const targetUserId = body?.user_id;

  if (!targetUserId) {
    return ApiErrors.badRequest("user_id is required");
  }

  // Can't friend yourself
  if (targetUserId === user.id) {
    return ApiErrors.badRequest("Cannot send friend request to yourself");
  }

  // Check if target user exists and allows friend requests
  const { data: targetPrivacy } = await supabase
    .from("user_privacy_settings")
    .select("allow_friend_requests")
    .eq("user_id", targetUserId)
    .single();

  // If no privacy settings, assume defaults (allow requests)
  if (targetPrivacy && !targetPrivacy.allow_friend_requests) {
    return ApiErrors.badRequest("This user is not accepting friend requests");
  }

  // Check if friendship already exists in either direction
  const { data: existingFriendships } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`
    );

  if (existingFriendships && existingFriendships.length > 0) {
    const existing = existingFriendships[0];
    if (existing.status === "accepted") {
      return ApiErrors.badRequest("You are already friends with this user");
    }
    if (existing.status === "pending") {
      if (existing.user_id === user.id) {
        return ApiErrors.badRequest("You already sent a friend request to this user");
      } else {
        // The other user already sent us a request - auto-accept it
        const { data: accepted, error: acceptError } = await supabase
          .from("friendships")
          .update({
            status: "accepted",
            responded_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (acceptError) {
          return ApiErrors.serverError(acceptError.message);
        }

        return successResponse({
          friendship: accepted,
          message: "Friend request accepted! You both sent requests to each other.",
        });
      }
    }
    if (existing.status === "blocked") {
      return ApiErrors.badRequest("Cannot send friend request to this user");
    }
  }

  // Create the friend request
  const { data: friendship, error: createError } = await supabase
    .from("friendships")
    .insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: "pending",
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError) {
    // Handle unique constraint violation
    if (createError.code === "23505") {
      return ApiErrors.badRequest("Friend request already exists");
    }
    return ApiErrors.serverError(createError.message);
  }

  return successResponse({
    friendship,
    message: "Friend request sent successfully",
  });
});
