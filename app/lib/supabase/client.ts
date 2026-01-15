// =============================================================================
// SUPABASE BROWSER CLIENT
// Creates a Supabase client for use in browser/client components.
// Uses @supabase/ssr for proper cookie handling with Next.js.
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser-side operations.
 *
 * This client handles cookie-based session management automatically.
 * Use this in:
 * - Client components ("use client")
 * - Event handlers
 * - useEffect hooks
 * - Real-time subscriptions
 *
 * The browser client uses the default cookie adapter from @supabase/ssr,
 * which properly handles reading/writing auth cookies via document.cookie.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
