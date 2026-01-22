// =============================================================================
// AUTHENTICATION MIDDLEWARE
// Provides a standardized way to protect API endpoints and access user data.
// Eliminates the repetitive auth boilerplate across all API routes.
// =============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Context passed to authenticated route handlers.
 * Contains the authenticated user, Supabase client, and original request.
 */
export type AuthContext = {
  /** The authenticated Supabase user */
  user: User;
  /** Configured Supabase client for database operations (RLS-enforced) */
  supabase: SupabaseClient;
  /** The original request object */
  request: NextRequest | Request;
};

/**
 * Handler function type for authenticated routes.
 * Receives an AuthContext and returns a NextResponse or Response (for streaming).
 *
 * LEARNING: Streaming vs Standard Responses
 * -----------------------------------------
 * Most endpoints return NextResponse, but streaming endpoints (like AI chat)
 * need to return a plain Response with a ReadableStream body.
 * We allow both types to support this use case.
 */
export type AuthenticatedHandler = (
  ctx: AuthContext
) => Promise<NextResponse | Response> | NextResponse | Response;

// -----------------------------------------------------------------------------
// Response Helpers
// -----------------------------------------------------------------------------

/**
 * Standard error response for authentication failures.
 * Returns 401 status with consistent error format.
 *
 * @returns NextResponse with 401 status and error message
 */
function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Not authenticated" },
    { status: 401 }
  );
}

/**
 * Standard API error responses for common error cases.
 * Provides consistent error format across all API endpoints.
 *
 * @example
 * ```ts
 * if (!questId) {
 *   return ApiErrors.badRequest("quest_id is required");
 * }
 *
 * const task = await fetchTask(id);
 * if (!task) {
 *   return ApiErrors.notFound("Task not found");
 * }
 * ```
 */
export const ApiErrors = {
  /**
   * Returns a 400 Bad Request response.
   * Use for invalid or missing request parameters.
   */
  badRequest: (message: string): NextResponse =>
    NextResponse.json({ ok: false, error: message }, { status: 400 }),

  /**
   * Returns a 404 Not Found response.
   * Use when a requested resource doesn't exist.
   * Note: Prefer 404 over 403 to prevent information disclosure.
   */
  notFound: (message = "Not found"): NextResponse =>
    NextResponse.json({ ok: false, error: message }, { status: 404 }),

  /**
   * Returns a 500 Internal Server Error response.
   * Use for unexpected server-side errors.
   */
  serverError: (message = "Server error"): NextResponse =>
    NextResponse.json({ ok: false, error: message }, { status: 500 }),
};

// -----------------------------------------------------------------------------
// Main Middleware
// -----------------------------------------------------------------------------

/**
 * Wraps an API route handler with authentication.
 * Verifies the user is authenticated before calling the handler.
 *
 * This middleware:
 * 1. Creates a Supabase server client
 * 2. Validates the user's JWT via getUser()
 * 3. Returns 401 if not authenticated
 * 4. Calls the handler with authenticated context if valid
 *
 * @param handler - The route handler to wrap
 * @returns A function that handles the request with auth check
 *
 * @example
 * ```typescript
 * // Simple GET endpoint
 * export const GET = withAuth(async ({ user, supabase }) => {
 *   const { data } = await supabase
 *     .from("tasks")
 *     .select("*");
 *   return NextResponse.json({ ok: true, tasks: data });
 * });
 *
 * // POST endpoint with request body
 * export const POST = withAuth(async ({ user, supabase, request }) => {
 *   const body = await parseJsonBody<{ title: string }>(request);
 *   if (!body?.title) {
 *     return ApiErrors.badRequest("title is required");
 *   }
 *   // ... create resource
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest | Request): Promise<NextResponse | Response> => {
    // Create authenticated Supabase client
    const supabase = await createSupabaseServerClient();

    // Verify user authentication via JWT validation
    // Note: Using getUser() instead of getSession() for security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Return 401 if not authenticated
    if (authError || !user) {
      return unauthorizedResponse();
    }

    // Call the handler with authenticated context
    return handler({ user, supabase, request });
  };
}

// -----------------------------------------------------------------------------
// Request Parsing Helpers
// -----------------------------------------------------------------------------

/**
 * Safely parses JSON body from a request.
 * Returns null if parsing fails (invalid JSON or empty body).
 *
 * @param request - The request to parse
 * @returns Parsed body of type T, or null if parsing fails
 *
 * @example
 * ```ts
 * type CreateTaskBody = { title: string; quest_id: string };
 *
 * export const POST = withAuth(async ({ request }) => {
 *   const body = await parseJsonBody<CreateTaskBody>(request);
 *   if (!body) {
 *     return ApiErrors.badRequest("Invalid JSON body");
 *   }
 *   // body is now typed as CreateTaskBody
 * });
 * ```
 */
export async function parseJsonBody<T>(
  request: Request | NextRequest
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Parses URL search parameters from a request.
 * Provides a convenient way to access query string parameters.
 *
 * @param request - The request to parse
 * @returns URLSearchParams object
 *
 * @example
 * ```ts
 * export const GET = withAuth(async ({ request }) => {
 *   const params = getSearchParams(request);
 *   const date = params.get("date");
 *   const questId = params.get("quest_id");
 *   // ...
 * });
 * ```
 */
export function getSearchParams(request: Request | NextRequest): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

// -----------------------------------------------------------------------------
// Success Response Helper
// -----------------------------------------------------------------------------

/**
 * Creates a successful JSON response with the ok: true flag.
 * Shorthand for common success responses.
 *
 * @param data - Additional data to include in the response
 * @returns NextResponse with ok: true and the provided data
 *
 * @example
 * ```ts
 * return successResponse({ task: newTask });
 * // Returns: { ok: true, task: { ... } }
 *
 * return successResponse({ tasks, total: tasks.length });
 * // Returns: { ok: true, tasks: [...], total: 5 }
 * ```
 */
export function successResponse<T extends Record<string, unknown>>(
  data: T
): NextResponse {
  return NextResponse.json({ ok: true, ...data });
}
