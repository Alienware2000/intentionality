// =============================================================================
// SCHEDULE BLOCK COMPLETE API ROUTE
// Toggles the completion status of a schedule block for a specific date.
// Awards XP when completing, deducts when uncompleting.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLevelFromXp, getLocalDateString } from "@/app/lib/gamification";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/schedule/complete */
type CompleteScheduleBlockBody = {
  blockId?: string;
  date?: string;
};

// -----------------------------------------------------------------------------
// POST /api/schedule/complete
// -----------------------------------------------------------------------------

/**
 * POST /api/schedule/complete
 *
 * Toggles schedule block completion for a specific date.
 * When completing: inserts completion record, awards XP, updates streak.
 * When uncompleting: removes completion, deducts XP.
 *
 * @authentication Required
 *
 * @body {string} blockId - UUID of the schedule block (required)
 * @body {string} date - Date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {number} [xpGained] - XP gained (when completing)
 * @returns {number} [xpLost] - XP lost (when uncompleting)
 * @returns {number} [newLevel] - New level (if leveled up)
 * @returns {number} newXpTotal - Total XP after toggle
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing blockId/date or block not completable
 * @throws {404} Schedule block not found
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CompleteScheduleBlockBody>(request);
  const { blockId, date } = body ?? {};

  if (!blockId || !date) {
    return ApiErrors.badRequest("Missing blockId or date");
  }

  // Fetch schedule block (RLS ensures ownership)
  const { data: block, error: blockError } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("id", blockId)
    .single();

  if (blockError || !block) {
    return ApiErrors.notFound("Schedule block not found");
  }

  // Verify block is completable
  if (!block.is_completable) {
    return ApiErrors.badRequest("This schedule block is not completable");
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
    // --- COMPLETING BLOCK ---

    // Insert completion record
    const { error: insertError } = await supabase
      .from("schedule_block_completions")
      .insert({
        block_id: blockId,
        completed_date: date,
        xp_awarded: xpValue,
      });

    if (insertError) {
      return ApiErrors.serverError(insertError.message);
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

        globalStreak =
          profile.last_active_date === yesterdayStr
            ? profile.current_streak + 1
            : 1;

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
    // --- UNCOMPLETING BLOCK ---

    const xpToDeduct = existingCompletion.xp_awarded;

    // Delete completion record
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
});
