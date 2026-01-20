// =============================================================================
// GOOGLE CALENDAR SYNC API
// Syncs events from Google Calendar to tasks or schedule blocks.
// =============================================================================

import {
  withAuth,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { parseISOToTimezone } from "@/app/lib/date-utils";
import type { ISODateString } from "@/app/lib/types";

// Google Calendar API
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GoogleEvent = {
  id: string;
  summary?: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  status: string;
};

type SyncResult = {
  tasksCreated: number;
  tasksUpdated: number;
  scheduleBlocksCreated: number;
  scheduleBlocksUpdated: number;
  eventsProcessed: number;
  calendarsProcessed: number;
  errors: string[];
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

  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

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

    if (!response.ok) return null;

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

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
// POST /api/calendar/google/sync
// Sync events from selected calendars
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  // Parse timezone from request body (defaults to UTC if not provided)
  const body = await request.json().catch(() => ({}));
  const userTimezone = body.timezone || "UTC";

  // Get connection
  const { data: connection, error: connError } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .single();

  if (connError || !connection) {
    return ApiErrors.notFound("No Google Calendar connection found");
  }

  if (!connection.selected_calendars?.length) {
    return ApiErrors.badRequest("No calendars selected for sync");
  }

  // Get valid access token
  const accessToken = await getValidAccessToken(connection, supabase);
  if (!accessToken) {
    return ApiErrors.badRequest("Failed to refresh access token. Please reconnect Google Calendar.");
  }

  const result: SyncResult = {
    tasksCreated: 0,
    tasksUpdated: 0,
    scheduleBlocksCreated: 0,
    scheduleBlocksUpdated: 0,
    eventsProcessed: 0,
    calendarsProcessed: 0,
    errors: [],
  };

  // Get existing imported events
  const { data: existingImports } = await supabase
    .from("imported_events")
    .select("*")
    .eq("source_type", "google")
    .eq("user_id", user.id);

  const importMap = new Map(
    (existingImports ?? []).map((imp) => [imp.external_uid, imp])
  );

  // Get or create default quest for task imports
  let targetQuestId = connection.target_quest_id;
  if (!targetQuestId && (connection.import_as === "tasks" || connection.import_as === "smart")) {
    const { data: quests } = await supabase
      .from("quests")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1);

    targetQuestId = quests?.[0]?.id;

    // Create a default quest if none exists
    if (!targetQuestId) {
      const { data: newQuest } = await supabase
        .from("quests")
        .insert({
          user_id: user.id,
          title: "Calendar Imports",
        })
        .select("id")
        .single();
      targetQuestId = newQuest?.id;
    }
  }

  // Time range: past week to 3 months ahead
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 7);
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 3);

  // Fetch events from each selected calendar
  for (const calendarId of connection.selected_calendars) {
    try {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });

      const response = await fetch(
        `${GOOGLE_EVENTS_URL}/${encodeURIComponent(calendarId)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        result.errors.push(`Failed to fetch calendar: ${calendarId}`);
        continue;
      }

      const data = await response.json();
      const events: GoogleEvent[] = data.items ?? [];

      result.calendarsProcessed++;

      for (const event of events) {
        if (event.status === "cancelled" || !event.summary) continue;

        result.eventsProcessed++;

        try {
          // Parse event times - use parseISOToLocal to correctly handle timezone offsets
          const isAllDay = !!event.start.date;
          let startDate: string;
          let startTime: string | undefined;
          let endTime: string | undefined;

          if (isAllDay) {
            startDate = event.start.date!;
          } else {
            const startParsed = parseISOToTimezone(event.start.dateTime!, userTimezone);
            startDate = startParsed.date;
            startTime = startParsed.time;
            if (event.end.dateTime) {
              endTime = parseISOToTimezone(event.end.dateTime, userTimezone).time;
            }
          }

          // Determine import type
          const importAs = connection.import_as === "smart"
            ? (isAllDay ? "task" : "schedule")
            : connection.import_as;

          // Generate unique ID
          const externalUid = `gcal:${calendarId}:${event.id}`;
          const existing = importMap.get(externalUid);

          // Simple hash for change detection
          const eventHash = `${event.summary}|${startDate}|${startTime ?? ""}`;

          if (existing) {
            // Check if changed
            if (existing.event_hash === eventHash) continue;

            // Update existing item
            if (existing.created_as === "task") {
              await supabase
                .from("tasks")
                .update({
                  title: event.summary,
                  due_date: startDate,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.created_id);
              result.tasksUpdated++;
            } else {
              await supabase
                .from("schedule_blocks")
                .update({
                  title: event.summary,
                  start_time: startTime ?? "09:00",
                  end_time: endTime ?? "10:00",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.created_id);
              result.scheduleBlocksUpdated++;
            }

            // Update hash
            await supabase
              .from("imported_events")
              .update({ event_hash: eventHash })
              .eq("id", existing.id);
          } else {
            // Create new item
            if (importAs === "task" || importAs === "tasks") {
              const { data: task, error: taskError } = await supabase
                .from("tasks")
                .insert({
                  quest_id: targetQuestId,
                  title: event.summary,
                  due_date: startDate,
                  priority: "medium",
                  completed: false,
                  xp_value: 10,
                })
                .select("id")
                .single();

              if (taskError) {
                result.errors.push(`Failed to create task: ${event.summary}`);
                continue;
              }

              await supabase.from("imported_events").insert({
                user_id: user.id,
                source_type: "google",
                source_id: connection.id,
                external_uid: externalUid,
                created_as: "task",
                created_id: task.id,
                event_hash: eventHash,
              });

              result.tasksCreated++;
            } else {
              // Create schedule block
              const dayOfWeek = getDayOfWeek(startDate as ISODateString);
              const blockStartTime = startTime ?? "09:00";
              let blockEndTime = endTime ?? "10:00";

              // Ensure end_time > start_time (required by DB constraint)
              if (blockEndTime <= blockStartTime) {
                const [h, m] = blockStartTime.split(":").map(Number);
                const endHour = Math.min(h + 1, 23);
                blockEndTime = `${endHour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
              }

              const { data: block, error: blockError } = await supabase
                .from("schedule_blocks")
                .insert({
                  user_id: user.id,
                  title: event.summary,
                  days_of_week: [dayOfWeek],
                  start_time: blockStartTime,
                  end_time: blockEndTime,
                  start_date: startDate,
                  end_date: startDate, // Single day event
                })
                .select("id")
                .single();

              if (blockError) {
                result.errors.push(`Failed to create schedule block: ${event.summary}`);
                continue;
              }

              await supabase.from("imported_events").insert({
                user_id: user.id,
                source_type: "google",
                source_id: connection.id,
                external_uid: externalUid,
                created_as: "schedule_block",
                created_id: block.id,
                event_hash: eventHash,
              });

              result.scheduleBlocksCreated++;
            }
          }
        } catch {
          result.errors.push(`Error processing: ${event.summary}`);
        }
      }
    } catch {
      result.errors.push(`Failed to process calendar: ${calendarId}`);
    }
  }

  // Update last synced
  await supabase
    .from("google_calendar_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return successResponse(result);
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getDayOfWeek(dateISO: ISODateString): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const jsDay = dt.getDay();
  return jsDay === 0 ? 7 : jsDay;
}
