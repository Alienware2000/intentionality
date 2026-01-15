// =============================================================================
// QUESTS API ROUTE
// Handles CRUD operations for quests.
// Uses Supabase for both auth and database.
// RLS policies enforce that users can only access their own quests.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

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
