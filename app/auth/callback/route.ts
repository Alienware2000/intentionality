// =============================================================================
// OAUTH CALLBACK ROUTE HANDLER
// Handles the redirect from OAuth providers (Google, etc.) after user consent.
// Exchanges the authorization code for a session.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * GET /auth/callback
 *
 * OAuth providers redirect here with an authorization code.
 * This handler exchanges the code for a session and redirects to the app.
 *
 * Query params from OAuth:
 * - code: Authorization code to exchange for tokens
 * - next: Optional URL to redirect to after auth (defaults to /)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Get the authorization code from the OAuth provider
  const code = searchParams.get("code");
  // Optional: where to redirect after successful auth
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();

    // Exchange the code for a session
    // This creates the auth cookies automatically
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful auth - redirect to the intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed - redirect to auth page with error indicator
  return NextResponse.redirect(`${origin}/auth?error=callback_failed`);
}
