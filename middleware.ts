// =============================================================================
// NEXT.JS MIDDLEWARE
// Runs on every request to handle auth session refresh and route protection.
// This is the centralized auth layer for the entire application.
// =============================================================================

import { type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/middleware";

/**
 * Middleware entry point.
 *
 * Delegates to updateSession() which:
 * 1. Refreshes expired auth tokens
 * 2. Syncs cookies between request and response
 * 3. Redirects unauthenticated users to /auth
 * 4. Redirects authenticated users away from /auth
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Configure which routes the middleware runs on.
 *
 * We exclude:
 * - _next/static: Static files (JS, CSS)
 * - _next/image: Image optimization
 * - favicon.ico: Browser favicon
 * - Public assets: Images, fonts, etc.
 *
 * This prevents unnecessary middleware execution on static resources.
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - Public folder assets (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
