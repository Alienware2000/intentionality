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
 * Validates that a string doesn't exceed a maximum length.
 *
 * @param value - The string to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @returns Error message if validation fails, null if valid
 */
export function validateMaxLength(
  value: string | undefined | null,
  maxLength: number,
  fieldName: string
): string | null {
  if (value && value.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less`;
  }
  return null;
}
