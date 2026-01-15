// =============================================================================
// TASKS API ROUTE
// Handles CRUD operations for tasks.
// Uses Supabase for both auth and database.
// RLS policies enforce that users can only access tasks in their own quests.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getLevelFromXp } from "@/app/lib/gamification";

/**
 * GET /api/tasks?date=YYYY-MM-DD
 *
 * Fetches all tasks for a specific date for the authenticated user.
 * Includes the associated quest data.
 *
 * Query params:
 * - date: string (required) - Date in YYYY-MM-DD format
 *
 * RLS ensures only tasks from user's quests are returned.
 */
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Parse query params
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { ok: false, error: "Missing date query param" },
      { status: 400 }
    );
  }

  // Fetch tasks for the date (RLS filters by quest ownership)
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("*, quest:quests(*)")
    .eq("due_date", date)
    .order("created_at", { ascending: true });

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: fetchError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, tasks: tasks ?? [] });
}

/**
 * POST /api/tasks
 *
 * Creates a new task in the specified quest.
 *
 * Request body:
 * - title: string (required) - The task title
 * - due_date: string (required) - Date in YYYY-MM-DD format
 * - quest_id: string (required) - UUID of the quest
 * - priority: string (optional) - 'low' | 'medium' | 'high' (default: 'medium')
 *
 * RLS policy ensures the quest belongs to the user.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    // Parse request body
    const body = await req.json();
    const { title, due_date, quest_id, priority = "medium" } = body as {
      title?: string;
      due_date?: string;
      quest_id?: string;
      priority?: "low" | "medium" | "high";
    };

    if (!title || !due_date || !quest_id) {
      return NextResponse.json(
        { ok: false, error: "Missing title, due_date, or quest_id" },
        { status: 400 }
      );
    }

    // Calculate XP value based on priority
    const xpValues = { low: 5, medium: 10, high: 25 };
    const xp_value = xpValues[priority] ?? 10;

    // Verify quest ownership (RLS will also enforce this, but we check for a better error message)
    const { data: quest, error: questError } = await supabase
      .from("quests")
      .select("id")
      .eq("id", quest_id)
      .single();

    if (questError || !quest) {
      return NextResponse.json(
        { ok: false, error: "Invalid quest_id (not owned by user)" },
        { status: 403 }
      );
    }

    // Create the task (RLS enforces quest ownership)
    const { data: task, error: createError } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        due_date,
        quest_id,
        priority,
        xp_value,
        completed: false,
      })
      .select("*, quest:quests(*)")
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, task });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/tasks
 *
 * Updates a task's title, due_date, or priority.
 *
 * Request body:
 * - taskId: string (required) - UUID of the task
 * - title?: string - New title
 * - due_date?: string - New date (YYYY-MM-DD)
 * - priority?: 'low' | 'medium' | 'high' - New priority
 *
 * At least one field to update is required.
 * If priority changes, xp_value is recalculated.
 * RLS ensures the task belongs to a quest owned by the user.
 */
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { taskId, title, due_date, priority } = body as {
      taskId?: string;
      title?: string;
      due_date?: string;
      priority?: "low" | "medium" | "high";
    };

    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: "Missing taskId" },
        { status: 400 }
      );
    }

    if (!title && !due_date && !priority) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (title) updates.title = title.trim();
    if (due_date) updates.due_date = due_date;
    if (priority) {
      updates.priority = priority;
      const xpValues = { low: 5, medium: 10, high: 25 };
      updates.xp_value = xpValues[priority];
    }

    const { data: task, error: updateError } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select("*, quest:quests(*)")
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, task });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks
 *
 * Deletes a task.
 *
 * Request body:
 * - taskId: string (required) - UUID of the task to delete
 *
 * If task was completed, XP is deducted from user profile.
 * RLS ensures the task belongs to a quest owned by the user.
 */
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { taskId } = body as { taskId?: string };

    if (!taskId) {
      return NextResponse.json(
        { ok: false, error: "Missing taskId" },
        { status: 400 }
      );
    }

    // Fetch task to check if it was completed
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("completed, xp_value")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { ok: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Delete the task
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      );
    }

    // If task was completed, deduct XP
    let newXpTotal: number | undefined;
    let newLevel: number | undefined;

    if (task.completed) {
      const xpAmount = task.xp_value ?? 10;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("xp_total, level")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        newXpTotal = Math.max(0, profile.xp_total - xpAmount);
        newLevel = getLevelFromXp(newXpTotal);

        await supabase
          .from("user_profiles")
          .update({
            xp_total: newXpTotal,
            level: newLevel,
          })
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ ok: true, newXpTotal, newLevel });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
