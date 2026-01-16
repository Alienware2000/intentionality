// =============================================================================
// SCHEDULE API ROUTE
// Handles CRUD operations for recurring schedule blocks.
// RLS policies enforce that users can only access their own schedule blocks.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import type { DayOfWeek, Priority } from "@/app/lib/types";
import { XP_VALUES } from "@/app/lib/gamification";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/schedule */
type CreateScheduleBlockBody = {
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

/** Request body for PATCH /api/schedule */
type UpdateScheduleBlockBody = {
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

/** Request body for DELETE /api/schedule */
type DeleteScheduleBlockBody = {
  blockId?: string;
};

// -----------------------------------------------------------------------------
// GET /api/schedule
// -----------------------------------------------------------------------------

/**
 * GET /api/schedule?date=YYYY-MM-DD&dayOfWeek=1-7
 *
 * Fetches all schedule blocks for the user.
 * Optionally filters by date range and day of week.
 *
 * @authentication Required
 *
 * @query {string} [date] - Filter to blocks active on this date (YYYY-MM-DD)
 * @query {string} [dayOfWeek] - Filter to blocks on this day (1-7, Mon-Sun)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {ScheduleBlock[]} blocks - Array of schedule blocks
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ supabase, request }) => {
  const params = getSearchParams(request);
  const date = params.get("date");
  const dayOfWeekParam = params.get("dayOfWeek");

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
    return ApiErrors.serverError(blocksError.message);
  }

  // Filter by day of week if provided
  let filteredBlocks = blocks ?? [];
  if (dayOfWeekParam) {
    const dayOfWeek = parseInt(dayOfWeekParam, 10) as DayOfWeek;
    filteredBlocks = filteredBlocks.filter((b) =>
      b.days_of_week.includes(dayOfWeek)
    );
  }

  return successResponse({ blocks: filteredBlocks });
});

// -----------------------------------------------------------------------------
// POST /api/schedule
// -----------------------------------------------------------------------------

/**
 * POST /api/schedule
 *
 * Creates a new schedule block.
 *
 * @authentication Required
 *
 * @body {string} title - Block title (required)
 * @body {string} start_time - Start time in HH:MM format (required)
 * @body {string} end_time - End time in HH:MM format (required)
 * @body {DayOfWeek[]} days_of_week - Days active (1-7 for Mon-Sun) (required)
 * @body {string} [color="#6366f1"] - Color hex code
 * @body {string} [location] - Location text
 * @body {string} [start_date] - Start date in YYYY-MM-DD format
 * @body {string} [end_date] - End date in YYYY-MM-DD format
 * @body {boolean} [is_completable=false] - Whether block can be marked complete
 * @body {Priority} [priority="medium"] - Priority level if completable
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {ScheduleBlock} block - The created block
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing required fields or invalid format
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateScheduleBlockBody>(request);
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
  } = body ?? {};

  // Validation
  if (!title || !title.trim()) {
    return ApiErrors.badRequest("Missing title");
  }

  if (!start_time || !end_time) {
    return ApiErrors.badRequest("Missing start_time or end_time");
  }

  if (!days_of_week || days_of_week.length === 0) {
    return ApiErrors.badRequest("Missing days_of_week");
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
    return ApiErrors.badRequest("Invalid time format. Use HH:MM");
  }

  // Validate days are 1-7
  const validDays = days_of_week.every((d) => d >= 1 && d <= 7);
  if (!validDays) {
    return ApiErrors.badRequest("days_of_week must contain values 1-7");
  }

  // Calculate XP value if completable
  const xp_value = is_completable
    ? (XP_VALUES[priority] ?? XP_VALUES.medium)
    : null;

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
    return ApiErrors.serverError(createError.message);
  }

  return successResponse({ block });
});

// -----------------------------------------------------------------------------
// PATCH /api/schedule
// -----------------------------------------------------------------------------

/**
 * PATCH /api/schedule
 *
 * Updates a schedule block's properties.
 *
 * @authentication Required
 *
 * @body {string} blockId - UUID of the block to update (required)
 * @body {string} [title] - New title
 * @body {string} [start_time] - New start time (HH:MM)
 * @body {string} [end_time] - New end time (HH:MM)
 * @body {DayOfWeek[]} [days_of_week] - New days
 * @body {string} [color] - New color
 * @body {string|null} [location] - New location
 * @body {string|null} [start_date] - New start date
 * @body {string|null} [end_date] - New end date
 * @body {boolean} [is_completable] - New completable status
 * @body {Priority} [priority] - New priority
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {ScheduleBlock} block - The updated block
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing blockId or no fields to update
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<UpdateScheduleBlockBody>(request);
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
  } = body ?? {};

  if (!blockId) {
    return ApiErrors.badRequest("Missing blockId");
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
    return ApiErrors.badRequest("No fields to update");
  }

  const { data: block, error: updateError } = await supabase
    .from("schedule_blocks")
    .update(updates)
    .eq("id", blockId)
    .select()
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ block });
});

// -----------------------------------------------------------------------------
// DELETE /api/schedule
// -----------------------------------------------------------------------------

/**
 * DELETE /api/schedule
 *
 * Deletes a schedule block.
 *
 * @authentication Required
 *
 * @body {string} blockId - UUID of the block to delete (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing blockId
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<DeleteScheduleBlockBody>(request);
  const blockId = body?.blockId;

  if (!blockId) {
    return ApiErrors.badRequest("Missing blockId");
  }

  const { error: deleteError } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("id", blockId);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  return NextResponse.json({ ok: true });
});
