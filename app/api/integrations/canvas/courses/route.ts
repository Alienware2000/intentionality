// =============================================================================
// CANVAS COURSES API ROUTE
// Fetches available courses from Canvas LMS.
// Also handles updating selected courses.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { CanvasCourse } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for PATCH (update selected courses) */
type UpdateCoursesBody = {
  selectedCourses?: string[];
};

// -----------------------------------------------------------------------------
// Canvas API Helper
// -----------------------------------------------------------------------------

/**
 * Fetches courses from Canvas API.
 */
async function fetchCanvasCourses(
  instanceUrl: string,
  accessToken: string
): Promise<CanvasCourse[]> {
  const url = `https://${instanceUrl}/api/v1/courses?enrollment_state=active&per_page=100`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Canvas API error: ${response.status}`);
  }

  const courses = await response.json();

  // Filter to only courses with a name (some might be hidden/unavailable)
  return courses
    .filter((c: CanvasCourse) => c.name)
    .map((c: CanvasCourse) => ({
      id: c.id,
      name: c.name,
      course_code: c.course_code,
    }));
}

// -----------------------------------------------------------------------------
// GET /api/integrations/canvas/courses
// -----------------------------------------------------------------------------

/**
 * GET /api/integrations/canvas/courses
 *
 * Fetches available courses from the user's Canvas instance.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {CanvasCourse[]} courses - Array of available courses
 * @returns {string[]} selectedCourses - Currently selected course IDs
 *
 * @throws {401} Not authenticated
 * @throws {404} No Canvas connection
 * @throws {500} Canvas API or database error
 */
export const GET = withAuth(async ({ supabase }) => {
  // Get Canvas connection
  const { data: connection, error: connError } = await supabase
    .from("canvas_connections")
    .select("instance_url, access_token, selected_courses")
    .single();

  if (connError || !connection) {
    return ApiErrors.notFound("No Canvas connection found");
  }

  try {
    const courses = await fetchCanvasCourses(
      connection.instance_url,
      connection.access_token
    );

    return successResponse({
      courses,
      selectedCourses: connection.selected_courses ?? [],
    });
  } catch (error) {
    return ApiErrors.serverError(
      error instanceof Error ? error.message : "Failed to fetch courses"
    );
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/integrations/canvas/courses
// -----------------------------------------------------------------------------

/**
 * PATCH /api/integrations/canvas/courses
 *
 * Updates the list of selected courses to sync.
 *
 * @authentication Required
 *
 * @body {string[]} selectedCourses - Array of course IDs to sync
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string[]} selectedCourses - Updated selected course IDs
 *
 * @throws {401} Not authenticated
 * @throws {404} No Canvas connection
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<UpdateCoursesBody>(request);
  const { selectedCourses } = body ?? {};

  if (!Array.isArray(selectedCourses)) {
    return ApiErrors.badRequest("selectedCourses must be an array");
  }

  const { data, error } = await supabase
    .from("canvas_connections")
    .update({
      selected_courses: selectedCourses,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select("selected_courses")
    .single();

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({
    selectedCourses: data?.selected_courses ?? [],
  });
});
