// =============================================================================
// SHARED CONSTANTS
// Centralizes repeated values to ensure consistency across components.
// =============================================================================

import type { Priority } from "./types";

// -----------------------------------------------------------------------------
// Priority Styling
// -----------------------------------------------------------------------------

/**
 * CSS class mappings for priority-based left border colors.
 * Used consistently across TaskCard, DayTimeline, and HabitCard components.
 *
 * These classes reference CSS custom properties defined in globals.css:
 * - --priority-high: Red (#ef4444)
 * - --priority-medium: Yellow (#eab308)
 * - --priority-low: Gray (#6b7280)
 *
 * @example
 * ```tsx
 * import { PRIORITY_BORDER_COLORS } from "@/app/lib/constants";
 *
 * <div className={cn("border-l-4", PRIORITY_BORDER_COLORS[task.priority])}>
 *   {task.title}
 * </div>
 * ```
 */
export const PRIORITY_BORDER_COLORS: Record<Priority, string> = {
  high: "border-l-[var(--priority-high)]",
  medium: "border-l-[var(--priority-medium)]",
  low: "border-l-[var(--priority-low)]",
};

/**
 * Human-readable priority labels for display.
 * Uppercase abbreviations for consistent UI appearance.
 *
 * @example
 * ```tsx
 * <span className="text-xs font-mono">{PRIORITY_LABELS[task.priority]}</span>
 * ```
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

/**
 * Full priority label text for accessibility and tooltips.
 *
 * @example
 * ```tsx
 * <span title={PRIORITY_LABELS_FULL[task.priority]}>...</span>
 * ```
 */
export const PRIORITY_LABELS_FULL: Record<Priority, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

// -----------------------------------------------------------------------------
// Gamification
// -----------------------------------------------------------------------------

/**
 * Re-export XP_VALUES from gamification for convenient access.
 * XP values awarded for each priority level on task/habit completion.
 *
 * - Low: 5 XP
 * - Medium: 10 XP
 * - High: 25 XP
 */
export { XP_VALUES } from "./gamification";

// -----------------------------------------------------------------------------
// UI Constants
// -----------------------------------------------------------------------------

/**
 * Default animation duration for transitions (in milliseconds).
 */
export const ANIMATION_DURATION_MS = 150;

/**
 * Framer Motion transition preset for quick interactions.
 */
export const QUICK_TRANSITION = {
  duration: 0.15,
  ease: "easeOut",
} as const;

/**
 * Framer Motion transition preset for smooth animations.
 */
export const SMOOTH_TRANSITION = {
  duration: 0.3,
  ease: "easeInOut",
} as const;

// -----------------------------------------------------------------------------
// Social Feature Limits
// -----------------------------------------------------------------------------

export const SOCIAL_LIMITS = {
  /** Maximum length for group name */
  GROUP_NAME_MAX_LENGTH: 50,
  /** Maximum length for group description */
  GROUP_DESCRIPTION_MAX_LENGTH: 200,
  /** Length of invite codes */
  INVITE_CODE_LENGTH: 8,
  /** Default limit for leaderboard results */
  LEADERBOARD_DEFAULT_LIMIT: 50,
  /** Maximum limit for leaderboard results */
  LEADERBOARD_MAX_LIMIT: 100,
  /** Default limit for activity feed */
  ACTIVITY_FEED_DEFAULT_LIMIT: 20,
  /** Notification polling interval in milliseconds */
  NOTIFICATION_POLL_INTERVAL_MS: 60000,
  /** Search debounce delay in milliseconds */
  SEARCH_DEBOUNCE_MS: 300,
  /** Maximum length for nudge messages */
  NUDGE_MESSAGE_MAX_LENGTH: 200,
  /** Minimum characters for user search */
  SEARCH_MIN_CHARS: 2,
} as const;

// -----------------------------------------------------------------------------
// Supabase Error Codes
// -----------------------------------------------------------------------------

export const SUPABASE_ERROR_CODES = {
  /** Row not found (PGRST116) */
  NOT_FOUND: "PGRST116",
  /** Unique constraint violation */
  UNIQUE_VIOLATION: "23505",
} as const;

// -----------------------------------------------------------------------------
// Group Limits
// -----------------------------------------------------------------------------

export const GROUP_LIMITS = {
  /** Minimum members allowed in a group */
  MIN_MEMBERS: 2,
  /** Maximum members allowed in a group */
  MAX_MEMBERS: 50,
  /** Default max members for new groups */
  DEFAULT_MAX_MEMBERS: 20,
} as const;
