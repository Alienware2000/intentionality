// =============================================================================
// USER PROFILE API ROUTE
// Handles gamification profile operations.
// Auto-creates profile if it doesn't exist.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

/**
 * GET /api/profile
 *
 * Fetches the authenticated user's gamification profile.
 * Creates a new profile with defaults if none exists.
 */
export async function GET() {
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

  // Try to fetch existing profile
  const { data: profile, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // If profile doesn't exist, create one
  if (fetchError?.code === "PGRST116") {
    const { data: newProfile, error: createError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        xp_total: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, profile: newProfile });
  }

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: fetchError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, profile });
}

/**
 * PATCH /api/profile
 *
 * Updates the user's gamification profile.
 * Used after task completion to award XP and update streaks.
 *
 * Request body:
 * - xp_to_add?: number - XP to add to total
 * - update_streak?: boolean - Whether to update streak
 */
export async function PATCH(req: Request) {
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
    const body = await req.json();
    const { xp_to_add, update_streak } = body as {
      xp_to_add?: number;
      update_streak?: boolean;
    };

    // Fetch current profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { ok: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const updates: Record<string, unknown> = {};

    // Calculate new XP and level
    if (xp_to_add && xp_to_add > 0) {
      const newXpTotal = currentProfile.xp_total + xp_to_add;
      const newLevel = Math.floor(0.5 + Math.sqrt(0.25 + newXpTotal / 50));

      updates.xp_total = newXpTotal;
      updates.level = newLevel;
    }

    // Update streak
    if (update_streak) {
      const lastActive = currentProfile.last_active_date;

      if (lastActive !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak: number;

        if (lastActive === yesterdayStr) {
          // Consecutive day, increment streak
          newStreak = currentProfile.current_streak + 1;
        } else {
          // Streak broken, start at 1
          newStreak = 1;
        }

        updates.current_streak = newStreak;
        updates.last_active_date = today;

        // Update longest streak if needed
        if (newStreak > currentProfile.longest_streak) {
          updates.longest_streak = newStreak;
        }
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        profile: updatedProfile,
        xpGained: xp_to_add,
        leveledUp: updatedProfile.level > currentProfile.level,
      });
    }

    return NextResponse.json({ ok: true, profile: currentProfile });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
