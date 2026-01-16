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
 * Parse a DTSTART or DTEND value, converting to local timezone.
 *
 * ICS datetime formats:
 * - All-day: DTSTART;VALUE=DATE:20250116
 * - UTC time: DTSTART:20250116T190000Z (Z suffix = UTC)
 * - With timezone: DTSTART;TZID=America/New_York:20250116T140000
 * - Floating (no timezone): DTSTART:20250116T140000 (assumed local)
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

  // Timed event: 20250116T143000 or 20250116T143000Z or with TZID
  const isUTC = value.endsWith("Z");
  const cleanValue = value.replace("Z", "");

  const dateStr = cleanValue.substring(0, 8);
  const timeStr = cleanValue.substring(9, 15);

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(6, 8), 10);
  const hours = parseInt(timeStr.substring(0, 2), 10);
  const minutes = parseInt(timeStr.substring(2, 4), 10);
  const seconds = timeStr.length >= 6 ? parseInt(timeStr.substring(4, 6), 10) : 0;

  // Extract TZID if present (e.g., DTSTART;TZID=America/New_York:...)
  const tzidMatch = params.match(/TZID=([^;:]+)/);
  const sourceTzid = tzidMatch ? tzidMatch[1] : null;

  let localDate: Date;

  if (isUTC) {
    // UTC time - create Date from UTC, JS auto-converts to local when accessing getters
    localDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  } else if (sourceTzid) {
    // Has explicit timezone - convert from source timezone to local
    localDate = convertTimezoneToLocal(year, month, day, hours, minutes, seconds, sourceTzid);
  } else {
    // Floating time (no timezone specified) - treat as local time
    localDate = new Date(year, month, day, hours, minutes, seconds);
  }

  // Format the local date and time
  const localYear = localDate.getFullYear();
  const localMonth = String(localDate.getMonth() + 1).padStart(2, "0");
  const localDay = String(localDate.getDate()).padStart(2, "0");
  const localHours = String(localDate.getHours()).padStart(2, "0");
  const localMinutes = String(localDate.getMinutes()).padStart(2, "0");

  return {
    date: `${localYear}-${localMonth}-${localDay}` as ISODateString,
    time: `${localHours}:${localMinutes}`,
    isAllDay: false,
  };
}

/**
 * Convert a datetime from a specific timezone to local time.
 * Uses Intl.DateTimeFormat to properly handle DST and timezone offsets.
 */
function convertTimezoneToLocal(
  year: number,
  month: number, // 0-indexed
  day: number,
  hours: number,
  minutes: number,
  seconds: number,
  sourceTzid: string
): Date {
  try {
    // Create an ISO string representing the datetime
    const isoString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    // Create a temporary date to calculate the offset
    // First, get what this time would be if interpreted as UTC
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));

    // Get the time representation in the source timezone
    const sourceTzFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: sourceTzid,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Format the UTC date as if in source timezone to get the offset
    const partsInSourceTz = sourceTzFormatter.formatToParts(utcDate);
    const getPartValue = (type: string) =>
      parseInt(partsInSourceTz.find((p) => p.type === type)?.value || "0", 10);

    const sourceYear = getPartValue("year");
    const sourceMonth = getPartValue("month") - 1;
    const sourceDay = getPartValue("day");
    const sourceHour = getPartValue("hour");
    const sourceMinute = getPartValue("minute");
    const sourceSecond = getPartValue("second");

    // Calculate offset: how much does source timezone differ from UTC?
    const utcTime = Date.UTC(year, month, day, hours, minutes, seconds);
    const sourceAsUtc = Date.UTC(sourceYear, sourceMonth, sourceDay, sourceHour, sourceMinute, sourceSecond);
    const offsetMs = sourceAsUtc - utcTime;

    // Apply offset to get the actual UTC time, then local Date will convert properly
    const actualUtcMs = utcDate.getTime() - offsetMs;
    return new Date(actualUtcMs);
  } catch {
    // If timezone parsing fails, treat as local time
    return new Date(year, month, day, hours, minutes, seconds);
  }
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
