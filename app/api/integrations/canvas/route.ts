// =============================================================================
// CANVAS INTEGRATION API ROUTE
// Handles Canvas LMS connection management.
// Uses Personal Access Token authentication (simpler than OAuth).
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/integrations/canvas (connect) */
type ConnectBody = {
  instanceUrl?: string;  // e.g., "canvas.university.edu"
  accessToken?: string;  // Personal access token from Canvas
};

// -----------------------------------------------------------------------------
// Canvas API Helper
// -----------------------------------------------------------------------------

/**
 * Validates Canvas credentials by fetching the user's profile.
 */
async function validateCanvasCredentials(
  instanceUrl: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string; userName?: string }> {
  try {
    const url = `https://${instanceUrl}/api/v1/users/self`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          valid: false,
          error: "Invalid or expired access token. Please generate a new token in Canvas Settings.",
        };
      }
      if (response.status === 403) {
        return {
          valid: false,
          error: "Access denied. Your school may have disabled API access. Contact your IT department.",
        };
      }
      if (response.status === 404) {
        return {
          valid: false,
          error: "Canvas instance not found. Please check the URL is correct.",
        };
      }
      return {
        valid: false,
        error: `Canvas API error (${response.status}). Please verify your credentials.`,
      };
    }

    const user = await response.json();
    return { valid: true, userName: user.name };
  } catch (error) {
    // Check for specific network errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
      return {
        valid: false,
        error: "Could not find Canvas server. Please check the URL is correct (e.g., canvas.university.edu).",
      };
    }

    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ETIMEDOUT")) {
      return {
        valid: false,
        error: "Could not connect to Canvas server. The server may be down or blocking connections.",
      };
    }

    if (errorMessage.includes("certificate") || errorMessage.includes("SSL")) {
      return {
        valid: false,
        error: "SSL certificate error. Your school's Canvas may have a custom certificate.",
      };
    }

    return {
      valid: false,
      error: "Could not connect to Canvas. Please check the URL and try again.",
    };
  }
}

// -----------------------------------------------------------------------------
// GET /api/integrations/canvas
// -----------------------------------------------------------------------------

/**
 * GET /api/integrations/canvas
 *
 * Fetches the user's Canvas connection status.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {boolean} connected - Whether user has a Canvas connection
 * @returns {Object} [connection] - Connection details (if connected)
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ supabase }) => {
  const { data: connection, error } = await supabase
    .from("canvas_connections")
    .select("id, instance_url, selected_courses, last_synced_at, created_at")
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (not an error for us)
    return ApiErrors.serverError(error.message);
  }

  return successResponse({
    connected: !!connection,
    connection: connection ?? null,
  });
});

// -----------------------------------------------------------------------------
// POST /api/integrations/canvas
// -----------------------------------------------------------------------------

/**
 * POST /api/integrations/canvas
 *
 * Creates or updates a Canvas connection.
 * Uses Personal Access Token for authentication.
 *
 * @authentication Required
 *
 * @body {string} instanceUrl - Canvas instance URL (required)
 * @body {string} accessToken - Personal access token (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {Object} connection - The created/updated connection
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing or invalid credentials
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<ConnectBody>(request);
  let { instanceUrl, accessToken } = body ?? {};

  if (!instanceUrl || !accessToken) {
    return ApiErrors.badRequest("Missing instanceUrl or accessToken");
  }

  // Normalize instance URL (remove protocol if provided)
  instanceUrl = instanceUrl
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  // Validate credentials with Canvas
  const validation = await validateCanvasCredentials(instanceUrl, accessToken);
  if (!validation.valid) {
    return ApiErrors.badRequest(validation.error ?? "Invalid credentials");
  }

  // Check if connection already exists
  const { data: existing } = await supabase
    .from("canvas_connections")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let connection;

  if (existing) {
    // Update existing connection
    const { data, error } = await supabase
      .from("canvas_connections")
      .update({
        instance_url: instanceUrl,
        access_token: accessToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, instance_url, selected_courses, last_synced_at, created_at")
      .single();

    if (error) return ApiErrors.serverError(error.message);
    connection = data;
  } else {
    // Create new connection
    const { data, error } = await supabase
      .from("canvas_connections")
      .insert({
        user_id: user.id,
        instance_url: instanceUrl,
        access_token: accessToken,
        selected_courses: [],
      })
      .select("id, instance_url, selected_courses, last_synced_at, created_at")
      .single();

    if (error) return ApiErrors.serverError(error.message);
    connection = data;
  }

  return successResponse({
    connection,
    userName: validation.userName,
  });
});

// -----------------------------------------------------------------------------
// DELETE /api/integrations/canvas
// -----------------------------------------------------------------------------

/**
 * DELETE /api/integrations/canvas
 *
 * Removes the user's Canvas connection.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 *
 * @throws {401} Not authenticated
 * @throws {404} No connection found
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ user, supabase }) => {
  const { error } = await supabase
    .from("canvas_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  // Also delete synced assignments
  await supabase
    .from("synced_assignments")
    .delete()
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
});
