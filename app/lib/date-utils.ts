// =============================================================================
// DATE UTILITIES
// Date manipulation and formatting helpers for the Intentionality app.
// Handles ISO date strings, week calculations, and time formatting.
// =============================================================================

import type { ISODateString, Task, TaskWithStatus, DayGroup, DayOfWeek } from "./types";

// -----------------------------------------------------------------------------
// Date String Conversions
// -----------------------------------------------------------------------------

/**
 * Get today's date in ISO format (YYYY-MM-DD).
 *
 * @returns Today's date as an ISO date string in local timezone
 *
 * @example
 * ```ts
 * const today = getTodayISO(); // "2025-01-16"
 * ```
 */
export function getTodayISO(): ISODateString {
  const d = new Date();
  return toISODateString(d);
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD).
 */
export function toISODateString(d: Date): ISODateString {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse an ISO 8601 dateTime string and extract local date/time.
 * Handles timezone offsets correctly (e.g., "2025-01-16T19:00:00-05:00").
 *
 * @param isoDateTime - Full ISO 8601 dateTime string
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM) in local timezone
 *
 * @example
 * ```ts
 * // If user is in EST (UTC-5) and input has -05:00 offset:
 * parseISOToLocal("2025-01-16T19:00:00-05:00");
 * // Returns: { date: "2025-01-16", time: "19:00" }
 *
 * // If input is UTC time viewed from EST:
 * parseISOToLocal("2025-01-16T19:00:00Z");
 * // Returns: { date: "2025-01-16", time: "14:00" } (converted to EST)
 * ```
 */
export function parseISOToLocal(isoDateTime: string): { date: ISODateString; time: string } {
  const parsed = new Date(isoDateTime);
  return {
    date: toISODateString(parsed),
    time: `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`,
  };
}

/**
 * Parse an ISO 8601 dateTime string and convert to a specific timezone.
 * Used for server-side conversion when user's timezone is known.
 *
 * @param isoDateTime - Full ISO 8601 dateTime string
 * @param targetTimezone - IANA timezone string (e.g., "America/New_York")
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM) in the target timezone
 *
 * @example
 * ```ts
 * // UTC time converted to EST:
 * parseISOToTimezone("2025-01-16T19:00:00Z", "America/New_York");
 * // Returns: { date: "2025-01-16", time: "14:00" }
 * ```
 */
