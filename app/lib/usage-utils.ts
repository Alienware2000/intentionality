// =============================================================================
// USAGE UTILITIES
// Shared utilities for consistent usage display across freemium UI components.
// Provides color coding based on usage percentage thresholds.
// =============================================================================

export type UsageLevel = "low" | "medium" | "high";

/**
 * Determine usage level based on percentage.
 * Thresholds: >80% = high, 50-80% = medium, <50% = low
 */
export function getUsageLevel(percentage: number): UsageLevel {
  if (percentage > 80) return "high";
  if (percentage >= 50) return "medium";
  return "low";
}

/**
 * Get color classes for a usage level.
 * - high: Red with pulse animation
 * - medium: Gold/highlight color
 * - low: Muted/primary color
 */
export function getUsageColors(level: UsageLevel) {
  switch (level) {
    case "high":
      return {
        text: "text-[var(--priority-high)]",
        bg: "bg-[var(--priority-high)]",
        pulse: true,
      };
    case "medium":
      return {
        text: "text-[var(--accent-highlight)]",
        bg: "bg-[var(--accent-highlight)]",
        pulse: false,
      };
    default:
      return {
        text: "text-[var(--text-muted)]",
        bg: "bg-[var(--text-muted)]",
        pulse: false,
      };
  }
}

/**
 * Convenience function to get colors directly from percentage.
 */
export function getUsageColorsFromPercentage(percentage: number) {
  return getUsageColors(getUsageLevel(percentage));
}
