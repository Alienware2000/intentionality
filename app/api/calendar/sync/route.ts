// =============================================================================
// CALENDAR SYNC API
// Syncs events from calendar subscriptions, creating tasks or schedule blocks.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { fetchAndParseICS, hashEvent, type ParsedEvent } from "@/app/lib/ics-parser";
import type { ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SyncBody = {
  subscriptionId?: string;
};

type SyncResult = {
  tasksCreated: number;
  tasksUpdated: number;
  tasksDeleted: number;
  scheduleBlocksCreated: number;
  scheduleBlocksUpdated: number;
  scheduleBlocksDeleted: number;
  eventsProcessed: number;
  errors: string[];
};

// -----------------------------------------------------------------------------
// POST /api/calendar/sync
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<SyncBody>(request);
  const subscriptionId = body?.subscriptionId;

  if (!subscriptionId) {
    return ApiErrors.badRequest("Missing subscriptionId");
  }

  // Get subscription
  const { data: subscription, error: subError } = await supabase
    .from("calendar_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (subError || !subscription) {
    return ApiErrors.notFound("Subscription not found");
  }

  // Fetch and parse the feed
  const parseResult = await fetchAndParseICS(subscription.feed_url);
  if (!parseResult.ok) {
    // Update subscription with error
    await supabase
      .from("calendar_subscriptions")
      .update({ sync_error: parseResult.error, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId);

    return ApiErrors.badRequest(parseResult.error);
  }

  const result: SyncResult = {
    tasksCreated: 0,
    tasksUpdated: 0,
    tasksDeleted: 0,
    scheduleBlocksCreated: 0,
    scheduleBlocksUpdated: 0,
    scheduleBlocksDeleted: 0,
    eventsProcessed: parseResult.events.length,
    errors: [],
  };

  // Track which UIDs we see in this sync (for deletion detection)
  const seenUids = new Set<string>();

  // Get existing imported events for this subscription
  const { data: existingImports } = await supabase
    .from("imported_events")
    .select("*")
    .eq("source_type", "ics_subscription")
    .eq("source_id", subscriptionId);

  const importMap = new Map(
    (existingImports ?? []).map((imp) => [imp.external_uid, imp])
  );

  // Get or create default quest for task imports
  let targetQuestId = subscription.target_quest_id;
  if (!targetQuestId && (subscription.import_as === "tasks" || subscription.import_as === "smart")) {
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

  // Process events
  for (const event of parseResult.events) {
    try {
      // Track this UID as seen (for deletion detection)
      seenUids.add(event.uid);

      // Skip events in the past (more than 7 days ago)
      const eventDate = new Date(event.startDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (eventDate < weekAgo) continue;

      // Determine how to import this event
      const importAs = determineImportType(event, subscription.import_as);
      const eventHash = hashEvent(event);
      const existing = importMap.get(event.uid);

      if (existing) {
        // Check if event has changed
        if (existing.event_hash === eventHash) {
          continue; // No changes
        }

        // Update existing item
        if (existing.created_as === "task") {
          await supabase
            .from("tasks")
            .update({
              title: event.summary,
              due_date: event.startDate,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.created_id);
          result.tasksUpdated++;
        } else {
          await supabase
            .from("schedule_blocks")
            .update({
              title: event.summary,
              start_time: event.startTime ?? "09:00",
              end_time: event.endTime ?? "10:00",
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
        if (importAs === "task") {
          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              quest_id: targetQuestId,
              title: event.summary,
              due_date: event.startDate,
              priority: "medium",
              completed: false,
              xp_value: 10,
            })
            .select("id")
            .single();

          if (taskError) {
            result.errors.push(`Failed to create task: ${event.summary} - ${taskError.message}`);
            continue;
          }

          // Track import
          await supabase.from("imported_events").insert({
            user_id: user.id,
            source_type: "ics_subscription",
            source_id: subscriptionId,
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
            // Add 1 hour to start time
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
            result.errors.push(`Failed to create schedule block: ${event.summary} - ${blockError.message}`);
            continue;
          }

          // Track import
          await supabase.from("imported_events").insert({
            user_id: user.id,
            source_type: "ics_subscription",
            source_id: subscriptionId,
            external_uid: event.uid,
            created_as: "schedule_block",
            created_id: block.id,
            event_hash: eventHash,
          });

          result.scheduleBlocksCreated++;
        }
      }
    } catch {
      result.errors.push(`Error processing event: ${event.summary}`);
    }
  }

  // Delete items that no longer exist in the calendar feed
  // Only delete items that were imported from this subscription
  if (existingImports && existingImports.length > 0) {
    for (const imported of existingImports) {
      if (!seenUids.has(imported.external_uid)) {
        try {
          // Delete the created item (task or schedule block)
          if (imported.created_as === "task") {
            await supabase.from("tasks").delete().eq("id", imported.created_id);
            result.tasksDeleted++;
          } else {
            await supabase.from("schedule_blocks").delete().eq("id", imported.created_id);
            result.scheduleBlocksDeleted++;
          }

          // Delete the import tracking record
          await supabase.from("imported_events").delete().eq("id", imported.id);
        } catch {
          result.errors.push(`Failed to delete removed event: ${imported.external_uid}`);
        }
      }
    }
  }

  // Update subscription last synced
  await supabase
    .from("calendar_subscriptions")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

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
