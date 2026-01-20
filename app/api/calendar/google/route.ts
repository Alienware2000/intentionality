// =============================================================================
// GOOGLE CALENDAR API ROUTE
// Manages Google Calendar OAuth connection status and disconnect.
// =============================================================================

import { NextResponse } from "next/server";
import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// GET /api/calendar/google
// Check connection status
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ supabase }) => {
  const { data: connection, error } = await supabase
    .from("google_calendar_connections")
    .select("id, email, selected_calendars, import_as, target_quest_id, last_synced_at, created_at")
    .single();

  if (error && error.code !== "PGRST116") {
    return ApiErrors.serverError(error.message);
  }

  // Check if Google OAuth is configured
  const isConfigured = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );

  return successResponse({
    connected: !!connection,
    connection: connection ?? null,
    isConfigured,
  });
});

// -----------------------------------------------------------------------------
// DELETE /api/calendar/google
// Disconnect Google Calendar
// -----------------------------------------------------------------------------

export const DELETE = withAuth(async ({ user, supabase }) => {
  // Get all imported events to find their created items
  const { data: imports } = await supabase
    .from("imported_events")
    .select("created_as, created_id")
    .eq("source_type", "google")
    .eq("user_id", user.id);

  if (imports && imports.length > 0) {
    // Separate tasks and schedule blocks
    const taskIds = imports
      .filter((i) => i.created_as === "task")
      .map((i) => i.created_id);
    const blockIds = imports
      .filter((i) => i.created_as === "schedule_block")
      .map((i) => i.created_id);

    // Delete tasks created from Google Calendar
    if (taskIds.length > 0) {
      await supabase.from("tasks").delete().in("id", taskIds);
    }

    // Delete schedule blocks created from Google Calendar
    if (blockIds.length > 0) {
      await supabase.from("schedule_blocks").delete().in("id", blockIds);
    }
  }

  // Delete imported events tracking
  await supabase
    .from("imported_events")
    .delete()
    .eq("source_type", "google")
    .eq("user_id", user.id);

  // Delete connection
  const { error } = await supabase
    .from("google_calendar_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return NextResponse.json({ ok: true });
});
