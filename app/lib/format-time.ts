// =============================================================================
// TIME FORMATTING UTILITIES
// Shared time formatting functions used across the application.
// =============================================================================

/**
 * Formats a date as a relative time string (e.g., "5m ago", "2d ago").
 * Used for displaying timestamps in activity feeds, friend requests, etc.
 *
 * @param date - Date object or ISO date string
 * @returns Formatted relative time string
 *
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime("2024-01-20T10:00:00Z") // "2d ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

/**
 * Formats a date for display (e.g., "Jan 2024").
 * Used for join dates and other long-form timestamps.
 *
 * @param dateStr - ISO date string
 * @returns Formatted date string
 */
export function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
