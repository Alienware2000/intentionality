// =============================================================================
// PUBLIC STATS ENDPOINT
// Returns aggregate platform stats for the landing page social proof section.
// No authentication required. Cached for 1 hour.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

const FALLBACK_STATS = {
  tasksCompleted: 500,
  focusHours: 200,
  longestStreak: 30,
  totalUsers: 50,
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const [tasksResult, focusResult, streakResult, usersResult] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("completed", true),
        supabase
          .from("focus_sessions")
          .select("work_duration")
          .eq("status", "completed"),
        supabase
          .from("user_profiles")
          .select("longest_streak")
          .order("longest_streak", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true }),
      ]);

    // Sum focus minutes into hours
    const totalFocusMinutes = focusResult.data
      ? focusResult.data.reduce(
          (sum: number, s: { work_duration: number }) =>
            sum + (s.work_duration || 0),
          0
        )
      : 0;

    const stats = {
      tasksCompleted: tasksResult.count ?? FALLBACK_STATS.tasksCompleted,
      focusHours:
        totalFocusMinutes > 0
          ? Math.round(totalFocusMinutes / 60)
          : FALLBACK_STATS.focusHours,
      longestStreak:
        streakResult.data?.longest_streak ?? FALLBACK_STATS.longestStreak,
      totalUsers: usersResult.count ?? FALLBACK_STATS.totalUsers,
    };

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch {
    return NextResponse.json(FALLBACK_STATS, {
      headers: {
        "Cache-Control": "public, s-maxage=300",
      },
    });
  }
}
