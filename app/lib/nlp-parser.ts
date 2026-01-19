// =============================================================================
// NATURAL LANGUAGE PARSER
// Parses natural language input into structured task data.
// Handles dates, priorities, and times.
// =============================================================================

import type { ParsedTaskInput, Priority, ISODateString } from "./types";

// -----------------------------------------------------------------------------
// Date Parsing
// -----------------------------------------------------------------------------

/**
 * Keywords that indicate relative dates.
 */
const DATE_KEYWORDS: Record<string, number> = {
  today: 0,
  tonight: 0,
  tomorrow: 1,
  tmrw: 1,
  tmr: 1,
  "day after tomorrow": 2,
  overmorrow: 2,
};

/**
 * Day names to day of week (0 = Sunday).
 */
const DAY_NAMES: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Month names to month number (0-indexed).
 */
const MONTH_NAMES: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

/**
 * Format a date as YYYY-MM-DD.
 */
function formatDate(date: Date): ISODateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as ISODateString;
}

/**
 * Get the next occurrence of a day of week.
 */
function getNextDayOfWeek(dayOfWeek: number, includeToday = false): Date {
  const today = new Date();
  const todayDay = today.getDay();

  let daysUntil = dayOfWeek - todayDay;
  if (daysUntil < 0 || (daysUntil === 0 && !includeToday)) {
    daysUntil += 7;
  }

  const result = new Date(today);
  result.setDate(today.getDate() + daysUntil);
  return result;
}

/**
 * Parse a date from natural language input.
 */
function parseDate(input: string): { date: ISODateString | null; matched: string | null } {
  const lower = input.toLowerCase();
  const today = new Date();

  // Check for "next week" pattern
  const nextWeekMatch = lower.match(/next\s+week/);
  if (nextWeekMatch) {
    const nextMonday = getNextDayOfWeek(1);
    nextMonday.setDate(nextMonday.getDate() + 7);
    return { date: formatDate(nextMonday), matched: nextWeekMatch[0] };
  }

  // Check for "this week" pattern (Friday of this week)
  const thisWeekMatch = lower.match(/this\s+week/);
  if (thisWeekMatch) {
    const friday = getNextDayOfWeek(5, true);
    return { date: formatDate(friday), matched: thisWeekMatch[0] };
  }

  // Check for relative date keywords
  for (const [keyword, daysAhead] of Object.entries(DATE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      const result = new Date(today);
      result.setDate(today.getDate() + daysAhead);
      return { date: formatDate(result), matched: keyword };
    }
  }

  // Check for "next [day]" pattern
  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun)/i);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1].toLowerCase();
    const dayOfWeek = DAY_NAMES[dayName];
    if (dayOfWeek !== undefined) {
      const nextDay = getNextDayOfWeek(dayOfWeek);
      nextDay.setDate(nextDay.getDate() + 7); // "next" means the week after
      return { date: formatDate(nextDay), matched: nextDayMatch[0] };
    }
  }

  // Check for day name (this week or next if today)
  for (const [dayName, dayOfWeek] of Object.entries(DAY_NAMES)) {
    const pattern = new RegExp(`\\b${dayName}\\b`, "i");
    if (pattern.test(lower)) {
      const result = getNextDayOfWeek(dayOfWeek);
      return { date: formatDate(result), matched: dayName };
    }
  }

  // Check for "Month Day" pattern (e.g., "Jan 20", "January 20th")
  const monthDayPattern = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthDayMatch = lower.match(monthDayPattern);
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].toLowerCase();
    const month = MONTH_NAMES[monthName];
    const day = parseInt(monthDayMatch[2], 10);

    if (month !== undefined && day >= 1 && day <= 31) {
      const result = new Date(today.getFullYear(), month, day);
      // If the date has passed this year, use next year
      if (result < today) {
        result.setFullYear(result.getFullYear() + 1);
      }
      return { date: formatDate(result), matched: monthDayMatch[0] };
    }
  }

  // Check for "in X days/weeks" pattern
  const inDaysMatch = lower.match(/in\s+(\d+)\s+(day|days|week|weeks)/);
  if (inDaysMatch) {
    const amount = parseInt(inDaysMatch[1], 10);
    const unit = inDaysMatch[2];
    const daysToAdd = unit.startsWith("week") ? amount * 7 : amount;
    const result = new Date(today);
    result.setDate(today.getDate() + daysToAdd);
    return { date: formatDate(result), matched: inDaysMatch[0] };
  }

  return { date: null, matched: null };
}

// -----------------------------------------------------------------------------
// Priority Parsing
// -----------------------------------------------------------------------------

/**
 * Priority indicators in natural language.
 */
