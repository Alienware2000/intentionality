// =============================================================================
// TODAY'S TASKS API ROUTE
// Fetches tasks due today plus overdue incomplete tasks.
// RLS ensures users can only see their own tasks.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * GET /api/tasks/for-today?date=YYYY-MM-DD
 *
 * Fetches tasks that should appear on today's view:
 * - All tasks due on the specified date
 * - All overdue tasks that are not completed
 *
 * Query params:
 * - date: string (required) - Today's date in YYYY-MM-DD format
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

  // Fetch tasks using PostgREST OR syntax:
  // - due_date = date (all tasks due today)
  // - OR (due_date < date AND completed = false) (overdue incomplete tasks)
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("*, quest:quests(*)")
    .or(`due_date.eq.${date},and(due_date.lt.${date},completed.eq.false)`)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: fetchError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, tasks: tasks ?? [] });
}
