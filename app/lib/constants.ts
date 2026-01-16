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
