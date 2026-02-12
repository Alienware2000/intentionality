// =============================================================================
// API UTILITIES
// Shared utility functions for API routes.
// =============================================================================

/**
 * Extracts a dynamic parameter from a request URL path.
 * Used for extracting IDs from routes like /api/groups/[id] or /api/notifications/[id]/read.
 *
 * @param request - The incoming Request object
 * @param segmentName - The URL segment before the parameter (e.g., "groups", "notifications")
 * @returns The parameter value or null if not found
 *
 * @example
 * // URL: /api/groups/abc123/leave
 * getParamFromUrl(request, "groups") // "abc123"
 *
 * @example
 * // URL: /api/notifications/xyz789/read
 * getParamFromUrl(request, "notifications") // "xyz789"
 */
export function getParamFromUrl(request: Request, segmentName: string): string | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const segmentIndex = pathParts.findIndex((p) => p === segmentName);

  if (segmentIndex >= 0 && pathParts.length > segmentIndex + 1) {
    return pathParts[segmentIndex + 1];
  }

  return null;
}

/**
 * Validates that a string is a valid UUID v4 format.
 *
 * @param id - The string to validate
 * @returns true if valid UUID format, false otherwise
 *
 * @example
 * isValidUUID("550e8400-e29b-41d4-a716-446655440000") // true
 * isValidUUID("not-a-uuid") // false
 * isValidUUID("") // false
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
