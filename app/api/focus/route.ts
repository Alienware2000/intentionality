// =============================================================================
// FOCUS SESSION API ROUTE
// Handles listing and creating focus sessions (Pomodoro timer).
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * GET /api/focus
 *
 * Fetches focus sessions for the user.
 *
 * Query params:
 * - status: 'active' | 'completed' | 'abandoned' (optional filter)
 * - limit: number (optional, default 20)
 *
 * Returns:
 * - ok: boolean
 * - sessions: FocusSession[]
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
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);

  let query = supabase
    .from("focus_sessions")
    .select("*, task:tasks(id, title, priority)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: sessions, error: sessionsError } = await query;

  if (sessionsError) {
    return NextResponse.json(
      { ok: false, error: sessionsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, sessions: sessions ?? [] });
}

/**
 * POST /api/focus
 *
 * Starts a new focus session.
 *
 * Request body:
 * - work_duration: number (optional, default 25 minutes)
 * - break_duration: number (optional, default 5 minutes)
 * - task_id: string (optional)
 * - title: string (optional)
 *
 * Returns:
 * - ok: boolean
 * - session: FocusSession
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
    const {
      work_duration = 25,
      break_duration = 5,
      task_id,
      title,
    } = body as {
      work_duration?: number;
      break_duration?: number;
      task_id?: string;
      title?: string;
    };

    // Validate durations
    if (work_duration < 1 || work_duration > 180) {
      return NextResponse.json(
        { ok: false, error: "Work duration must be between 1 and 180 minutes" },
        { status: 400 }
      );
    }

    if (break_duration < 0 || break_duration > 60) {
      return NextResponse.json(
        { ok: false, error: "Break duration must be between 0 and 60 minutes" },
        { status: 400 }
      );
    }

    // Check for existing active session
    const { data: existingActive } = await supabase
      .from("focus_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (existingActive) {
      return NextResponse.json(
        { ok: false, error: "You already have an active focus session" },
        { status: 400 }
      );
    }

    // Create the session
    const { data: session, error: createError } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: user.id,
        work_duration,
        break_duration,
        task_id: task_id || null,
        title: title?.trim() || null,
        status: "active",
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, session });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
