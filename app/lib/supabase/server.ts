// =============================================================================
// SUPABASE SERVER CLIENT
// Creates a Supabase client for use in Server Components, Route Handlers,
// and Server Actions. Uses Next.js cookies() for session management.
// =============================================================================

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for server-side operations.
 *
 * This client reads and writes cookies using Next.js's cookies() API.
 * Use this in:
 * - Server Components
 * - Route Handlers (app/api/*)
 * - Server Actions
 *
 * IMPORTANT: Always use getUser() instead of getSession() for auth checks.
 * getUser() validates the JWT with Supabase Auth server, while getSession()
 * only reads from cookies without validation.
 *
 * @returns A configured Supabase client for server-side use
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the request
        getAll() {
          return cookieStore.getAll();
        },
        // Write cookies to the response
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Setting cookies can fail in Server Components during static
            // rendering. This is expected - the middleware handles token
            // refresh for those cases.
          }
        },
      },
    }
  );
}
