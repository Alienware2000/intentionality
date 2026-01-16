// =============================================================================
// BRAIN DUMP API ROUTE
// Handles CRUD operations for quick thought capture.
// RLS policies enforce that users can only access their own entries.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  parseJsonBody,
  getSearchParams,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

/** Request body for POST /api/brain-dump (capture) */
type CaptureBody = {
  content?: string;
};

/** Request body for DELETE /api/brain-dump */
type DeleteBody = {
  entryId?: string;
};

/** Request body for PATCH /api/brain-dump (mark processed) */
type UpdateBody = {
  entryId?: string;
  processed?: boolean;
};

// -----------------------------------------------------------------------------
// GET /api/brain-dump
// -----------------------------------------------------------------------------

/**
 * GET /api/brain-dump?processed=true|false
 *
 * Fetches brain dump entries for the user.
 * Default: returns unprocessed entries (inbox view).
 *
 * @authentication Required
 *
 * @query {string} [processed] - Filter by processed status
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {BrainDumpEntry[]} entries - Array of brain dump entries
 *
 * @throws {401} Not authenticated
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ supabase, request }) => {
  const params = getSearchParams(request);
  const processedParam = params.get("processed");

  let query = supabase
    .from("brain_dump_entries")
    .select("*")
    .order("created_at", { ascending: false });

  // Filter by processed status if specified
  if (processedParam === "true") {
    query = query.eq("processed", true);
  } else if (processedParam === "false" || processedParam === null) {
    // Default to unprocessed (inbox view)
    query = query.eq("processed", false);
  }

  const { data: entries, error } = await query;

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ entries: entries ?? [] });
});

// -----------------------------------------------------------------------------
// POST /api/brain-dump
// -----------------------------------------------------------------------------

/**
 * POST /api/brain-dump
 *
 * Captures a new brain dump entry.
 *
 * @authentication Required
 *
 * @body {string} content - The thought/idea to capture (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {BrainDumpEntry} entry - The created entry
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing content
 * @throws {500} Database error
 */
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CaptureBody>(request);
  const { content } = body ?? {};

  if (!content || !content.trim()) {
    return ApiErrors.badRequest("Missing content");
  }

  const { data: entry, error: createError } = await supabase
    .from("brain_dump_entries")
    .insert({
      user_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (createError) {
    return ApiErrors.serverError(createError.message);
  }

  return successResponse({ entry });
});

// -----------------------------------------------------------------------------
// PATCH /api/brain-dump
// -----------------------------------------------------------------------------

/**
 * PATCH /api/brain-dump
 *
 * Updates a brain dump entry (mark as processed).
 *
 * @authentication Required
 *
 * @body {string} entryId - UUID of the entry (required)
 * @body {boolean} processed - New processed status
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {BrainDumpEntry} entry - The updated entry
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing entryId
 * @throws {500} Database error
 */
export const PATCH = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<UpdateBody>(request);
  const { entryId, processed } = body ?? {};

  if (!entryId) {
    return ApiErrors.badRequest("Missing entryId");
  }

  const updates: Record<string, unknown> = {};
  if (typeof processed === "boolean") {
    updates.processed = processed;
    updates.processed_at = processed ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return ApiErrors.badRequest("No fields to update");
  }

  const { data: entry, error: updateError } = await supabase
    .from("brain_dump_entries")
    .update(updates)
    .eq("id", entryId)
    .select()
    .single();

  if (updateError) {
    return ApiErrors.serverError(updateError.message);
  }

  return successResponse({ entry });
});

// -----------------------------------------------------------------------------
// DELETE /api/brain-dump
// -----------------------------------------------------------------------------

/**
 * DELETE /api/brain-dump
 *
 * Deletes a brain dump entry.
 *
 * @authentication Required
 *
 * @body {string} entryId - UUID of the entry to delete (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing entryId
 * @throws {500} Database error
 */
export const DELETE = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<DeleteBody>(request);
  const entryId = body?.entryId;

  if (!entryId) {
    return ApiErrors.badRequest("Missing entryId");
  }

  const { error: deleteError } = await supabase
    .from("brain_dump_entries")
    .delete()
    .eq("id", entryId);

  if (deleteError) {
    return ApiErrors.serverError(deleteError.message);
  }

  return NextResponse.json({ ok: true });
});
