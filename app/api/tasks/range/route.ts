// =============================================================================
// TASK RANGE API ROUTE
// Fetches tasks within a date range for the week view.
// RLS ensures users can only see their own tasks.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * GET /api/tasks/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Fetches all tasks within the specified date range.
 * Includes the associated quest data.
 *
 * Query params:
 * - start: string (required) - Start date in YYYY-MM-DD format
 * - end: string (required) - End date in YYYY-MM-DD format
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
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { ok: false, error: "Missing start or end query param" },
      { status: 400 }
    );
  }

  // Fetch tasks in the date range (RLS filters by quest ownership)
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("*, quest:quests(*)")
    .gte("due_date", start)
    .lte("due_date", end)
    .order("due_date", { ascending: true });

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: fetchError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, tasks: tasks ?? [] });
}
