// =============================================================================
// CALENDAR SUBSCRIPTIONS API
// Manages ICS feed subscriptions for automatic calendar import.
// =============================================================================

import {
  withAuth,
  parseJsonBody,
  ApiErrors,
  successResponse,
} from "@/app/lib/auth-middleware";
import { fetchAndParseICS } from "@/app/lib/ics-parser";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CreateSubscriptionBody = {
  name?: string;
  feedUrl?: string;
  importAs?: "tasks" | "schedule" | "smart";
  targetQuestId?: string;
};

type UpdateSubscriptionBody = {
  subscriptionId?: string;
  name?: string;
  importAs?: "tasks" | "schedule" | "smart";
  targetQuestId?: string | null;
  isActive?: boolean;
};

type DeleteSubscriptionBody = {
  subscriptionId?: string;
};

// -----------------------------------------------------------------------------
// GET /api/calendar/subscriptions
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ supabase }) => {
  const { data: subscriptions, error } = await supabase
    .from("calendar_subscriptions")
    .select("id, name, feed_url, feed_type, import_as, target_quest_id, last_synced_at, sync_error, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ subscriptions: subscriptions ?? [] });
});

// -----------------------------------------------------------------------------
// POST /api/calendar/subscriptions
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateSubscriptionBody>(request);
  const { name, feedUrl, importAs = "smart", targetQuestId } = body ?? {};

  if (!feedUrl) {
    return ApiErrors.badRequest("Missing feedUrl");
  }

  // Validate the feed URL by trying to fetch it
  const parseResult = await fetchAndParseICS(feedUrl);
  if (!parseResult.ok) {
    return ApiErrors.badRequest(parseResult.error);
  }

  // Use calendar name from feed if no name provided
  const subscriptionName = name?.trim() || parseResult.calendarName || "Calendar Feed";

  // Create subscription
  const { data: subscription, error } = await supabase
    .from("calendar_subscriptions")
    .insert({
      user_id: user.id,
      name: subscriptionName,
      feed_url: feedUrl,
      feed_type: "ics",
      import_as: importAs,
      target_quest_id: targetQuestId || null,
    })
    .select("id, name, feed_url, feed_type, import_as, target_quest_id, last_synced_at, sync_error, is_active, created_at")
    .single();

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({
    subscription,
    eventsFound: parseResult.events.length,
    calendarName: parseResult.calendarName,
  });
});

// -----------------------------------------------------------------------------
// PATCH /api/calendar/subscriptions
// -----------------------------------------------------------------------------

export const PATCH = withAuth(async ({ supabase, request }) => {
  const body = await parseJsonBody<UpdateSubscriptionBody>(request);
  const { subscriptionId, name, importAs, targetQuestId, isActive } = body ?? {};

  if (!subscriptionId) {
    return ApiErrors.badRequest("Missing subscriptionId");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (importAs !== undefined) updates.import_as = importAs;
  if (targetQuestId !== undefined) updates.target_quest_id = targetQuestId;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data: subscription, error } = await supabase
    .from("calendar_subscriptions")
    .update(updates)
    .eq("id", subscriptionId)
    .select("id, name, feed_url, feed_type, import_as, target_quest_id, last_synced_at, sync_error, is_active, created_at")
    .single();

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({ subscription });
});

// -----------------------------------------------------------------------------
// DELETE /api/calendar/subscriptions
// -----------------------------------------------------------------------------

export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<DeleteSubscriptionBody>(request);
  const subscriptionId = body?.subscriptionId;

  if (!subscriptionId) {
    return ApiErrors.badRequest("Missing subscriptionId");
  }

  // Delete imported events tracking
  await supabase
    .from("imported_events")
    .delete()
    .eq("source_type", "ics_subscription")
    .eq("source_id", subscriptionId)
    .eq("user_id", user.id);

  // Delete subscription
  const { error } = await supabase
    .from("calendar_subscriptions")
    .delete()
    .eq("id", subscriptionId);

  if (error) {
    return ApiErrors.serverError(error.message);
  }

  return successResponse({});
});
