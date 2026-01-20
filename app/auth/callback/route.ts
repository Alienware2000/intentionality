// =============================================================================
// AUTH CALLBACK ROUTE HANDLER
// Handles redirects from:
// 1. OAuth providers (Google, etc.) after user consent
// 2. Email confirmation links with token_hash
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * GET /auth/callback
 *
 * Handles multiple auth callback scenarios:
 *
 * OAuth callback (Google, etc.):
 * - code: Authorization code to exchange for tokens
 * - next: Optional URL to redirect to after auth (defaults to /)
 *
 * Email confirmation callback:
 * - token_hash: The OTP token hash from the email link
 * - type: The type of OTP (e.g., "email", "signup", "recovery")
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Get params for both OAuth and email confirmation flows
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = await createSupabaseServerClient();

  // Handle OAuth callback (Google, etc.)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/auth?error=callback_failed`);
  }

  // Handle email confirmation callback
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      // Email confirmed successfully - redirect to auth page with success indicator
      return NextResponse.redirect(`${origin}/auth?confirmed=true`);
    }

    // Check for expired link error
    if (error.code === "otp_expired") {
      return NextResponse.redirect(`${origin}/auth/link-expired`);
    }

    // Other verification errors
    return NextResponse.redirect(
      `${origin}/auth?error=verification_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  // No valid callback params - redirect to auth page
  return NextResponse.redirect(`${origin}/auth?error=invalid_callback`);
}
