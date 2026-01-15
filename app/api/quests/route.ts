// =============================================================================
// QUESTS API ROUTE
// Handles CRUD operations for quests.
// Uses Supabase for both auth and database.
// RLS policies enforce that users can only access their own quests.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { getLevelFromXp } from "@/app/lib/gamification";

/**
 * GET /api/quests
 *
 * Fetches all quests for the authenticated user.
 * If the user has no quests, creates a default "General Tasks" quest.
 *
 * RLS ensures only the user's own quests are returned.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();

  // Verify authentication using getUser() (validates JWT with auth server)
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

  // Fetch user's quests (RLS automatically filters by user_id)
  const { data: quests, error: fetchError } = await supabase
    .from("quests")
    .select("*")
    .order("created_at", { ascending: true });

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: fetchError.message },
      { status: 500 }
    );
  }

  // Create default quest if user has none
  if (!quests || quests.length === 0) {
    const { data: newQuest, error: createError } = await supabase
      .from("quests")
      .insert({ title: "General Tasks", user_id: user.id })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { ok: false, error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, quests: [newQuest] });
  }

  return NextResponse.json({ ok: true, quests });
}

/**
 * POST /api/quests
 *
 * Creates a new quest for the authenticated user.
 *
 * Request body:
 * - title: string (required) - The quest title
 *
 * RLS policy ensures the quest is created with the correct user_id.
 */
export async function POST(req: Request) {
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

  // Parse request body
  const body = await req.json();
  const { title } = body as { title?: string };

  if (!title || !title.trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing title" },
      { status: 400 }
    );
  }

  // Create the quest (RLS enforces user ownership)
  const { data: quest, error: createError } = await supabase
    .from("quests")
    .insert({ title: title.trim(), user_id: user.id })
    .select()
    .single();

  if (createError) {
    return NextResponse.json(
      { ok: false, error: createError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, quest });
}

/**
 * PATCH /api/quests
 *
 * Updates a quest's title.
 *
 * Request body:
 * - questId: string (required) - UUID of the quest
 * - title: string (required) - New title
 *
 * RLS ensures the quest belongs to the user.
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
    const { questId, title } = body as { questId?: string; title?: string };

    if (!questId) {
      return NextResponse.json(
        { ok: false, error: "Missing questId" },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing title" },
        { status: 400 }
      );
    }

    const { data: quest, error: updateError } = await supabase
      .from("quests")
      .update({ title: title.trim() })
      .eq("id", questId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, quest });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/quests
 *
 * Deletes a quest and all its tasks (via cascade).
 *
 * Request body:
 * - questId: string (required) - UUID of the quest to delete
 *
 * Will fail if this is the user's only quest.
 * XP from completed tasks is revoked from user profile.
 * RLS ensures the quest belongs to the user.
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
    const { questId } = body as { questId?: string };

    if (!questId) {
      return NextResponse.json(
        { ok: false, error: "Missing questId" },
        { status: 400 }
      );
    }

    // Check if this is the user's only quest
    const { count, error: countError } = await supabase
      .from("quests")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json(
        { ok: false, error: countError.message },
        { status: 500 }
      );
    }

    if (count !== null && count <= 1) {
      return NextResponse.json(
        { ok: false, error: "Cannot delete your only quest" },
        { status: 400 }
      );
    }

    // Sum XP from completed tasks in this quest
    const { data: completedTasks } = await supabase
      .from("tasks")
      .select("xp_value")
      .eq("quest_id", questId)
      .eq("completed", true);

    const xpToDeduct = completedTasks?.reduce(
      (sum, t) => sum + (t.xp_value ?? 10),
      0
    ) ?? 0;

    // Delete the quest (tasks cascade due to FK constraint)
    const { error: deleteError } = await supabase
      .from("quests")
      .delete()
      .eq("id", questId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      );
    }

    // Deduct XP from completed tasks
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

    return NextResponse.json({ ok: true, xpDeducted: xpToDeduct, newXpTotal, newLevel });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
