// =============================================================================
// HABITS API ROUTE
// Handles CRUD operations for daily habits.
// Uses Supabase for both auth and database.
// RLS policies enforce that users can only access their own habits.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { XP_VALUES, getLevelFromXp } from "@/app/lib/gamification";

/**
 * GET /api/habits?date=YYYY-MM-DD
 *
 * Fetches all habits for the user with today's completion status.
 *
 * Query params:
 * - date: string (required) - Date to check completion status
 *
 * RLS ensures only the user's own habits are returned.
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
      { ok: false, error: "Missing date query param" },
      { status: 400 }
    );
  }

  // Fetch all habits
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*")
    .order("created_at", { ascending: true });

  if (habitsError) {
    return NextResponse.json(
      { ok: false, error: habitsError.message },
      { status: 500 }
    );
  }

  // Fetch today's completions
  const { data: completions } = await supabase
    .from("habit_completions")
    .select("habit_id")
    .eq("completed_date", date);

  const completedIds = new Set(completions?.map((c) => c.habit_id) ?? []);

  // Add completedToday status to each habit
  const habitsWithStatus = (habits ?? []).map((h) => ({
    ...h,
    completedToday: completedIds.has(h.id),
  }));

  return NextResponse.json({ ok: true, habits: habitsWithStatus });
}

/**
 * POST /api/habits
 *
 * Creates a new habit.
 *
 * Request body:
 * - title: string (required)
 * - priority: 'low' | 'medium' | 'high' (optional, default: 'medium')
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
    const { title, priority = "medium" } = body as {
      title?: string;
      priority?: "low" | "medium" | "high";
    };

    if (!title || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing title" },
        { status: 400 }
      );
    }

    // Calculate XP value based on priority
    const xp_value = XP_VALUES[priority] ?? XP_VALUES.medium;

    const { data: habit, error: createError } = await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        title: title.trim(),
        priority,
        xp_value,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, habit });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/habits
 *
 * Updates a habit's title or priority.
 *
 * Request body:
 * - habitId: string (required)
 * - title?: string
 * - priority?: 'low' | 'medium' | 'high'
 *
 * If priority changes, xp_value is recalculated.
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
    const { habitId, title, priority } = body as {
      habitId?: string;
      title?: string;
      priority?: "low" | "medium" | "high";
    };

    if (!habitId) {
      return NextResponse.json(
        { ok: false, error: "Missing habitId" },
        { status: 400 }
      );
    }

    if (!title && !priority) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (title) updates.title = title.trim();
    if (priority) {
      updates.priority = priority;
      updates.xp_value = XP_VALUES[priority];
    }

    const { data: habit, error: updateError } = await supabase
      .from("habits")
      .update(updates)
      .eq("id", habitId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, habit });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/habits
 *
 * Deletes a habit and all its completions.
 *
 * Request body:
 * - habitId: string (required)
 *
 * XP from completed days is deducted from user profile.
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
    const { habitId } = body as { habitId?: string };

    if (!habitId) {
      return NextResponse.json(
        { ok: false, error: "Missing habitId" },
        { status: 400 }
      );
    }

    // Sum XP from all completions for this habit
    const { data: completions } = await supabase
      .from("habit_completions")
      .select("xp_awarded")
      .eq("habit_id", habitId);

    const xpToDeduct =
      completions?.reduce((sum, c) => sum + (c.xp_awarded ?? 0), 0) ?? 0;

    // Delete the habit (completions cascade)
    const { error: deleteError } = await supabase
      .from("habits")
      .delete()
      .eq("id", habitId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      );
    }

    // Deduct XP from user profile
    let newXpTotal: number | undefined;
    let newLevel: number | undefined;

    if (xpToDeduct > 0) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("xp_total")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        newXpTotal = Math.max(0, profile.xp_total - xpToDeduct);
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

    return NextResponse.json({
      ok: true,
      xpDeducted: xpToDeduct,
      newXpTotal,
      newLevel,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
