// =============================================================================
// CALENDAR UPLOAD API
// One-time import from ICS file upload.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { parseICS, hashEvent, type ParsedEvent } from "@/app/lib/ics-parser";
import type { ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type UploadBody = {
  icsContent?: string;
  importAs?: "tasks" | "schedule" | "smart";
  targetQuestId?: string;
};

type UploadResult = {
  tasksCreated: number;
  scheduleBlocksCreated: number;
  eventsProcessed: number;
  eventsSkipped: number;
  calendarName?: string;
  errors: string[];
};

// -----------------------------------------------------------------------------
// POST /api/calendar/upload
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<UploadBody>(request);
  const { icsContent, importAs = "smart", targetQuestId } = body ?? {};

  if (!icsContent) {
    return ApiErrors.badRequest("Missing icsContent");
  }

  // Parse the ICS content
  const parseResult = parseICS(icsContent);
  if (!parseResult.ok) {
    return ApiErrors.badRequest(parseResult.error);
  }

  const result: UploadResult = {
    tasksCreated: 0,
    scheduleBlocksCreated: 0,
    eventsProcessed: parseResult.events.length,
    eventsSkipped: 0,
    calendarName: parseResult.calendarName,
    errors: [],
  };

  // Get or create default quest for task imports
  let questId = targetQuestId;
  if (!questId && (importAs === "tasks" || importAs === "smart")) {
    const { data: quests } = await supabase
      .from("quests")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1);

    questId = quests?.[0]?.id;

    // Create a default quest if none exists
    if (!questId) {
      const { data: newQuest } = await supabase
        .from("quests")
        .insert({
          user_id: user.id,
          title: "Calendar Imports",
        })
        .select("id")
        .single();
      questId = newQuest?.id;
    }
  }

  // Get existing imported events to avoid duplicates
  const { data: existingImports } = await supabase
    .from("imported_events")
    .select("external_uid")
    .eq("source_type", "ics_upload")
    .eq("user_id", user.id);

  const existingUids = new Set((existingImports ?? []).map((imp) => imp.external_uid));

  // Process events
  for (const event of parseResult.events) {
    try {
      // Skip if already imported
      if (existingUids.has(event.uid)) {
        result.eventsSkipped++;
        continue;
      }

      // Skip events in the past (more than 7 days ago)
      const eventDate = new Date(event.startDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (eventDate < weekAgo) {
        result.eventsSkipped++;
        continue;
      }

      // Determine how to import this event
      const importType = determineImportType(event, importAs);
      const eventHash = hashEvent(event);

      if (importType === "task") {
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .insert({
            quest_id: questId,
            title: event.summary,
            due_date: event.startDate,
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

        // Track import
        await supabase.from("imported_events").insert({
          user_id: user.id,
          source_type: "ics_upload",
          source_id: null,
          external_uid: event.uid,
          created_as: "task",
          created_id: task.id,
          event_hash: eventHash,
        });

        result.tasksCreated++;
      } else {
        // Create schedule block
        const dayOfWeek = getDayOfWeek(event.startDate);
        const startTime = event.startTime ?? "09:00";
        let endTime = event.endTime ?? "10:00";

        // Ensure end_time > start_time (required by DB constraint)
        if (endTime <= startTime) {
          const [h, m] = startTime.split(":").map(Number);
          const endHour = Math.min(h + 1, 23);
          endTime = `${endHour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        }

        const { data: block, error: blockError } = await supabase
          .from("schedule_blocks")
          .insert({
            user_id: user.id,
            title: event.summary,
            days_of_week: [dayOfWeek],
            start_time: startTime,
            end_time: endTime,
            start_date: event.startDate,
            end_date: event.startDate, // Single day event
          })
          .select("id")
          .single();

        if (blockError) {
          result.errors.push(`Failed to create schedule block: ${event.summary}`);
          continue;
        }

        // Track import
        await supabase.from("imported_events").insert({
          user_id: user.id,
          source_type: "ics_upload",
          source_id: null,
          external_uid: event.uid,
          created_as: "schedule_block",
          created_id: block.id,
          event_hash: eventHash,
        });

        result.scheduleBlocksCreated++;
      }
    } catch (e) {
      result.errors.push(`Error processing event: ${event.summary}`);
    }
  }

  return successResponse(result);
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function determineImportType(
  event: ParsedEvent,
  preference: string
): "task" | "schedule" {
  if (preference === "tasks") return "task";
  if (preference === "schedule") return "schedule";

  // Smart mode: all-day = task, timed = schedule
  return event.isAllDay ? "task" : "schedule";
}

function getDayOfWeek(dateISO: ISODateString): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const jsDay = dt.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Convert to 1=Mon, ..., 7=Sun
  return jsDay === 0 ? 7 : jsDay;
}
