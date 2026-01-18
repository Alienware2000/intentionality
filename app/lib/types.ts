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
  deleted_at: string | null;  // Soft delete timestamp
  default_work_duration: number | null;  // Minutes (1-180) for focus sessions
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
// BRAIN DUMP TYPES
// =============================================================================

/**
 * Brain dump entry for capturing quick thoughts.
 * Can be processed manually or via AI into tasks/quests.
 */
export type BrainDumpEntry = {
  id: Id;
  user_id: string;
  content: string;
  processed: boolean;
  processed_at: string | null;
  processing_result: BrainDumpProcessingResult | null;
  created_at: string;
};

/**
 * Result from AI processing of a brain dump entry.
 * Contains suggested tasks, quests, and any questions.
 */
export type BrainDumpProcessingResult = {
  tasks: Array<{
    title: string;
    due_date?: string;
    priority: Priority;
    quest_suggestion?: string;
  }>;
  quests?: Array<{
    title: string;
  }>;
  notes?: string;
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

// =============================================================================
// CANVAS INTEGRATION TYPES
// =============================================================================

/**
 * Canvas LMS connection for a user.
 * Stores OAuth credentials and sync settings.
 */
export type CanvasConnection = {
  id: Id;
  user_id: string;
  instance_url: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  selected_courses: string[];
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Synced assignment record linking Canvas assignment to task.
 */
export type SyncedAssignment = {
  id: Id;
  user_id: string;
  canvas_assignment_id: string;
  canvas_course_id: string;
  task_id: Id | null;
  quest_id: Id;
  assignment_name: string;
  due_at: string | null;
  last_synced_at: string;
  created_at: string;
};

/**
 * Canvas course from the Canvas API.
 */
export type CanvasCourse = {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id?: number;
};

/**
 * Canvas assignment from the Canvas API.
 */
export type CanvasAssignment = {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  points_possible: number | null;
  course_id: number;
  html_url: string;
};

// =============================================================================
// CALENDAR IMPORT TYPES
// =============================================================================

/** Import mode for calendar events */
export type CalendarImportMode = "tasks" | "schedule" | "smart";

/**
 * Calendar subscription for ICS feed imports.
 */
export type CalendarSubscription = {
  id: Id;
  user_id: string;
  name: string;
  feed_url: string;
  feed_type: "ics" | "google";
  import_as: CalendarImportMode;
  target_quest_id: Id | null;
  last_synced_at: string | null;
  sync_error: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Google Calendar connection via OAuth.
 */
export type GoogleCalendarConnection = {
  id: Id;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  email: string | null;
  selected_calendars: string[];
  import_as: CalendarImportMode;
  target_quest_id: Id | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Record of an imported event (to avoid duplicates).
 */
export type ImportedEvent = {
  id: Id;
  user_id: string;
  source_type: "ics_subscription" | "ics_upload" | "google";
  source_id: Id | null;
  external_uid: string;
  created_as: "task" | "schedule_block";
  created_id: Id;
  event_hash: string | null;
  created_at: string;
};

// =============================================================================
// AUTO-SYNC TYPES
// =============================================================================

/**
 * Sync status for a single integration (Canvas or Google Calendar).
 * Tracks connection state, sync progress, and any errors.
 */
export type IntegrationSyncStatus = {
  connected: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
};

/**
 * Combined auto-sync state for all integrations.
 * Used by the useAutoSync hook and SyncStatusIndicator component.
 */
export type AutoSyncState = {
  canvas: IntegrationSyncStatus;
  googleCalendar: IntegrationSyncStatus;
  isAnySyncing: boolean;
};
