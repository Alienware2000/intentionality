// =============================================================================
// GOOGLE CALENDAR AUTH ROUTE
// Initiates Google OAuth flow for Calendar API access.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

// Google OAuth URLs
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Required scopes for Calendar API
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// -----------------------------------------------------------------------------
// GET /api/calendar/google/auth
// Redirect to Google OAuth consent screen
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // Check if OAuth is configured
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // Don't leak configuration details - return generic error
    return NextResponse.json(
      { ok: false, error: "Google Calendar integration is not available" },
      { status: 503 }
    );
  }

  // Check authentication
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Build the callback URL
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/calendar/google/callback`;

  // Generate state parameter (includes user ID for security)
  const state = Buffer.from(JSON.stringify({
    userId: user.id,
    timestamp: Date.now(),
  })).toString("base64");

  // Build Google OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // Force consent to get refresh token
    state,
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  // Return the URL for the client to redirect to
  return NextResponse.json({ ok: true, authUrl });
}
