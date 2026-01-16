// =============================================================================
// SCHEDULE BLOCK COMPLETE API ROUTE
// Toggles the completion status of a schedule block for a specific date.
// Awards XP when completing, deducts when uncompleting.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getLevelFromXp, getLocalDateString } from "@/app/lib/gamification";

/**
 * POST /api/schedule/complete
 *
 * Toggles schedule block completion for a specific date.
 *
 * Request body:
 * - blockId: string (required)
 * - date: string (required) - YYYY-MM-DD format
 *
 * Returns:
 * - ok: boolean
 * - xpGained?: number (when completing)
 * - xpLost?: number (when uncompleting)
 * - newLevel?: number (if user leveled up)
 * - newXpTotal: number
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
    const { blockId, date } = body as { blockId?: string; date?: string };

    if (!blockId || !date) {
      return NextResponse.json(
        { ok: false, error: "Missing blockId or date" },
        { status: 400 }
      );
    }

    // Fetch schedule block (RLS ensures ownership)
    const { data: block, error: blockError } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("id", blockId)
      .single();

    if (blockError || !block) {
      return NextResponse.json(
        { ok: false, error: "Schedule block not found" },
        { status: 404 }
      );
    }

    // Verify block is completable
    if (!block.is_completable) {
      return NextResponse.json(
        { ok: false, error: "This schedule block is not completable" },
        { status: 400 }
      );
    }

    // Check if already completed for this date
    const { data: existingCompletion } = await supabase
      .from("schedule_block_completions")
      .select("id, xp_awarded")
      .eq("block_id", blockId)
      .eq("completed_date", date)
      .single();

    const isCompleting = !existingCompletion;
    const xpValue = block.xp_value ?? 10;

    if (isCompleting) {
      // Insert completion
      const { error: insertError } = await supabase
        .from("schedule_block_completions")
        .insert({
          block_id: blockId,
          completed_date: date,
          xp_awarded: xpValue,
        });

      if (insertError) {
        return NextResponse.json(
          { ok: false, error: insertError.message },
          { status: 500 }
        );
      }

      // Award XP to user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const newXpTotal = profile.xp_total + xpValue;
        const newLevel = getLevelFromXp(newXpTotal);
        const leveledUp = newLevel > profile.level;

        // Also update global streak
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
          })
          .eq("user_id", user.id);

        return NextResponse.json({
          ok: true,
          xpGained: xpValue,
          newLevel: leveledUp ? newLevel : undefined,
          newXpTotal,
        });
      }

      return NextResponse.json({ ok: true, xpGained: xpValue, newXpTotal: 0 });
    } else {
      // Uncompleting - delete completion and deduct XP
      const xpToDeduct = existingCompletion.xp_awarded;

      await supabase
        .from("schedule_block_completions")
        .delete()
        .eq("id", existingCompletion.id);

      // Deduct XP from profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("xp_total, level")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        const newXpTotal = Math.max(0, profile.xp_total - xpToDeduct);
        const newLevel = getLevelFromXp(newXpTotal);

        await supabase
          .from("user_profiles")
          .update({
            xp_total: newXpTotal,
            level: newLevel,
          })
          .eq("user_id", user.id);

        return NextResponse.json({
          ok: true,
          xpLost: xpToDeduct,
          newXpTotal,
          newLevel,
        });
      }

      return NextResponse.json({ ok: true, xpLost: xpToDeduct, newXpTotal: 0 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
