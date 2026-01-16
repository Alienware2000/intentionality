// =============================================================================
// GOOGLE CALENDAR OAUTH CALLBACK
// Handles the OAuth callback from Google and stores tokens.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

// Google OAuth token endpoint
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// -----------------------------------------------------------------------------
// GET /api/calendar/google/callback
// Handle OAuth callback and exchange code for tokens
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, request.nextUrl.origin)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_params", request.nextUrl.origin)
    );
  }

  // Verify state and extract user ID
  let stateData: { userId: string; timestamp: number };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64").toString());
  } catch {
    return NextResponse.redirect(
      new URL("/settings?error=invalid_state", request.nextUrl.origin)
    );
  }

  // Check state is not too old (5 minutes)
  if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
    return NextResponse.redirect(
      new URL("/settings?error=state_expired", request.nextUrl.origin)
    );
  }

  // Verify user is authenticated
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== stateData.userId) {
    return NextResponse.redirect(
      new URL("/settings?error=auth_mismatch", request.nextUrl.origin)
    );
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?error=not_configured", request.nextUrl.origin)
    );
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/calendar/google/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange error:", errorData);
      return NextResponse.redirect(
        new URL("/settings?error=token_exchange_failed", request.nextUrl.origin)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user email
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let email: string | null = null;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      email = userInfo.email;
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Check if connection already exists
    const { data: existing } = await supabase
      .from("google_calendar_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      // Update existing connection
      await supabase
        .from("google_calendar_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || undefined, // Keep old if not returned
          token_expires_at: expiresAt,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create new connection
      await supabase
        .from("google_calendar_connections")
        .insert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          email,
          selected_calendars: [],
          import_as: "smart",
        });
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL("/settings?google=connected", request.nextUrl.origin)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=callback_failed", request.nextUrl.origin)
    );
  }
}
