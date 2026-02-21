// =============================================================================
// DATE UTILITIES
// Date manipulation and formatting helpers for the Intentionality app.
// Handles ISO date strings, week calculations, and time formatting.
// =============================================================================

import type { ISODateString, DayOfWeek } from "./types";
import type { ParsedEvent } from "./ics-parser";

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
 * Get tomorrow's date in ISO format (YYYY-MM-DD).
 */
export function getTomorrowISO(): ISODateString {
  return addDaysISO(getTodayISO(), 1);
}

/**
 * Get next Monday's date in ISO format (YYYY-MM-DD).
 * If today is Monday, returns next Monday (+7 days).
 */
export function getNextMondayISO(): ISODateString {
  const today = getTodayISO();
  const dayOfWeek = getDayOfWeek(today); // 1=Mon, 7=Sun
  // Days until next Monday: if Mon(1) => +7, Tue(2) => +6, ..., Sun(7) => +1
  const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek);
  return addDaysISO(today, daysUntilMonday);
}

/**
 * Get this Saturday's date in ISO format (YYYY-MM-DD).
 * If today is Saturday, returns next Saturday (+7 days).
 */
export function getThisSaturdayISO(): ISODateString {
  const today = getTodayISO();
  const dayOfWeek = getDayOfWeek(today); // 1=Mon, 7=Sun
  // Days until Saturday(6): Mon(1) => +5, Tue(2) => +4, ..., Sat(6) => +7, Sun(7) => +6
  const daysUntilSaturday = dayOfWeek <= 5 ? (6 - dayOfWeek) : (6 - dayOfWeek + 7);
  return addDaysISO(today, daysUntilSaturday);
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
 * Get the Monday of the week for a given ISO date string.
 *
 * @param dateISO - ISO date string (YYYY-MM-DD)
 * @returns ISO date string of the Monday of that week
 *
 * @example
 * ```ts
 * getMonday("2026-01-23"); // Returns "2026-01-20" (Friday -> Monday)
 * getMonday("2026-01-20"); // Returns "2026-01-20" (Monday -> Monday)
 * getMonday("2026-01-25"); // Returns "2026-01-20" (Sunday -> Monday)
 * ```
 */
export function getMonday(dateISO: ISODateString): ISODateString {
  const [y, m, d] = dateISO.split("-").map(Number);
  // Use noon time to avoid timezone edge cases (DST transitions)
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const day = date.getDay();
  // Monday is day 1, Sunday is day 0. Adjust to get Monday.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  return toISODateString(date);
}

/**
 * Get the Monday-Sunday week range for a given date.
 */
export function getWeekRange(date: Date): { start: ISODateString; end: ISODateString } {
  // Create a copy at noon to avoid timezone edge cases (DST transitions)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
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

/**
 * Check if a date is an active day for a habit.
 *
 * @param dateISO - ISO date string (YYYY-MM-DD)
 * @param activeDays - Array of active days (1=Monday, 7=Sunday)
 * @returns true if the date falls on one of the active days
 *
 * @example
 * ```ts
 * isActiveDay("2026-01-23", [1, 2, 3, 4, 5]); // Friday = 5, returns true
 * isActiveDay("2026-01-25", [1, 2, 3, 4, 5]); // Sunday = 7, returns false
 * ```
 */
export function isActiveDay(dateISO: ISODateString, activeDays: DayOfWeek[]): boolean {
  const dayOfWeek = getDayOfWeek(dateISO);
  return activeDays.includes(dayOfWeek);
}

/**
 * Get the previous active day before a given date.
 * Used for habit streak calculations - finds when the habit was last scheduled.
 *
 * @param dateISO - ISO date string to start searching from (exclusive)
 * @param activeDays - Array of active days (1=Monday, 7=Sunday)
 * @returns ISO date string of the most recent active day before the given date
 *
 * @example
 * ```ts
 * // If today is Monday (Jan 26, 2026) and habit is weekdays only [1,2,3,4,5]
 * getPreviousActiveDay("2026-01-26", [1, 2, 3, 4, 5]);
 * // Returns: "2026-01-23" (Friday - skips weekend)
 *
 * // If today is Tuesday and habit is daily
 * getPreviousActiveDay("2026-01-27", [1, 2, 3, 4, 5, 6, 7]);
 * // Returns: "2026-01-26" (Monday)
 * ```
 */
export function getPreviousActiveDay(dateISO: ISODateString, activeDays: DayOfWeek[]): ISODateString {
  // Start from yesterday and go backwards up to 7 days
  for (let i = 1; i <= 7; i++) {
    const previousDate = addDaysISO(dateISO, -i);
    if (isActiveDay(previousDate, activeDays)) {
      return previousDate;
    }
  }
  // Fallback: if no active day found in last 7 days (shouldn't happen with valid activeDays)
  return addDaysISO(dateISO, -1);
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

// -----------------------------------------------------------------------------
// UTC Week Utilities (for server-side cron jobs and API routes)
// -----------------------------------------------------------------------------

/**
 * Get the Monday of the current week in UTC.
 * Used for week-based features like group challenges and weekly history.
 *
 * IMPORTANT: This function uses UTC to ensure consistency across timezones.
 * All server-side week calculations should use this function.
 *
 * @returns ISO date string (YYYY-MM-DD) for Monday of current week in UTC
 *
 * @example
 * ```ts
 * // If today is Thursday, Jan 23, 2026 (UTC)
 * getWeekStartUTC(); // Returns "2026-01-20" (Monday)
 * ```
 */
export function getWeekStartUTC(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Calculate days to subtract to get to Monday
  // If Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const daysToSubtract = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysToSubtract);
  monday.setUTCHours(0, 0, 0, 0);

  return monday.toISOString().split("T")[0];
}

/**
 * Get the date range for the previous week in UTC.
 * Used for archiving weekly results on Monday.
 *
 * @returns Object with start (Monday) and end (Sunday) dates as ISO strings
 *
 * @example
 * ```ts
 * // If today is Monday, Jan 27, 2026
 * getLastWeekRangeUTC();
 * // Returns { start: "2026-01-20", end: "2026-01-26" }
 * ```
 */
export function getLastWeekRangeUTC(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay();

  // Find this week's Monday
  const daysToSubtract = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - daysToSubtract);
  thisMonday.setUTCHours(0, 0, 0, 0);

  // Last week's Monday is 7 days before
  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);

  // Last week's Sunday is 6 days after last Monday
  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);

  return {
    start: lastMonday.toISOString().split("T")[0],
    end: lastSunday.toISOString().split("T")[0],
  };
}

/**
 * Get today's date in UTC as ISO string.
 *
 * @returns ISO date string (YYYY-MM-DD) for today in UTC
 */
export function getTodayUTC(): string {
  return new Date().toISOString().split("T")[0];
}

// -----------------------------------------------------------------------------
// Calendar Import Utilities
// -----------------------------------------------------------------------------

/**
 * Determine how to import a calendar event based on user preference.
 * Used by calendar sync and upload routes.
 *
 * @param event - Parsed calendar event
 * @param preference - User's import preference ("tasks", "schedule", or "smart")
 * @returns "task" or "schedule" based on preference and event type
 */
export function determineImportType(
  event: ParsedEvent,
  preference: string
): "task" | "schedule" {
  if (preference === "tasks") return "task";
  if (preference === "schedule") return "schedule";

  // Smart mode: all-day = task, timed = schedule
  return event.isAllDay ? "task" : "schedule";
}
