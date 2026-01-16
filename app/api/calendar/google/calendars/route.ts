// =============================================================================
// GOOGLE CALENDAR CALENDARS API
// Lists and manages calendar selection for syncing.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";

// Google Calendar API
const GOOGLE_CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GoogleCalendar = {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
};

type UpdateBody = {
  selectedCalendars?: string[];
  importAs?: "tasks" | "schedule" | "smart";
  targetQuestId?: string | null;
};

// -----------------------------------------------------------------------------
// Helper: Refresh token if expired
// -----------------------------------------------------------------------------

async function getValidAccessToken(
  connection: { access_token: string; refresh_token: string; token_expires_at: string; id: string },
  supabase: Awaited<ReturnType<typeof import("@/app/lib/supabase/server").createSupabaseServerClient>>
): Promise<string | null> {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();

  // Token still valid (with 5 minute buffer)
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  // Need to refresh
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !connection.refresh_token) {
    return null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      return null;
    }

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Update tokens in database
    await supabase
      .from("google_calendar_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return tokens.access_token;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// GET /api/calendar/google/calendars
// List available calendars
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ supabase }) => {
  // Get connection
  const { data: connection, error: connError } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .single();

  if (connError || !connection) {
    return ApiErrors.notFound("No Google Calendar connection found");
  }

  // Get valid access token
  const accessToken = await getValidAccessToken(connection, supabase);
  if (!accessToken) {
    return ApiErrors.badRequest("Failed to refresh access token. Please reconnect Google Calendar.");
  }

  // Fetch calendars from Google
  try {
    const response = await fetch(GOOGLE_CALENDAR_LIST_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return ApiErrors.badRequest("Google access expired. Please reconnect.");
      }
      return ApiErrors.serverError("Failed to fetch calendars from Google");
    }

    const data = await response.json();
    const calendars: GoogleCalendar[] = (data.items ?? []).map((cal: GoogleCalendar) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary,
      backgroundColor: cal.backgroundColor,
    }));

    return successResponse({
      calendars,
      selectedCalendars: connection.selected_calendars ?? [],
      importAs: connection.import_as,
      targetQuestId: connection.target_quest_id,
    });
  } catch (error) {
    return ApiErrors.serverError("Failed to fetch calendars");
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/calendar/google/calendars
// Update calendar selection and import settings
// -----------------------------------------------------------------------------

export const PATCH = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<UpdateBody>(request);
  const { selectedCalendars, importAs, targetQuestId } = body ?? {};

  // Get connection
  const { data: connection, error: connError } = await supabase
    .from("google_calendar_connections")
    .select("id")
    .single();

  if (connError || !connection) {
    return ApiErrors.notFound("No Google Calendar connection found");
  }

  // Build update object
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (selectedCalendars !== undefined) updates.selected_calendars = selectedCalendars;
  if (importAs !== undefined) updates.import_as = importAs;
  if (targetQuestId !== undefined) updates.target_quest_id = targetQuestId;

  const { error } = await supabase
    .from("google_calendar_connections")
    .update(updates)
    .eq("id", connection.id);

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({});
});
