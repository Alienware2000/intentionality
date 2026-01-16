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
  scheduled_time: string | null;  // HH:MM format for timeline ordering
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

/**
 * Response from task toggle with XP info.
 *
 * @future Reserved for enhanced task completion feedback UI.
 * Will be used to show celebratory animations and detailed XP breakdown
 * when a user completes a task. Currently the API returns this structure
 * but it's not fully utilized in the frontend.
 */
export type TaskToggleResponse = {
  ok: true;
  xpGained?: number;
  newLevel?: number;
  newStreak?: number;
};

// =============================================================================
// HABIT TYPES
// =============================================================================

/**
 * Habit represents a recurring daily action.
 * User owns directly (not tied to quests).
 * Each habit tracks its own streak.
 */
export type Habit = {
  id: Id;
  user_id: string;
  title: string;
  priority: Priority;
  xp_value: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: ISODateString | null;
  created_at: string;
};

/**
 * Habit with computed completion status for today.
 */
export type HabitWithStatus = Habit & {
  completedToday: boolean;
};

/**
 * Habit completion record.
 */
export type HabitCompletion = {
  id: Id;
  habit_id: Id;
  completed_date: ISODateString;
  completed_at: string;
  xp_awarded: number;
};

/**
 * Response from habit toggle with XP/streak info.
 *
 * @future Reserved for enhanced habit completion animations.
 * Will be used to show streak celebrations, XP gain/loss animations,
 * and level-up notifications. Currently the API returns this structure
 * but it's not fully utilized in the frontend.
 */
export type HabitToggleResponse = {
  ok: true;
  xpGained?: number;
  xpLost?: number;
  newStreak: number;
  newLevel?: number;
  newXpTotal: number;
};

// =============================================================================
// SCHEDULE TYPES
// =============================================================================

/** Day of week number (1=Monday, 7=Sunday) */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Schedule block represents a recurring time slot.
 * Used for classes, gym, work, etc.
 */
export type ScheduleBlock = {
  id: Id;
  user_id: string;
  title: string;
  start_time: string;         // HH:MM format (e.g., "09:00")
  end_time: string;           // HH:MM format (e.g., "10:30")
  days_of_week: DayOfWeek[];  // [1,3,5] = Mon/Wed/Fri
  color: string;              // Hex color for display
  location: string | null;    // Optional room/location
  start_date: ISODateString | null;  // When schedule starts
  end_date: ISODateString | null;    // When schedule ends
  is_completable: boolean;    // Can be checked off (gym, study sessions)
  priority: Priority | null;  // For XP calculation if completable
  xp_value: number | null;    // XP awarded on completion
  created_at: string;
};

/**
 * Schedule block with computed fields for display.
 *
 * @future Reserved for week view calendar with schedule blocks.
 * Will be used when implementing a full weekly calendar that shows
 * schedule blocks alongside tasks for each day.
 */
export type ScheduleBlockForDay = ScheduleBlock & {
  date: ISODateString;  // The specific date this instance is for
};

/**
 * Schedule block with today's completion status.
 */
export type ScheduleBlockWithStatus = ScheduleBlock & {
  completedToday: boolean;
};

/**
 * Schedule block completion record.
 */
export type ScheduleBlockCompletion = {
  id: Id;
  block_id: Id;
  completed_date: ISODateString;
  completed_at: string;
  xp_awarded: number;
};

// =============================================================================
// FOCUS SESSION TYPES
// =============================================================================

/** Focus session status */
export type FocusSessionStatus = "active" | "completed" | "abandoned";

/**
 * Focus session represents a Pomodoro-style work session.
 * Awards XP based on duration when completed.
 */
export type FocusSession = {
  id: Id;
  user_id: string;
  task_id: Id | null;           // Optional linked task
  title: string | null;         // Optional session title
  work_duration: number;        // minutes (default 25)
  break_duration: number;       // minutes (default 5)
  started_at: string;           // ISO timestamp
  completed_at: string | null;  // ISO timestamp when finished
  status: FocusSessionStatus;
  xp_awarded: number | null;
  created_at: string;
  task?: Task;                  // Optional joined task
};

/**
 * Response from focus session complete.
 *
 * @future Reserved for focus session completion celebration modal.
 * Will be used to show detailed session summary, XP earned, and
 * congratulatory animations when a focus session is completed.
 */
export type FocusCompleteResponse = {
  ok: true;
  xpGained: number;
  newLevel?: number;
  newXpTotal: number;
  focusMinutesAdded: number;
};

// =============================================================================
// TIMELINE TYPES
// =============================================================================

/**
 * A timeline item can be either a task or a schedule block.
 * Used in the unified DayTimeline component.
 */
export type TimelineItem =
  | { type: "task"; data: Task }
  | { type: "schedule_block"; data: ScheduleBlock; completed: boolean };

/**
 * Response from the day-timeline API.
 */
export type DayTimelineResponse = {
  ok: true;
  date: ISODateString;
  scheduledItems: TimelineItem[];  // Items with times, sorted chronologically
  unscheduledTasks: Task[];        // Tasks without scheduled_time
  overdueTasks: Task[];            // Only for today
};
