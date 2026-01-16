// =============================================================================
// FOCUS SESSION ABANDON API ROUTE
// Abandons an active focus session without awarding XP.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * POST /api/focus/abandon
 *
 * Abandons the active focus session (no XP awarded).
 *
 * Request body:
 * - sessionId: string (required)
 *
 * Returns:
 * - ok: boolean
 */
export async function POST(req: Request) {
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
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Missing sessionId" },
        { status: 400 }
      );
    }

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from("focus_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { ok: false, error: "Focus session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Session is not active" },
        { status: 400 }
      );
    }

    // Update the session to abandoned
    const { error: updateError } = await supabase
      .from("focus_sessions")
      .update({
        status: "abandoned",
        completed_at: new Date().toISOString(),
        xp_awarded: 0,
      })
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
