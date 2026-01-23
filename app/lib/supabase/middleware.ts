// =============================================================================
// SUPABASE MIDDLEWARE CLIENT
// Creates a Supabase client specifically for use in Next.js middleware.
// Handles token refresh and cookie synchronization between request/response.
// =============================================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Updates the user's Supabase session in middleware.
 *
 * This function is critical for maintaining auth state across the app:
 * 1. Reads auth tokens from request cookies
 * 2. Refreshes expired tokens by calling getUser()
 * 3. Updates both request and response cookies with fresh tokens
 *
 * Without this middleware, tokens would expire and users would be logged out
 * even though they have a valid refresh token.
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse with updated auth cookies
 */
export async function updateSession(request: NextRequest) {
  // Start with a simple "pass-through" response
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create a Supabase client that bridges request/response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookies from the incoming request
        getAll() {
          return request.cookies.getAll();
        },
        // Write cookies to BOTH the request (for downstream Server Components)
        // AND the response (to send back to the browser)
        setAll(cookiesToSet) {
          // First, update the request cookies so Server Components see fresh tokens
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Create a new response that includes the modified request
          supabaseResponse = NextResponse.next({
            request,
          });

          // Then update the response cookies to send to browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Call getUser() to refresh the session.
  // This validates the JWT with Supabase Auth and refreshes if needed.
  // Do NOT use getSession() here - it doesn't validate the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define route types
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  const isLandingPage = request.nextUrl.pathname === "/";

  // Redirect unauthenticated users away from protected routes
  // API routes handle their own auth and return 401
  // Landing page is public
  if (!user && !isAuthRoute && !isApiRoute && !isLandingPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages and landing page
  // (they should go to dashboard)
  if (user && (isAuthRoute || isLandingPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