export function parseISOToTimezone(
  isoDateTime: string,
  targetTimezone: string
): { date: ISODateString; time: string } {
  const parsed = new Date(isoDateTime);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: targetTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(parsed);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}` as ISODateString,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/**
 * Add days to an ISO date string.
 */
export function addDaysISO(dateISO: ISODateString, daysToAdd: number): ISODateString {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);
  return toISODateString(dt);
}

/**
 * Format an ISO date (YYYY-MM-DD) into a human-friendly label.
 * Example: "2025-12-23" → "Monday, Dec 23"
 */
export function formatDayLabel(dateISO: ISODateString): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format an ISO date (YYYY-MM-DD) into a full display format.
 * Example: "2025-01-16" → "Thursday, January 16, 2025"
 */
export function formatDisplayDate(dateISO: ISODateString): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get the Monday-Sunday week range for a given date.
 */
export function getWeekRange(date: Date): { start: ISODateString; end: ISODateString } {
  const d = new Date(date);
  const day = d.getDay();
  // Monday is day 1, Sunday is day 0. Adjust to get Monday as start.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);

  const start = toISODateString(d);
  const endDate = new Date(d);
  endDate.setDate(endDate.getDate() + 6);
  const end = toISODateString(endDate);

  return { start, end };
}

/**
 * Compare two ISO date strings.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export function compareISO(a: ISODateString, b: ISODateString): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Get day of week from ISO date string (1=Monday, 7=Sunday).
 */
export function getDayOfWeek(dateISO: ISODateString): DayOfWeek {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const jsDay = dt.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Convert to 1=Mon, ..., 7=Sun
  return (jsDay === 0 ? 7 : jsDay) as DayOfWeek;
}

// -----------------------------------------------------------------------------
// Task Grouping Utilities
// NOTE: These functions are reserved for future features
// -----------------------------------------------------------------------------

/**
 * Group tasks into 7 buckets (Mon-Sun) starting at `start`.
 *
 * @future Reserved for weekly calendar view with drag-drop task rescheduling.
 * This function will be used when implementing a full week calendar view
 * that allows users to drag tasks between days.
 *
 * @param tasks - Array of tasks to group
 * @param start - ISO date string of the Monday to start from
 * @returns Array of 7 DayGroup objects, one for each day Mon-Sun
 *
 * @example
 * ```ts
 * const weekGroups = groupTasksByWeek(tasks, "2025-01-13");
 * // Returns: [{ date: "2025-01-13", tasks: [...] }, ...]
 * ```
 */
export function groupTasksByWeek(tasks: Task[], start: ISODateString): DayGroup[] {
  const grouped: DayGroup[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(start, i);
    const tasksForDay = tasks.filter((t) => t.due_date === date);
    grouped.push({ date, tasks: tasksForDay });
  }
  return grouped;
}

/**
 * Split tasks into overdue and today's tasks based on the given date.
 *
 * @future Reserved for split-view dashboard showing overdue vs today tasks.
 * This function will be used when implementing a dashboard that clearly
 * separates overdue tasks from today's tasks with different visual treatment.
 *
 * @param tasks - Array of tasks to split
 * @param today - ISO date string representing "today"
 * @returns Object with overdue and today arrays, each containing TaskWithStatus
 *
 * @example
 * ```ts
 * const { overdue, today } = splitTasksForToday(allTasks, "2025-01-16");
 * // overdue: tasks with due_date < today and not completed
 * // today: tasks with due_date === today (completed or not)
 * ```
 */
export function splitTasksForToday(
  tasks: Task[],
  today: ISODateString
): { overdue: TaskWithStatus[]; today: TaskWithStatus[] } {
  const overdue: TaskWithStatus[] = [];
  const todayList: TaskWithStatus[] = [];

  for (const t of tasks) {
    if (t.completed) {
      if (compareISO(t.due_date, today) === 0) {
        todayList.push({ ...t, status: "done" });
      }
      continue;
    }

    const cmp = compareISO(t.due_date, today);
    if (cmp < 0) {
      overdue.push({ ...t, status: "overdue" });
    } else if (cmp === 0) {
      todayList.push({ ...t, status: "planned" });
    }
  }

  overdue.sort((a, b) => compareISO(a.due_date, b.due_date));
  return { overdue, today: todayList };
}

// -----------------------------------------------------------------------------
// Time Formatting
// -----------------------------------------------------------------------------

/**
 * Format a 24-hour time string (HH:MM) to 12-hour format with AM/PM.
 *
 * @param time - Time string in HH:MM format (e.g., "14:30")
 * @returns Formatted time string (e.g., "2:30 PM")
 *
 * @example
 * ```ts
 * formatTime("09:00"); // "9:00 AM"
 * formatTime("14:30"); // "2:30 PM"
 * formatTime("00:00"); // "12:00 AM"
 * formatTime("12:00"); // "12:00 PM"
 * ```
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format seconds into MM:SS countdown format.
 * Used for timer displays (focus sessions, pomodoro timers).
 *
 * @param seconds - Total seconds to format (non-negative)
 * @returns Formatted string in MM:SS format (e.g., "05:30")
 *
 * @example
 * ```ts
 * formatCountdown(330);  // "05:30"
 * formatCountdown(60);   // "01:00"
 * formatCountdown(5);    // "00:05"
 * formatCountdown(3600); // "60:00"
 * ```
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// -----------------------------------------------------------------------------
// Week Navigation Utilities
// -----------------------------------------------------------------------------

/**
 * Format a week range for display.
 * Example: "Jan 13 - Jan 19, 2026" or "Dec 30, 2025 - Jan 5, 2026"
 *
 * @param start - ISO date string for week start (Monday)
 * @param end - ISO date string for week end (Sunday)
 * @returns Formatted week range string
 *
 * @example
 * ```ts
 * formatWeekRange("2026-01-13", "2026-01-19"); // "Jan 13 - Jan 19, 2026"
 * formatWeekRange("2025-12-30", "2026-01-05"); // "Dec 30, 2025 - Jan 5, 2026"
 * ```
 */
export function formatWeekRange(start: ISODateString, end: ISODateString): string {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);

  const startDate = new Date(startYear, startMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

  const startMonthStr = startDate.toLocaleDateString("en-US", { month: "short" });
  const endMonthStr = endDate.toLocaleDateString("en-US", { month: "short" });

  // If same year
  if (startYear === endYear) {
    // If same month
    if (startMonth === endMonth) {
      return `${startMonthStr} ${startDay} - ${endDay}, ${startYear}`;
    }
    return `${startMonthStr} ${startDay} - ${endMonthStr} ${endDay}, ${startYear}`;
  }

  // Different years (e.g., Dec 30, 2025 - Jan 5, 2026)
  return `${startMonthStr} ${startDay}, ${startYear} - ${endMonthStr} ${endDay}, ${endYear}`;
}

/**
 * Check if a given week start date is the current week.
 *
 * @param weekStart - ISO date string for the Monday of the week to check
 * @returns true if the given week is the current week
 *
 * @example
 * ```ts
 * // If today is Jan 16, 2026 (Thursday)
 * isCurrentWeek("2026-01-13"); // true (current week's Monday)
 * isCurrentWeek("2026-01-20"); // false (next week's Monday)
 * ```
 */
export function isCurrentWeek(weekStart: ISODateString): boolean {
  const { start: currentWeekStart } = getWeekRange(new Date());
  return weekStart === currentWeekStart;
}

/**
 * Get the week range for a given ISO date string (starting Monday).
 *
 * @param dateISO - ISO date string to get the week range for
 * @returns Object with start (Monday) and end (Sunday) ISO date strings
 */
export function getWeekRangeFromISO(dateISO: ISODateString): { start: ISODateString; end: ISODateString } {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return getWeekRange(date);
}
