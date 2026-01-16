// =============================================================================
// CANVAS SYNC API ROUTE
// Syncs assignments from Canvas LMS to tasks.
// Creates quests for courses and tasks for assignments.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { XP_VALUES } from "@/app/lib/gamification";
import type { CanvasAssignment, CanvasCourse, Priority } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Canvas API Helpers
// -----------------------------------------------------------------------------

/**
 * Fetches a single course from Canvas API.
 */
async function fetchCanvasCourse(
  instanceUrl: string,
  accessToken: string,
  courseId: string
): Promise<CanvasCourse | null> {
  try {
    const url = `https://${instanceUrl}/api/v1/courses/${courseId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Fetches assignments from a Canvas course.
 */
async function fetchCourseAssignments(
  instanceUrl: string,
  accessToken: string,
  courseId: string
): Promise<CanvasAssignment[]> {
  const url = `https://${instanceUrl}/api/v1/courses/${courseId}/assignments?per_page=100&order_by=due_at`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch assignments for course ${courseId}`);
  }

  const assignments = await response.json();

  // Filter to assignments with due dates in the future (or no due date)
  const now = new Date();
  return assignments.filter((a: CanvasAssignment) => {
    if (!a.due_at) return true; // Include assignments without due dates
    return new Date(a.due_at) >= now;
  });
}

/**
 * Determines task priority based on assignment due date.
 * - Due within 3 days: high
 * - Due within 7 days: medium
 * - Otherwise: low
 */
function getPriorityFromDueDate(dueAt: string | null): Priority {
  if (!dueAt) return "low";

  const now = new Date();
  const due = new Date(dueAt);
  const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue <= 3) return "high";
  if (daysUntilDue <= 7) return "medium";
  return "low";
}

/**
 * Converts Canvas due date to local date string (YYYY-MM-DD).
 */
function canvasDueToLocalDate(dueAt: string | null): string {
  if (!dueAt) {
    // Default to 7 days from now if no due date
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split("T")[0];
  }
  return new Date(dueAt).toISOString().split("T")[0];
}

// -----------------------------------------------------------------------------
// POST /api/integrations/canvas/sync
// -----------------------------------------------------------------------------

/**
 * POST /api/integrations/canvas/sync
 *
 * Syncs assignments from selected Canvas courses.
 * Creates quests for each course (if not exists) and tasks for assignments.
 *
 * @authentication Required
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} coursesProcessed - Number of courses synced
 * @returns {number} assignmentsCreated - Number of new tasks created
 * @returns {number} assignmentsUpdated - Number of existing tasks updated
 *
 * @throws {401} Not authenticated
 * @throws {404} No Canvas connection or no courses selected
 * @throws {500} Sync error
 */
export const POST = withAuth(async ({ user, supabase }) => {
  // Get Canvas connection
  const { data: connection, error: connError } = await supabase
    .from("canvas_connections")
    .select("*")
    .single();

  if (connError || !connection) {
    return ApiErrors.notFound("No Canvas connection found");
  }

  const selectedCourses = connection.selected_courses ?? [];
  if (selectedCourses.length === 0) {
    return ApiErrors.badRequest("No courses selected for sync");
  }

  let coursesProcessed = 0;
  let assignmentsCreated = 0;
  let assignmentsUpdated = 0;

  // Get existing quests to map course names
  const { data: existingQuests } = await supabase
    .from("quests")
    .select("id, title");

  const questsByTitle = new Map(
    (existingQuests ?? []).map((q: { id: string; title: string }) => [q.title, q.id])
  );

  // Get existing synced assignments
  const { data: existingSynced } = await supabase
    .from("synced_assignments")
    .select("canvas_assignment_id, task_id");

  const syncedByAssignmentId = new Map(
    (existingSynced ?? []).map((s: { canvas_assignment_id: string; task_id: string | null }) => [
      s.canvas_assignment_id,
      s.task_id,
    ])
  );

  // Process each selected course
  for (const courseId of selectedCourses) {
    try {
      // Fetch course details
      const course = await fetchCanvasCourse(
        connection.instance_url,
        connection.access_token,
        courseId
      );

      if (!course) continue;

      // Get or create quest for this course
      const questTitle = `Canvas: ${course.name}`;
      let questId: string | undefined = questsByTitle.get(questTitle);

      if (!questId) {
        // Create new quest
        const { data: newQuest, error: questError } = await supabase
          .from("quests")
          .insert({ user_id: user.id, title: questTitle })
          .select("id")
          .single();

        if (questError || !newQuest) continue;
        questId = newQuest.id as string;
        questsByTitle.set(questTitle, questId);
      }

      // At this point questId is guaranteed to be defined
      const finalQuestId = questId;

      // Fetch assignments for this course
      const assignments = await fetchCourseAssignments(
        connection.instance_url,
        connection.access_token,
        courseId
      );

      // Process each assignment
      for (const assignment of assignments) {
        const assignmentIdStr = String(assignment.id);
        const existingTaskId = syncedByAssignmentId.get(assignmentIdStr);

        const priority = getPriorityFromDueDate(assignment.due_at);
        const dueDate = canvasDueToLocalDate(assignment.due_at);

        if (existingTaskId) {
          // Update existing task
          await supabase
            .from("tasks")
            .update({
              title: assignment.name,
              due_date: dueDate,
              priority,
              xp_value: XP_VALUES[priority],
            })
            .eq("id", existingTaskId);

          // Update synced assignment record
          await supabase
            .from("synced_assignments")
            .update({
              assignment_name: assignment.name,
              due_at: assignment.due_at,
              last_synced_at: new Date().toISOString(),
            })
            .eq("canvas_assignment_id", assignmentIdStr)
            .eq("user_id", user.id);

          assignmentsUpdated++;
        } else {
          // Create new task
          const { data: newTask, error: taskError } = await supabase
            .from("tasks")
            .insert({
              quest_id: finalQuestId,
              title: assignment.name,
              due_date: dueDate,
              priority,
              xp_value: XP_VALUES[priority],
              completed: false,
            })
            .select("id")
            .single();

          if (taskError || !newTask) continue;

          // Create synced assignment record
          await supabase.from("synced_assignments").insert({
            user_id: user.id,
            canvas_assignment_id: assignmentIdStr,
            canvas_course_id: courseId,
            task_id: newTask.id,
            quest_id: finalQuestId,
            assignment_name: assignment.name,
            due_at: assignment.due_at,
          });

          syncedByAssignmentId.set(assignmentIdStr, newTask.id);
          assignmentsCreated++;
        }
      }

      coursesProcessed++;
    } catch (error) {
      // Log error but continue with other courses
      console.error(`Error syncing course ${courseId}:`, error);
    }
  }

  // Update last synced timestamp
  await supabase
    .from("canvas_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({
    ok: true,
    coursesProcessed,
    assignmentsCreated,
    assignmentsUpdated,
  });
});
