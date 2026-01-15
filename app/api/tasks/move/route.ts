// =============================================================================
// TASK MOVE API ROUTE
// Moves a task to a different due date.
// RLS ensures users can only move their own tasks.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * POST /api/tasks/move
 *
 * Updates the due date of a task.
 *
 * Request body:
 * - taskId: string (required) - UUID of the task to move
 * - dueDate: string (required) - New date in YYYY-MM-DD format
 *
 * RLS ensures the task belongs to a quest owned by the user.
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

  // Parse request body
  const { taskId, dueDate } = (await req.json()) as {
    taskId?: string;
    dueDate?: string;
  };

  if (!taskId || !dueDate) {
    return NextResponse.json(
      { ok: false, error: "Missing taskId or dueDate" },
      { status: 400 }
    );
  }

  // Verify task exists and belongs to user (RLS enforces this)
  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", taskId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { ok: false, error: "Task not found" },
      { status: 404 }
    );
  }

  // Update the due date
  const { data: updated, error: updateError } = await supabase
    .from("tasks")
    .update({ due_date: dueDate })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, task: updated });
}
