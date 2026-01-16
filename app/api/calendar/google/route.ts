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
  // Delete imported events from Google
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
