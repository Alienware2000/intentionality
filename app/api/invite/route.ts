// =============================================================================
// PUBLIC INVITE LOOKUP API ROUTE
// Looks up an invite code and returns the inviter's public profile.
// Works for both authenticated and unauthenticated users.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { LevelTitle } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/invite?code=ABC123 or /api/invite?username=johndoe
// -----------------------------------------------------------------------------

/**
 * GET /api/invite?code=ABC123 or /api/invite?username=johndoe
 *
 * Looks up an invite by code or username and returns public profile info.
 * Works for unauthenticated users (for invite landing page).
 *
 * @query {string} code - Invite code to look up
 * @query {string} username - Username to look up (alternative to code)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Object} inviter - Inviter's public profile
 *
 * @throws {400} Missing code/username
 * @throws {404} Invalid code/username
 * @throws {500} Database error
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const username = searchParams.get("username");

  if (!code && !username) {
    return NextResponse.json(
      { ok: false, error: "code or username is required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  // Build query based on what was provided
  let query = supabase
    .from("user_profiles")
    .select(`
      user_id,
      display_name,
      username,
      level,
      current_streak,
      title,
      invite_code
    `);

  if (code) {
    query = query.eq("invite_code", code.toUpperCase());
  } else if (username) {
    query = query.ilike("username", username);
  }

  const { data: profile, error } = await query.single();

  if (error || !profile) {
    return NextResponse.json(
      { ok: false, error: "Invalid invite code or username" },
      { status: 404 }
    );
  }

  // Return public profile info for the invite page
  return NextResponse.json({
    ok: true,
    inviter: {
      user_id: profile.user_id,
      display_name: profile.display_name,
      username: profile.username,
      level: profile.level,
      current_streak: profile.current_streak,
      title: (profile.title as LevelTitle) ?? "Novice",
      invite_code: profile.invite_code,
    },
  });
}
