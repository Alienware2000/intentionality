// =============================================================================
// FOCUS SESSION COMPLETE API ROUTE
// Completes an active focus session and awards XP.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getFocusXp, getLevelFromXp, getLocalDateString } from "@/app/lib/gamification";

/**
 * POST /api/focus/complete
 *
 * Completes the active focus session and awards XP.
 *
 * Request body:
 * - sessionId: string (required)
 *
 * Returns:
 * - ok: boolean
 * - xpGained: number
 * - newLevel?: number (if leveled up)
 * - newXpTotal: number
 * - focusMinutesAdded: number
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
      .select("*")
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

    // Calculate XP based on work duration
    const xpGained = getFocusXp(session.work_duration);

    // Update the session
    const { error: updateError } = await supabase
      .from("focus_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        xp_awarded: xpGained,
      })
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Update user profile with XP and focus stats
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newXpTotal = profile.xp_total + xpGained;
      const newLevel = getLevelFromXp(newXpTotal);
      const leveledUp = newLevel > profile.level;

      // Update streak
      const today = getLocalDateString();
      let globalStreak = profile.current_streak;
      let globalLongestStreak = profile.longest_streak;

      if (profile.last_active_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterday);

        if (profile.last_active_date === yesterdayStr) {
          globalStreak = profile.current_streak + 1;
        } else {
          globalStreak = 1;
        }

        if (globalStreak > globalLongestStreak) {
          globalLongestStreak = globalStreak;
        }
      }

      await supabase
        .from("user_profiles")
        .update({
          xp_total: newXpTotal,
          level: newLevel,
          current_streak: globalStreak,
          longest_streak: globalLongestStreak,
          last_active_date: today,
          total_focus_minutes: profile.total_focus_minutes + session.work_duration,
          focus_sessions_completed: profile.focus_sessions_completed + 1,
        })
        .eq("user_id", user.id);

      return NextResponse.json({
        ok: true,
        xpGained,
        newLevel: leveledUp ? newLevel : undefined,
        newXpTotal,
        focusMinutesAdded: session.work_duration,
      });
    }

    return NextResponse.json({
      ok: true,
      xpGained,
      newXpTotal: 0,
      focusMinutesAdded: session.work_duration,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
