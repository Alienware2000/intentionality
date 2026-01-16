// =============================================================================
// SCHEDULE BLOCK COMPLETIONS API ROUTE
// Fetches completions for schedule blocks on a given date.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * GET /api/schedule/completions?date=YYYY-MM-DD
 *
 * Fetches all schedule block completions for the user on a specific date.
 *
 * Query params:
 * - date: string (required) - YYYY-MM-DD format
 *
 * Returns:
 * - ok: boolean
 * - completions: ScheduleBlockCompletion[]
 */
export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { ok: false, error: "Missing date parameter" },
      { status: 400 }
    );
  }

  try {
    // First get user's schedule block IDs
    const { data: blocks, error: blocksError } = await supabase
      .from("schedule_blocks")
      .select("id")
      .eq("user_id", user.id);

    if (blocksError) {
      return NextResponse.json(
        { ok: false, error: blocksError.message },
        { status: 500 }
      );
    }

    const blockIds = blocks?.map((b) => b.id) ?? [];

    if (blockIds.length === 0) {
      return NextResponse.json({ ok: true, completions: [] });
    }

    // Fetch completions for those blocks on the given date
    const { data: completions, error: completionsError } = await supabase
      .from("schedule_block_completions")
      .select("*")
      .in("block_id", blockIds)
      .eq("completed_date", date);

    if (completionsError) {
      return NextResponse.json(
        { ok: false, error: completionsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, completions: completions ?? [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
