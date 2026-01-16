// =============================================================================
// SCHEDULE API ROUTE
// Handles CRUD operations for recurring schedule blocks.
// Uses Supabase for both auth and database.
// RLS policies enforce that users can only access their own schedule blocks.
// =============================================================================

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { DayOfWeek, Priority } from "@/app/lib/types";
import { XP_VALUES } from "@/app/lib/gamification";

/**
 * GET /api/schedule?date=YYYY-MM-DD (optional)
 *
 * Fetches all schedule blocks for the user.
 * If date is provided, only returns blocks active on that date.
 *
 * Query params:
 * - date: string (optional) - Filter to blocks active on this date
 * - dayOfWeek: number (optional) - Filter to blocks on this day (1-7)
 *
 * RLS ensures only the user's own schedule blocks are returned.
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
  const dayOfWeekParam = url.searchParams.get("dayOfWeek");

  let query = supabase
    .from("schedule_blocks")
    .select("*")
    .order("start_time", { ascending: true });

  // If date provided, filter by date range
  if (date) {
    query = query
      .or(`start_date.is.null,start_date.lte.${date}`)
      .or(`end_date.is.null,end_date.gte.${date}`);
  }

  const { data: blocks, error: blocksError } = await query;

  if (blocksError) {
    return NextResponse.json(
      { ok: false, error: blocksError.message },
      { status: 500 }
    );
  }

  // Filter by day of week if provided
  let filteredBlocks = blocks ?? [];
  if (dayOfWeekParam) {
    const dayOfWeek = parseInt(dayOfWeekParam, 10) as DayOfWeek;
    filteredBlocks = filteredBlocks.filter((b) =>
      b.days_of_week.includes(dayOfWeek)
    );
  }

  return NextResponse.json({ ok: true, blocks: filteredBlocks });
}

/**
 * POST /api/schedule
 *
 * Creates a new schedule block.
 *
 * Request body:
 * - title: string (required)
 * - start_time: string (required) - HH:MM format
 * - end_time: string (required) - HH:MM format
 * - days_of_week: number[] (required) - Array of 1-7
 * - color: string (optional, default: '#6366f1')
 * - location: string (optional)
 * - start_date: string (optional) - YYYY-MM-DD
 * - end_date: string (optional) - YYYY-MM-DD
 * - is_completable: boolean (optional, default: false)
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
    const {
      title,
      start_time,
      end_time,
      days_of_week,
      color = "#6366f1",
      location,
      start_date,
      end_date,
      is_completable = false,
      priority = "medium",
    } = body as {
      title?: string;
      start_time?: string;
      end_time?: string;
      days_of_week?: DayOfWeek[];
      color?: string;
      location?: string;
      start_date?: string;
      end_date?: string;
      is_completable?: boolean;
      priority?: Priority;
    };

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing title" },
        { status: 400 }
      );
    }

    if (!start_time || !end_time) {
      return NextResponse.json(
        { ok: false, error: "Missing start_time or end_time" },
        { status: 400 }
      );
    }

    if (!days_of_week || days_of_week.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Missing days_of_week" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json(
        { ok: false, error: "Invalid time format. Use HH:MM" },
        { status: 400 }
      );
    }

    // Validate days are 1-7
    const validDays = days_of_week.every((d) => d >= 1 && d <= 7);
    if (!validDays) {
      return NextResponse.json(
        { ok: false, error: "days_of_week must contain values 1-7" },
        { status: 400 }
      );
    }

    // Calculate XP value if completable
    const xp_value = is_completable ? (XP_VALUES[priority] ?? XP_VALUES.medium) : null;

    const { data: block, error: createError } = await supabase
      .from("schedule_blocks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        start_time,
        end_time,
        days_of_week,
        color,
        location: location?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        is_completable,
        priority: is_completable ? priority : null,
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

    return NextResponse.json({ ok: true, block });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/schedule
 *
 * Updates a schedule block.
 *
 * Request body:
 * - blockId: string (required)
 * - title?: string
 * - start_time?: string
 * - end_time?: string
 * - days_of_week?: number[]
 * - color?: string
 * - location?: string
 * - start_date?: string | null
 * - end_date?: string | null
 * - is_completable?: boolean
 * - priority?: 'low' | 'medium' | 'high'
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
    const {
      blockId,
      title,
      start_time,
      end_time,
      days_of_week,
      color,
      location,
      start_date,
      end_date,
      is_completable,
      priority,
    } = body as {
      blockId?: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      days_of_week?: DayOfWeek[];
      color?: string;
      location?: string;
      start_date?: string | null;
      end_date?: string | null;
      is_completable?: boolean;
      priority?: Priority;
    };

    if (!blockId) {
      return NextResponse.json(
        { ok: false, error: "Missing blockId" },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (title) updates.title = title.trim();
    if (start_time) updates.start_time = start_time;
    if (end_time) updates.end_time = end_time;
    if (days_of_week) updates.days_of_week = days_of_week;
    if (color) updates.color = color;
    if (location !== undefined) updates.location = location?.trim() || null;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (is_completable !== undefined) {
      updates.is_completable = is_completable;
      if (!is_completable) {
        updates.priority = null;
        updates.xp_value = null;
      }
    }
    if (priority !== undefined) {
      updates.priority = priority;
      updates.xp_value = XP_VALUES[priority] ?? XP_VALUES.medium;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: block, error: updateError } = await supabase
      .from("schedule_blocks")
      .update(updates)
      .eq("id", blockId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, block });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/schedule
 *
 * Deletes a schedule block.
 *
 * Request body:
 * - blockId: string (required)
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
    const { blockId } = body as { blockId?: string };

    if (!blockId) {
      return NextResponse.json(
        { ok: false, error: "Missing blockId" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("schedule_blocks")
      .delete()
      .eq("id", blockId);

    if (deleteError) {
      return NextResponse.json(
        { ok: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
