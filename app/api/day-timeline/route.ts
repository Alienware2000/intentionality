// =============================================================================
// DAY TIMELINE API ROUTE
// Unified endpoint returning both tasks and schedule blocks for a date.
// Used by both Today and Week views for consistent data.
// =============================================================================

import { NextResponse } from "next/server";
import { withAuth, getSearchParams, ApiErrors } from "@/app/lib/auth-middleware";
import { getDayOfWeek, getTodayISO } from "@/app/lib/date-utils";
import type { Task, ScheduleBlock, TimelineItem, DayOfWeek } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// GET /api/day-timeline
// -----------------------------------------------------------------------------

/**
 * GET /api/day-timeline?date=YYYY-MM-DD
 *
 * Returns all timeline items for a specific day:
 * - Tasks due on that date (with optional scheduled_time)
 * - Schedule blocks active on that day (with completion status)
 *
 * Items are sorted chronologically by time.
 * Tasks without scheduled_time are returned separately.
 * Overdue tasks are only included when date is today.
 *
 * @authentication Required
 *
 * @query {string} date - Date in YYYY-MM-DD format (required)
 *
 * @returns {Object} Response object
 * @returns {boolean} ok - Success indicator
 * @returns {string} date - The requested date
 * @returns {TimelineItem[]} scheduledItems - Chronologically sorted items with times
 * @returns {Task[]} unscheduledTasks - Tasks without scheduled_time
 * @returns {Task[]} overdueTasks - Overdue tasks (only for today)
 *
 * @throws {401} Not authenticated
 * @throws {400} Missing date query param
 * @throws {500} Database error
 */
export const GET = withAuth(async ({ supabase, request }) => {
  const params = getSearchParams(request);
  const date = params.get("date");

  if (!date) {
    return ApiErrors.badRequest("Missing date query param");
  }

  const today = getTodayISO();
  const isToday = date === today;
  const dayOfWeek = getDayOfWeek(date) as DayOfWeek;

  try {
    // Fetch in parallel: tasks, schedule blocks, and completions
    const [tasksResult, blocksResult, completionsResult] = await Promise.all([
      // Fetch tasks for this date (and overdue if today)
      isToday
        ? supabase
            .from("tasks")
            .select("*, quest:quests(*)")
            .or(`due_date.eq.${date},and(due_date.lt.${date},completed.eq.false)`)
            .order("created_at", { ascending: true })
        : supabase
            .from("tasks")
            .select("*, quest:quests(*)")
            .eq("due_date", date)
            .order("created_at", { ascending: true }),

      // Fetch all schedule blocks
      supabase
        .from("schedule_blocks")
        .select("*")
        .order("start_time", { ascending: true }),

      // Fetch completions for this date
      supabase
        .from("schedule_block_completions")
        .select("block_id")
        .eq("completed_date", date),
    ]);

    // Handle errors
    if (tasksResult.error) {
      return ApiErrors.serverError(tasksResult.error.message);
    }
    if (blocksResult.error) {
      return ApiErrors.serverError(blocksResult.error.message);
    }

    const tasks = (tasksResult.data ?? []) as Task[];
    const blocks = (blocksResult.data ?? []) as ScheduleBlock[];
    const completedBlockIds = new Set(
      (completionsResult.data ?? []).map((c) => c.block_id)
    );

    // Filter blocks to those active on this day of week
    const blocksForDay = blocks.filter((b) =>
      b.days_of_week.includes(dayOfWeek)
    );

    // Separate tasks by category
    const overdueTasks: Task[] = [];
    const scheduledTasks: Task[] = [];
    const unscheduledTasks: Task[] = [];

    for (const task of tasks) {
      if (isToday && task.due_date < date && !task.completed) {
        // Overdue task (only for today view)
        overdueTasks.push(task);
      } else if (task.due_date === date) {
        // Task for this date
        if (task.scheduled_time) {
          scheduledTasks.push(task);
        } else {
          unscheduledTasks.push(task);
        }
      }
    }

    // Build timeline items (scheduled tasks + schedule blocks)
    const scheduledItems: TimelineItem[] = [];

    // Add scheduled tasks
    for (const task of scheduledTasks) {
      scheduledItems.push({ type: "task", data: task });
    }

    // Add schedule blocks
    for (const block of blocksForDay) {
      scheduledItems.push({
        type: "schedule_block",
        data: block,
        completed: completedBlockIds.has(block.id),
      });
    }

    // Sort by time (tasks by scheduled_time, blocks by start_time)
    scheduledItems.sort((a, b) => {
      const timeA =
        a.type === "task" ? a.data.scheduled_time : a.data.start_time;
      const timeB =
        b.type === "task" ? b.data.scheduled_time : b.data.start_time;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return timeA.localeCompare(timeB);
    });

    return NextResponse.json({
      ok: true,
      date,
      scheduledItems,
      unscheduledTasks,
      overdueTasks: isToday ? overdueTasks : [],
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return ApiErrors.serverError(message);
  }
});
