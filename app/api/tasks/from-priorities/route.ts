// =============================================================================
// CREATE TASKS FROM PRIORITIES API ROUTE
// Creates tasks from daily review tomorrow priorities.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { XP_VALUES } from "@/app/lib/gamification";
import type { Task, Priority } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type CreateFromPrioritiesBody = {
  priorities: string[];
  date: string; // Target date for tasks (YYYY-MM-DD)
  priority?: Priority; // Default priority for created tasks
};

type PriorityResult = {
  priority: string;
  status: "created" | "exists" | "error";
  task?: Task;
  error?: string;
};

// -----------------------------------------------------------------------------
// POST /api/tasks/from-priorities
// -----------------------------------------------------------------------------

/**
 * POST /api/tasks/from-priorities
 *
 * Creates tasks from an array of priority strings.
 * Checks for existing tasks with matching titles to avoid duplicates.
 *
 * @authentication Required
 *
 * @body {string[]} priorities - Array of priority strings
 * @body {string} date - Target date for tasks (YYYY-MM-DD)
 * @body {Priority} [priority="high"] - Default priority for created tasks
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {PriorityResult[]} results - Results for each priority
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateFromPrioritiesBody>(request);

  if (!body?.priorities || !Array.isArray(body.priorities)) {
    return ApiErrors.badRequest("priorities array is required");
  }

  if (!body.date) {
    return ApiErrors.badRequest("date is required");
  }

  const priorities = body.priorities.filter((p) => p && p.trim().length > 0);
  const targetDate = body.date;
  const defaultPriority = body.priority ?? "high";

  if (priorities.length === 0) {
    return successResponse({ results: [] });
  }

  // Get or create a default quest for priorities
  let questId: string;

  // First, try to find an existing "Daily Priorities" quest
  const { data: existingQuest } = await supabase
    .from("quests")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", "Daily Priorities")
    .is("archived_at", null)
    .single();

  if (existingQuest) {
    questId = existingQuest.id;
  } else {
    // Create a new quest for priorities
    const { data: newQuest, error: questError } = await supabase
      .from("quests")
      .insert({
        user_id: user.id,
        title: "Daily Priorities",
        quest_type: "user",
      })
      .select("id")
      .single();

    if (questError || !newQuest) {
      return ApiErrors.serverError("Failed to create quest for priorities");
    }

    questId = newQuest.id;
  }

  // Check for existing tasks with matching titles on the target date
  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("due_date", targetDate)
    .is("deleted_at", null);

  const existingTitles = new Set(
    (existingTasks ?? []).map((t) => t.title.toLowerCase().trim())
  );

  // Process each priority
  const results: PriorityResult[] = [];
  const xpValue = XP_VALUES[defaultPriority] ?? XP_VALUES.high;

  for (const priorityText of priorities) {
    const trimmedTitle = priorityText.trim();
    const lowerTitle = trimmedTitle.toLowerCase();

    // Check if task already exists
    if (existingTitles.has(lowerTitle)) {
      results.push({
        priority: priorityText,
        status: "exists",
      });
      continue;
    }

    // Create the task
    const { data: task, error: createError } = await supabase
      .from("tasks")
      .insert({
        title: trimmedTitle,
        due_date: targetDate,
        quest_id: questId,
        priority: defaultPriority,
        xp_value: xpValue,
        completed: false,
      })
      .select("*, quest:quests(*)")
      .single();

    if (createError) {
      results.push({
        priority: priorityText,
        status: "error",
        error: createError.message,
      });
      continue;
    }

    results.push({
      priority: priorityText,
      status: "created",
      task: task as Task,
    });

    // Add to existing titles set to prevent duplicates in this batch
    existingTitles.add(lowerTitle);
  }

  const createdCount = results.filter((r) => r.status === "created").length;
  const existsCount = results.filter((r) => r.status === "exists").length;

  return successResponse({
    results,
    summary: {
      created: createdCount,
      alreadyExist: existsCount,
      errors: results.length - createdCount - existsCount,
    },
  });
});
