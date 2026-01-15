// =============================================================================
// TYPE DEFINITIONS
// Shared TypeScript types for the Intentionality app.
// These types match the Supabase database schema (snake_case columns).
// =============================================================================

// Type alias for UUIDs (Supabase uses UUIDs for primary keys)
export type Id = string;

// Date strings in YYYY-MM-DD format
export type ISODateString = string;

// =============================================================================
// GAMIFICATION TYPES
// =============================================================================

/** Task priority levels */
export type Priority = "low" | "medium" | "high";

/**
 * User's gamification profile.
 * Tracks XP, level, and streaks.
 */
export type UserProfile = {
  id: Id;
  user_id: string;
  xp_total: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: ISODateString | null;
  created_at: string;
};

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/**
 * Quest represents a high-level goal or mission.
 * Contains related tasks and belongs to a specific user.
 */
export type Quest = {
  id: Id;
  title: string;
  user_id: string;
  created_at: string;
  tasks?: Task[];
};

/**
 * Task represents an individual action item.
 * Always belongs to a quest.
 */
export type Task = {
  id: Id;
  quest_id: Id;
  title: string;
  due_date: ISODateString;
  completed: boolean;
  completed_at: string | null;
  priority: Priority;
  xp_value: number;
  created_at: string;
  quest?: Quest;
};

/**
 * Task with computed status field for UI display.
 */
export type TaskWithStatus = Task & {
  status: "planned" | "overdue" | "done";
};

/**
 * Group of tasks for a specific day.
 * Used in week view for organizing tasks by date.
 */
export type DayGroup = {
  date: ISODateString;
  tasks: Task[];
};

// =============================================================================
// API RESPONSE TYPES
// Standard wrapper types for API responses.
// =============================================================================

export type ApiSuccessResponse<T> = {
  ok: true;
} & T;

export type ApiErrorResponse = {
  ok: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Response from task toggle with XP info */
export type TaskToggleResponse = {
  ok: true;
  xpGained?: number;
  newLevel?: number;
  newStreak?: number;
};
