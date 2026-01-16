// =============================================================================
// ICS PARSER
// Parses iCalendar (ICS) format files into structured events.
// Supports VEVENT components with DTSTART, DTEND, SUMMARY, DESCRIPTION, UID.
// =============================================================================

import type { ISODateString } from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ParsedEvent = {
  uid: string;
  summary: string;
  description?: string;
  startDate: ISODateString;
  startTime?: string; // HH:MM format, undefined for all-day events
  endDate?: ISODateString;
  endTime?: string;
  isAllDay: boolean;
  location?: string;
  rrule?: string; // Recurrence rule (for future use)
};

export type ParseResult = {
  ok: true;
  events: ParsedEvent[];
  calendarName?: string;
} | {
  ok: false;
  error: string;
};

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

/**
 * Parse an ICS string into structured events.
 */
export function parseICS(icsContent: string): ParseResult {
  try {
    const lines = unfoldLines(icsContent);
    const events: ParsedEvent[] = [];
    let calendarName: string | undefined;

    let inEvent = false;
    let currentEvent: Partial<ParsedEvent> = {};

    for (const line of lines) {
      const { name, value } = parseLine(line);

      // Calendar name
      if (name === "X-WR-CALNAME") {
        calendarName = value;
      }

      // Event start
      if (name === "BEGIN" && value === "VEVENT") {
        inEvent = true;
        currentEvent = {};
        continue;
      }

      // Event end
      if (name === "END" && value === "VEVENT") {
        inEvent = false;
        if (currentEvent.uid && currentEvent.summary && currentEvent.startDate) {
          events.push({
            uid: currentEvent.uid,
            summary: currentEvent.summary,
            description: currentEvent.description,
            startDate: currentEvent.startDate,
            startTime: currentEvent.startTime,
            endDate: currentEvent.endDate,
            endTime: currentEvent.endTime,
            isAllDay: currentEvent.isAllDay ?? false,
            location: currentEvent.location,
            rrule: currentEvent.rrule,
          });
        }
        continue;
      }

      if (!inEvent) continue;

      // Parse event properties
      // Extract base property name (before any parameters like ;TZID=...)
      const baseName = name.split(";")[0];

      switch (baseName) {
        case "UID":
          currentEvent.uid = value;
          break;

        case "SUMMARY":
          currentEvent.summary = unescapeText(value);
          break;

        case "DESCRIPTION":
          currentEvent.description = unescapeText(value);
          break;

        case "LOCATION":
          currentEvent.location = unescapeText(value);
          break;

        case "RRULE":
          currentEvent.rrule = value;
          break;

        case "DTSTART":
          {
            const parsed = parseDateTime(line);
            currentEvent.startDate = parsed.date;
            currentEvent.startTime = parsed.time;
            currentEvent.isAllDay = parsed.isAllDay;
          }
          break;

        case "DTEND":
          {
            const parsed = parseDateTime(line);
            currentEvent.endDate = parsed.date;
            currentEvent.endTime = parsed.time;
          }
          break;
      }
    }

    return { ok: true, events, calendarName };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to parse ICS file",
    };
  }
}

/**
 * Fetch and parse an ICS feed from a URL.
 */
export async function fetchAndParseICS(url: string): Promise<ParseResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "text/calendar",
        "User-Agent": "Intentionality/1.0",
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: "Access denied. The calendar feed may require authentication." };
      }
      if (response.status === 404) {
        return { ok: false, error: "Calendar feed not found. Please check the URL." };
      }
      return { ok: false, error: `Failed to fetch calendar (HTTP ${response.status})` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/calendar") && !contentType.includes("text/plain")) {
      // Some servers don't set correct content type, so just warn but continue
      console.warn(`Unexpected content type: ${contentType}`);
    }

    const icsContent = await response.text();

    if (!icsContent.includes("BEGIN:VCALENDAR")) {
      return { ok: false, error: "Invalid calendar feed. The URL does not return an ICS file." };
    }

    return parseICS(icsContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
      return { ok: false, error: "Could not reach the calendar server. Please check the URL." };
    }

    return { ok: false, error: "Failed to fetch calendar feed. Please check the URL and try again." };
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Unfold long lines (ICS spec allows line wrapping with leading whitespace).
 */
function unfoldLines(content: string): string[] {
  // Normalize line endings and unfold
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const unfolded = normalized.replace(/\n[ \t]/g, "");
  return unfolded.split("\n").filter((line) => line.trim());
}

/**
 * Parse a line into name and value.
 */
function parseLine(line: string): { name: string; value: string } {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return { name: line, value: "" };
  }

  const name = line.substring(0, colonIndex);
  const value = line.substring(colonIndex + 1);

  // Handle properties with parameters (e.g., "DTSTART;VALUE=DATE:20250116")
  const baseName = name.split(";")[0];

  return { name: name.includes(";") ? name : baseName, value };
}

/**
 * Parse a DTSTART or DTEND value.
 */
function parseDateTime(line: string): { date: ISODateString; time?: string; isAllDay: boolean } {
  const colonIndex = line.indexOf(":");
  const params = line.substring(0, colonIndex);
  const value = line.substring(colonIndex + 1);

  // All-day event: DTSTART;VALUE=DATE:20250116 or just 8 digits
  const isAllDay = params.includes("VALUE=DATE") || value.length === 8;

  if (isAllDay) {
    // Format: YYYYMMDD
    const year = value.substring(0, 4);
    const month = value.substring(4, 6);
    const day = value.substring(6, 8);
    return {
      date: `${year}-${month}-${day}` as ISODateString,
      isAllDay: true,
    };
  }

  // Timed event: 20250116T143000 or 20250116T143000Z
  const dateStr = value.substring(0, 8);
  const timeStr = value.substring(9, 15);

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  const hours = timeStr.substring(0, 2);
  const minutes = timeStr.substring(2, 4);

  return {
    date: `${year}-${month}-${day}` as ISODateString,
    time: `${hours}:${minutes}`,
    isAllDay: false,
  };
}

/**
 * Unescape ICS text values.
 */
function unescapeText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Generate a hash for an event to detect changes.
 */
export function hashEvent(event: ParsedEvent): string {
  const data = [
    event.uid,
    event.summary,
    event.description ?? "",
    event.startDate,
    event.startTime ?? "",
    event.endDate ?? "",
    event.endTime ?? "",
    event.location ?? "",
  ].join("|");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
