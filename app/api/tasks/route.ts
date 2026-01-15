// =============================================================================
// TASKS API ROUTE
// Handles CRUD operations for tasks.
// Uses Supabase for both auth and database.
// RLS policies enforce that users can only access tasks in their own quests.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

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