const PRIORITY_PATTERNS: { pattern: RegExp; priority: Priority }[] = [
  { pattern: /\b(urgent|asap|critical|important)\b/i, priority: "high" },
  { pattern: /\bhigh\s*priority\b/i, priority: "high" },
  { pattern: /!high\b/i, priority: "high" },
  { pattern: /!!\b/, priority: "high" },
  { pattern: /\bmedium\s*priority\b/i, priority: "medium" },
  { pattern: /!medium\b/i, priority: "medium" },
  { pattern: /!\b/, priority: "medium" },
  { pattern: /\blow\s*priority\b/i, priority: "low" },
  { pattern: /!low\b/i, priority: "low" },
  { pattern: /\b(whenever|someday|low)\b/i, priority: "low" },
];

/**
 * Parse priority from natural language input.
 */
function parsePriority(input: string): { priority: Priority | null; matched: string | null } {
  for (const { pattern, priority } of PRIORITY_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      return { priority, matched: match[0] };
    }
  }
  return { priority: null, matched: null };
}

// -----------------------------------------------------------------------------
// Time Parsing
// -----------------------------------------------------------------------------

/**
 * Parse time from natural language input.
 */
function parseTime(input: string): { time: string | null; matched: string | null } {
  const lower = input.toLowerCase();

  // Check for specific time patterns (e.g., "at 3pm", "at 15:00", "3:30 pm")
  const timePattern = /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i;
  const match = lower.match(timePattern);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3]?.toLowerCase().replace(".", "");

    // Handle 12-hour format
    if (period === "pm" && hours !== 12) {
      hours += 12;
    } else if (period === "am" && hours === 12) {
      hours = 0;
    }

    // Validate time
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      return { time: timeStr, matched: match[0] };
    }
  }

  // Check for time-of-day keywords
  const timeKeywords: Record<string, string> = {
    morning: "09:00",
    "this morning": "09:00",
    noon: "12:00",
    afternoon: "14:00",
    "this afternoon": "14:00",
    evening: "18:00",
    "this evening": "18:00",
    tonight: "20:00",
    night: "20:00",
  };

  for (const [keyword, time] of Object.entries(timeKeywords)) {
    if (lower.includes(keyword)) {
      return { time, matched: keyword };
    }
  }

  return { time: null, matched: null };
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parse natural language input into structured task data.
 *
 * Examples:
 * - "Call mom tomorrow high priority" → { title: "Call mom", due_date: "2025-01-17", priority: "high" }
 * - "Finish report by Friday at 3pm" → { title: "Finish report", due_date: "2025-01-17", scheduled_time: "15:00" }
 * - "urgent: fix the bug" → { title: "fix the bug", priority: "high" }
 */
export function parseTaskInput(input: string): ParsedTaskInput {
  let title = input.trim();
  let confidence = 1.0;

  // Parse date
  const { date: due_date, matched: dateMatched } = parseDate(title);
  if (dateMatched) {
    title = title.replace(new RegExp(`\\b${escapeRegex(dateMatched)}\\b`, "gi"), "").trim();
    confidence = Math.min(confidence, 0.9);
  }

  // Parse priority
  const { priority, matched: priorityMatched } = parsePriority(title);
  if (priorityMatched) {
    title = title.replace(new RegExp(escapeRegex(priorityMatched), "gi"), "").trim();
    confidence = Math.min(confidence, 0.9);
  }

  // Parse time
  const { time: scheduled_time, matched: timeMatched } = parseTime(title);
  if (timeMatched) {
    title = title.replace(new RegExp(escapeRegex(timeMatched), "gi"), "").trim();
    confidence = Math.min(confidence, 0.85);
  }

  // Clean up title
  title = title
    .replace(/\s+/g, " ")           // Normalize whitespace
    .replace(/^[:\-,.\s]+/, "")     // Remove leading punctuation
    .replace(/[:\-,.\s]+$/, "")     // Remove trailing punctuation
    .replace(/\bby\s*$/i, "")       // Remove trailing "by"
    .replace(/\bat\s*$/i, "")       // Remove trailing "at"
    .trim();

  // Lower confidence if title is very short or very long
  if (title.length < 3) {
    confidence = Math.min(confidence, 0.5);
  } else if (title.length > 200) {
    confidence = Math.min(confidence, 0.7);
  }

  return {
    title,
    due_date,
    priority,
    scheduled_time,
    confidence,
  };
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Preview the parsing result as a human-readable string.
 */
export function formatParsedPreview(parsed: ParsedTaskInput): string {
  const parts: string[] = [parsed.title];

  if (parsed.due_date) {
    const date = new Date(parsed.due_date);
    const formatted = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    parts.push(`due ${formatted}`);
  }

  if (parsed.scheduled_time) {
    const [hours, minutes] = parsed.scheduled_time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    parts.push(`at ${displayHours}:${String(minutes).padStart(2, "0")} ${period}`);
  }

  if (parsed.priority) {
    parts.push(`${parsed.priority} priority`);
  }

  return parts.join(" • ");
}
