// =============================================================================
// BULK TASK CREATION API
// Creates multiple tasks at once with individual due dates.
// Used by weekly planning review to create tasks with user-selected days.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { XP_VALUES, PLANNING_XP } from "@/app/lib/gamification";
import type { Task, Priority, ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

type BulkTaskInput = {
  title: string;
  due_date: ISODateString;
  priority: Priority;
};

type BulkCreateBody = {
  tasks: BulkTaskInput[];
  week_start: ISODateString; // Links tasks to weekly plan
  quest_name?: string; // Optional quest name (defaults to "Weekly Goals")
};

type TaskResult = {
  title: string;
  status: "created" | "exists" | "error";
  task?: Task;
  error?: string;
};

// -----------------------------------------------------------------------------
// POST /api/tasks/bulk
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<BulkCreateBody>(request);

  if (!body?.tasks || !Array.isArray(body.tasks)) {
    return ApiErrors.badRequest("tasks array is required");
  }

  if (!body.week_start) {
    return ApiErrors.badRequest("week_start is required");
  }

  const tasks = body.tasks.filter(
    (t) =>
      t &&
      typeof t.title === "string" &&
      t.title.trim().length > 0 &&
      typeof t.due_date === "string" &&
      typeof t.priority === "string"
  );

  if (tasks.length === 0) {
    return successResponse({ results: [], tasksCreated: 0, xpGained: 0 });
  }

  const weekStart = body.week_start;
  const questName = body.quest_name || "Weekly Goals";

  // Get or create the quest
  let questId: string;

  const { data: existingQuest } = await supabase
    .from("quests")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", questName)
    .is("archived_at", null)
    .single();

  if (existingQuest) {
    questId = existingQuest.id;
  } else {
    const { data: newQuest, error: questError } = await supabase
      .from("quests")
      .insert({
        user_id: user.id,
        title: questName,
        quest_type: "user",
      })
      .select("id")
      .single();

    if (questError || !newQuest) {
      return ApiErrors.serverError("Failed to create quest for tasks");
    }

    questId = newQuest.id;
  }

  // Get existing tasks to check for duplicates
  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .eq("week_start", weekStart)
    .is("deleted_at", null);

  const existingSet = new Set(
    (existingTasks ?? []).map((t) => `${t.title.toLowerCase().trim()}|${t.due_date}`)
  );

  // Create tasks
  const results: TaskResult[] = [];
  let totalXp = 0;

  for (const task of tasks) {
    const trimmedTitle = task.title.trim();
    const key = `${trimmedTitle.toLowerCase()}|${task.due_date}`;

    // Check for duplicate
    if (existingSet.has(key)) {
      results.push({
        title: trimmedTitle,
        status: "exists",
      });
      continue;
    }

    const xpValue = XP_VALUES[task.priority] ?? XP_VALUES.medium;

    const { data: createdTask, error: createError } = await supabase
      .from("tasks")
      .insert({
        title: trimmedTitle,
        due_date: task.due_date,
        quest_id: questId,
        priority: task.priority,
        xp_value: xpValue,
        completed: false,
        week_start: weekStart,
      })
      .select("*, quest:quests(*)")
      .single();

    if (createError) {
      results.push({
        title: trimmedTitle,
        status: "error",
        error: createError.message,
      });
      continue;
    }

    results.push({
      title: trimmedTitle,
      status: "created",
      task: createdTask as Task,
    });

    existingSet.add(key);
  }

  const tasksCreated = results.filter((r) => r.status === "created").length;

  // Award XP for weekly planning (if tasks were created and no existing plan)
  let xpGained = 0;

  if (tasksCreated > 0) {
    // Check if weekly plan exists
    const { data: existingPlan } = await supabase
      .from("weekly_plans")
      .select("id, xp_awarded")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single();

    if (!existingPlan) {
      // Create weekly plan and award XP
      xpGained = PLANNING_XP.weekly_planning;

      await supabase.from("weekly_plans").insert({
        user_id: user.id,
        week_start: weekStart,
        goals: [],
        focus_areas: [],
        xp_awarded: xpGained,
      });

      await supabase.rpc("add_xp", { p_user_id: user.id, p_xp: xpGained });
    } else if (!existingPlan.xp_awarded) {
      // Plan exists but no XP awarded yet
      xpGained = PLANNING_XP.weekly_planning;

      await supabase
        .from("weekly_plans")
        .update({ xp_awarded: xpGained })
        .eq("id", existingPlan.id);

      await supabase.rpc("add_xp", { p_user_id: user.id, p_xp: xpGained });
    }
  }

  return successResponse({
    results,
    tasksCreated,
    xpGained,
    summary: {
      created: tasksCreated,
      alreadyExist: results.filter((r) => r.status === "exists").length,
      errors: results.filter((r) => r.status === "error").length,
    },
  });
});
