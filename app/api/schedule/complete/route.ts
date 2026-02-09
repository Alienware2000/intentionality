// =============================================================================
// SCHEDULE BLOCK COMPLETE API ROUTE
// Toggles the completion status of a schedule block for a specific date.
// Awards XP when completing, deducts when uncompleting.
//
// XP TRANSPARENCY:
// - xpGained = base block XP only (no hidden multipliers)
// - challengeXp = XP from any challenges completed (celebrated separately)
// - achievementXp = XP from any achievements unlocked (celebrated separately)
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  ApiErrors,
} from "@/app/lib/auth-middleware";
import { getLevelFromXpV2 } from "@/app/lib/gamification";
import { awardXp } from "@/app/lib/gamification-actions";

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

    // Use gamification system to award XP (handles challenges, achievements, etc.)
    const result = await awardXp({
      supabase,
      userId: user.id,
      baseXp: xpValue,
      actionType: "schedule_block",
    });

    // Insert completion record with actual XP awarded
    const { error: insertError } = await supabase
      .from("schedule_block_completions")
      .insert({
        block_id: blockId,
        completed_date: date,
        xp_awarded: result.actionTotalXp, // Store for accurate deduction
      });

    if (insertError) {
      return ApiErrors.serverError(insertError.message);
    }

    // XP TRANSPARENCY: Return separate XP values for clear celebration
    return NextResponse.json({
      ok: true,
      // Base block XP (no hidden multipliers)
      xpGained: result.actionTotalXp,
      // Challenge XP (celebrated with toast)
      challengeXp: result.bonusXp.challengeXp ?? 0,
      // Achievement XP (celebrated with modal)
      achievementXp: result.bonusXp.achievementXp ?? 0,
      leveledUp: result.leveledUp,
      newLevel: result.leveledUp ? result.newLevel : undefined,
      newXpTotal: result.newXpTotal,
      achievementsUnlocked: result.achievementsUnlocked,
      challengesCompleted: result.challengesCompleted,
    });
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
      const newLevel = getLevelFromXpV2(newXpTotal);

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

    return NextResponse.json({
      ok: true,
      xpLost: xpToDeduct,
      newXpTotal: 0,
      newLevel: undefined,
    });
  }
});
