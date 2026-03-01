// =============================================================================
// AVATAR UTILITIES
// Deterministic avatar colors from userId and display name initials.
// =============================================================================

const AVATAR_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

/** Returns a deterministic color for a given userId string. */
export function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Returns the first letter of a display name, uppercased. */
export function getInitial(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return "?";
  return name.trim()[0].toUpperCase();
}
