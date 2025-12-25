import type { ISODateString } from "./types";

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
