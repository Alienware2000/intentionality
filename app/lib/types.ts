// =============================================================================
// TYPE DEFINITIONS
// Shared TypeScript types for the Intentionality app.
// These types match the Supabase database schema (snake_case columns).
// =============================================================================

// Type alias for UUIDs (Supabase uses UUIDs for primary keys)
export type Id = string;

// Date strings in YYYY-MM-DD format
export type ISODateString = string;

/** Day of week number (1=Monday, 7=Sunday) - ISO 8601 standard */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  display_name: string | null;
  username: string | null;
  invite_code: string | null;
  referred_by: string | null;
  referral_count: number;
  created_at: string;
};

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/** Quest type - user-created or system (onboarding) */
export type QuestType = 'user' | 'onboarding';

/**
 * Quest represents a high-level goal or mission.
 * Contains related tasks and belongs to a specific user.
 */
export type Quest = {
  id: Id;
  title: string;
  user_id: string;
  quest_type: QuestType;
  archived_at: string | null;
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
  onboarding_step: OnboardingStep | null;  // For onboarding quest tasks only
  weekly_goal_index: number | null;  // Index of weekly goal this task contributes to
  week_start: ISODateString | null;  // Week this task is linked to for goal tracking
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

/** Habit frequency presets */
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';

/** Array of active days for a habit (1=Monday, 7=Sunday) */
export type HabitActiveDays = DayOfWeek[];

/**
 * Habit represents a recurring action on specified days.
 * User owns directly (not tied to quests).
 * Each habit tracks its own streak based on active_days schedule.
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
  frequency: HabitFrequency;
  active_days: HabitActiveDays;
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
 * Sync status for a single integration (Google Calendar).
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
  googleCalendar: IntegrationSyncStatus;
  isAnySyncing: boolean;
};

// =============================================================================
// GAMIFICATION V2 TYPES
// =============================================================================

/** Achievement categories */
export type AchievementCategory = 'streak' | 'tasks' | 'focus' | 'quests' | 'habits' | 'special';

/** Achievement tiers */
export type AchievementTier = 'bronze' | 'silver' | 'gold';

/** Level title tiers */
export type LevelTitle =
  | 'Novice'
  | 'Apprentice'
  | 'Scholar'
  | 'Adept'
  | 'Expert'
  | 'Master'
  | 'Grandmaster'
  | 'Legend'
  | 'Mythic'
  | 'Transcendent'
  | 'Ascended';

/**
 * Achievement definition from database.
 */
export type Achievement = {
  id: Id;
  key: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon_name: string;
  bronze_threshold: number;
  bronze_xp: number;
  silver_threshold: number;
  silver_xp: number;
  gold_threshold: number;
  gold_xp: number;
  stat_key: string;
  sort_order: number;
};

/**
 * User's progress on a specific achievement.
 */
export type UserAchievement = {
  id: Id;
  user_id: string;
  achievement_id: Id;
  current_tier: AchievementTier | null;
  bronze_unlocked_at: string | null;
  silver_unlocked_at: string | null;
  gold_unlocked_at: string | null;
  progress_value: number;
  achievement?: Achievement;
};

/**
 * Achievement with user progress for display.
 */
export type AchievementWithProgress = Achievement & {
  userProgress: UserAchievement | null;
};

/**
 * Daily challenge template from database.
 */
export type DailyChallengeTemplate = {
  id: Id;
  key: string;
  name: string;
  description: string;
  challenge_type: 'tasks' | 'focus' | 'habits' | 'high_priority';
  target_value: number;
  xp_reward: number;
  difficulty: 'easy' | 'medium' | 'hard';
};

/**
 * User's assigned daily challenge.
 */
export type UserDailyChallenge = {
  id: Id;
  user_id: string;
  template_id: Id;
  challenge_date: ISODateString;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  xp_awarded: number;
  template?: DailyChallengeTemplate;
};

/**
 * Weekly challenge template from database.
 */
export type WeeklyChallengeTemplate = {
  id: Id;
  key: string;
  name: string;
  description: string;
  challenge_type: 'tasks' | 'focus' | 'habits' | 'streak' | 'daily_challenges';
  target_value: number;
  xp_reward: number;
};

/**
 * User's assigned weekly challenge.
 */
export type UserWeeklyChallenge = {
  id: Id;
  user_id: string;
  template_id: Id;
  week_start: ISODateString;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  xp_awarded: number;
  template?: WeeklyChallengeTemplate;
};

/**
 * User's streak freeze inventory.
 */
export type UserStreakFreezes = {
  id: Id;
  user_id: string;
  available_freezes: number;
  last_freeze_earned: ISODateString | null;
  last_freeze_used: ISODateString | null;
};

/**
 * User's daily activity log entry.
 */
export type UserActivityLog = {
  id: Id;
  user_id: string;
  activity_date: ISODateString;
  xp_earned: number;
  tasks_completed: number;
  focus_minutes: number;
  habits_completed: number;
  streak_maintained: boolean;
  freeze_used: boolean;
};

/**
 * Extended user profile with gamification v2 stats.
 */
export type UserProfileV2 = UserProfile & {
  lifetime_tasks_completed: number;
  lifetime_high_priority_completed: number;
  lifetime_habits_completed: number;
  lifetime_quests_completed: number;
  lifetime_focus_minutes: number;
  lifetime_perfect_weeks: number;
  lifetime_brain_dumps_processed: number;
  lifetime_early_bird_tasks: number;
  lifetime_night_owl_tasks: number;
  lifetime_long_focus_sessions: number;
  lifetime_streak_recoveries: number;
  achievements_unlocked: number;
  permanent_xp_bonus: number;
  title: LevelTitle;
  // Planning & review stats
  daily_reviews_completed: number;
  weekly_plans_completed: number;
  weekly_goals_completed: number;
  daily_review_streak: number;
  weekly_plan_streak: number;
};

/**
 * Streak multiplier info for XP bonuses.
 */
export type StreakMultiplier = {
  multiplier: number;
  bonusPercent: number;
  nextMilestone: number | null;
  nextMultiplier: number | null;
};

/**
 * Full gamification profile response.
 */
export type GamificationProfile = {
  profile: UserProfileV2;
  levelProgress: {
    currentLevel: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progress: number;
    title: LevelTitle;
    nextTitle: LevelTitle | null;
  };
  streakInfo: {
    currentStreak: number;
    longestStreak: number;
    multiplier: StreakMultiplier;
    freezesAvailable: number;
    lastActiveDate: ISODateString | null;
  };
  achievementsSummary: {
    unlocked: number;
    total: number;
    recentUnlocks: AchievementWithProgress[];
  };
  dailyChallenges: UserDailyChallenge[];
  weeklyChallenge: UserWeeklyChallenge | null;
};

/**
 * XP breakdown showing base and bonuses.
 */
export type XpBreakdown = {
  baseXp: number;
  streakMultiplier: number;
  streakBonus: number;
  permanentBonus: number;
  totalXp: number;
};

/**
 * Result from an action that awards XP.
 *
 * XP TRANSPARENCY:
 * - actionTotalXp = base XP only (no hidden multipliers)
 * - challengeXp and achievementXp are tracked separately for celebration
 * - Total XP = actionTotalXp + challengeXp + achievementXp
 */
export type XpAwardResult = {
  xpBreakdown: XpBreakdown;
  actionTotalXp: number; // Base XP only - for accurate deduction on uncheck
  newXpTotal: number;
  newLevel: number | null;
  leveledUp: boolean;
  newStreak: number;
  streakMilestone: number | null;
  achievementsUnlocked: AchievementWithProgress[];
  challengesCompleted: {
    daily: UserDailyChallenge[];
    weekly: UserWeeklyChallenge | null;
  };
  bonusXp: {
    dailySweep: boolean; // Deprecated - kept for compatibility
    perfectDay: boolean; // Deprecated - kept for compatibility
    firstAction: boolean; // Deprecated - kept for compatibility
    challengeXp?: number; // XP from completed challenges (for celebration)
    achievementXp?: number; // XP from unlocked achievements (for celebration)
  };
};

/**
 * Celebration event types for animations.
 */
export type CelebrationEventType =
  | 'xp'
  | 'level-up'
  | 'streak'
  | 'achievement-bronze'
  | 'achievement-silver'
  | 'achievement-gold'
  | 'challenge-complete'
  | 'daily-sweep'
  | 'streak-milestone'
  | 'perfect-day';

/**
 * Celebration event for triggering animations.
 */
export type CelebrationEvent = {
  type: CelebrationEventType;
  value?: number;
  achievement?: AchievementWithProgress;
  challenge?: UserDailyChallenge | UserWeeklyChallenge;
};

// =============================================================================
// ONBOARDING TYPES
// =============================================================================

/**
 * Onboarding checklist step identifiers.
 * Tier 1 (Essential): create_quest, add_task, focus_session
 * Tier 2 (Power User): create_habit, brain_dump, meet_kofi
 * Legacy (hidden from UI): complete_task, weekly_plan, daily_review
 */
export type OnboardingStep =
  | 'create_quest'
  | 'add_task'
  | 'create_habit'
  | 'complete_task'  // Legacy - hidden from UI
  | 'brain_dump'
  | 'focus_session'
  | 'weekly_plan'    // Legacy - hidden from UI
  | 'daily_review'   // Legacy - hidden from UI
  | 'meet_kofi';     // NEW - Chat with Kofi AI

/** Onboarding tier for progressive disclosure */
export type OnboardingTier = 'essential' | 'power' | 'complete';

/**
 * User's onboarding progress stored in profile.
 */
export type OnboardingProgress = {
  completed_steps: OnboardingStep[];
  current_tier: OnboardingTier;
  dismissed: boolean;
  started_at: string;
  completed_at: string | null;
};

// =============================================================================
// PLANNING & REVIEW TYPES
// =============================================================================

/**
 * Daily reflection/review entry.
 */
export type DailyReflection = {
  id: Id;
  user_id: string;
  date: ISODateString;
  wins: string[];
  challenges: string[];
  tomorrow_priorities: string[];
  mood: number | null;         // 1-5 scale
  energy: number | null;       // 1-5 scale
  notes: string | null;
  xp_awarded: number;          // XP for completing review/reflection
  planning_completed: boolean; // Whether 3+ tasks were created for tomorrow
  planning_xp_awarded: number; // XP for completing planning
  created_at: string;
};

/**
 * Enhanced weekly goal with optional quest linking.
 */
export type WeeklyGoal = {
  text: string;
  quest_id?: Id | null;
};

/**
 * Weekly planning entry.
 * Note: goals can be either string[] (legacy) or WeeklyGoal[] (enhanced).
 * Use normalizeGoals() helper to convert to consistent format.
 */
export type WeeklyPlan = {
  id: Id;
  user_id: string;
  week_start: ISODateString;   // Monday of the week
  goals: string[] | WeeklyGoal[];  // 3-5 weekly goals (string[] for legacy, WeeklyGoal[] for enhanced)
  focus_areas: string[];
  review_notes: string | null; // End of week reflection
  xp_awarded: number;
  created_at: string;
};

/**
 * Response from daily review API.
 */
export type DailyReviewResponse = {
  ok: true;
  reflection: DailyReflection;
  xpGained?: number;
  newLevel?: number;
  isNew: boolean;
};

/**
 * Response from weekly plan API.
 */
export type WeeklyPlanResponse = {
  ok: true;
  plan: WeeklyPlan;
  xpGained?: number;
  newLevel?: number;
  isNew: boolean;
};

/**
 * A highlight item from today's accomplishments.
 */
export type DailySummaryHighlight = {
  type: 'task' | 'habit';
  title: string;
  xp: number;
};

/**
 * Daily summary stats for review.
 */
export type DailySummary = {
  date: ISODateString;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  xpEarned: number;
  focusMinutes: number;
  streakMaintained: boolean;
  highlights: DailySummaryHighlight[];
};

/**
 * Weekly summary stats for planning.
 */
export type WeeklySummary = {
  weekStart: ISODateString;
  weekEnd: ISODateString;
  tasksCompleted: number;
  questsProgressed: number;
  xpEarned: number;
  focusMinutes: number;
  dailyReviewsCompleted: number;
  averageMood: number | null;
  averageEnergy: number | null;
};

// =============================================================================
// SMART ASSISTANT TYPES
// =============================================================================

/**
 * Recommendation types for the daily briefing.
 */
export type RecommendationType =
  | 'urgent'              // High-priority overdue tasks
  | 'streak_at_risk'      // Streak might be lost
  | 'weekly_goal'         // Behind on weekly goals
  | 'heavy_day'           // Too many tasks today
  | 'quest_progress'      // Quest close to completion
  | 'habit_reminder'      // Daily habits not done
  | 'planning_needed'     // Weekly plan due (Sunday/Monday)
  | 'planning_prompt'     // Gentle prompt to plan (any day, no plan exists)
  | 'review_reminder'     // Daily review reminder
  | 'milestone_countdown' // Close to streak milestone
  | 'best_day'            // User's statistically best productivity day
  | 'optimal_focus_time'; // Good time to start a focus session

/**
 * A single recommendation for the daily briefing.
 */
export type DailyRecommendation = {
  type: RecommendationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  relatedId?: Id;   // Task, quest, or habit ID
};

/**
 * Natural language parsed task input.
 */
export type ParsedTaskInput = {
  title: string;
  due_date: ISODateString | null;
  priority: Priority | null;
  scheduled_time: string | null;  // HH:MM format
  confidence: number;             // 0-1 confidence score
};

// =============================================================================
// AI ASSISTANT TYPES
// =============================================================================

/**
 * AI conversation stored in database.
 * Groups related messages together.
 */
export type AIConversation = {
  id: Id;
  user_id: string;
  title: string | null;
  created_at: string;
};

/**
 * Message role in AI conversations.
 * - user: Messages from the human
 * - assistant: Messages from the AI
 * - system: System-level messages (not typically stored)
 */
export type AIMessageRole = 'user' | 'assistant' | 'system';

/**
 * AI message stored in database.
 * Part of a conversation thread.
 */
export type AIMessage = {
  id: Id;
  conversation_id: Id;
  user_id: string;
  role: AIMessageRole;
  content: string;
  metadata: AIMessageMetadata;
  created_at: string;
};

/**
 * Metadata attached to AI messages.
 * Tracks token usage, actions, and processing details.
 */
export type AIMessageMetadata = {
  promptTokens?: number;
  completionTokens?: number;
  actions?: AIAction[];
  processingTimeMs?: number;
  model?: string;
};

/**
 * User's AI preferences for personalization.
 */
export type UserAIPreferences = {
  id: Id;
  user_id: string;
  proactive_enabled: boolean;
  communication_style: AICommunicationStyle;
  created_at: string;
};

/**
 * AI communication styles.
 * - friendly: Warm, encouraging, uses casual language
 * - professional: Concise, focused, formal tone
 * - minimal: Very brief responses, just the essentials
 */
export type AICommunicationStyle = 'friendly' | 'professional' | 'minimal';

/**
 * Action types the AI can suggest or execute.
 * These are parsed from AI responses and can be confirmed by the user.
 */
export type AIActionType =
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'COMPLETE_TASK'
  | 'DELETE_TASK'
  | 'START_FOCUS'
  | 'CREATE_HABIT'
  | 'CREATE_QUEST'
  | 'NAVIGATE'
  | 'OPEN_MODAL';

/**
 * Base structure for AI actions.
 * Each action type has specific payload requirements.
 */
export type AIAction = {
  type: AIActionType;
  payload: Record<string, unknown>;
  confirmed?: boolean;
  executedAt?: string;
};

/**
 * Specific action payloads for type safety.
 */
export type AICreateTaskPayload = {
  title: string;
  due_date?: ISODateString;
  scheduled_time?: string;
  priority?: Priority;
  quest_id?: Id;
};

export type AIUpdateTaskPayload = {
  task_id: Id;
  title?: string;
  due_date?: ISODateString;
  scheduled_time?: string;
  priority?: Priority;
};

export type AICompleteTaskPayload = {
  task_id: Id;
};

export type AIStartFocusPayload = {
  task_id?: Id;
  title?: string;
  work_duration?: number;
};

export type AICreateHabitPayload = {
  title: string;
  priority?: Priority;
};

export type AICreateQuestPayload = {
  title: string;
};

export type AINavigatePayload = {
  path: string;
};

/**
 * Proactive AI insight stored in database.
 * Generated based on user patterns and context.
 */
export type AIInsight = {
  id: Id;
  user_id: string;
  insight_type: AIInsightType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  action_type: AIActionType | null;
  action_payload: Record<string, unknown> | null;
  shown_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

/**
 * Types of proactive insights the AI can generate.
 */
export type AIInsightType =
  | 'optimal_focus_time'      // Good time to start a focus session
  | 'workload_warning'        // Heavy day ahead
  | 'streak_risk'             // Complete something to maintain streak
  | 'break_reminder'          // Take a break after long focus
  | 'progress_celebration'    // Weekly milestones reached
  | 'habit_reminder'          // Pending habits
  | 'task_suggestion'         // Suggested task based on patterns
  | 'planning_reminder';      // Time to plan the week

/**
 * User context aggregated for AI prompts.
 * This is the main data structure passed to the AI for personalization.
 */
export type AIUserContext = {
  profile: {
    level: number;
    currentStreak: number;
    xpTotal: number;
    title: string;
  };
  today: {
    date: ISODateString;
    dayOfWeek: string;
    tasks: Array<{
      id: Id;
      title: string;
      priority: Priority;
      completed: boolean;
      scheduled_time: string | null;
    }>;
    completedCount: number;
    totalCount: number;
    habits: Array<{
      id: Id;
      title: string;
      completedToday: boolean;
      currentStreak: number;
    }>;
    scheduleBlocks: Array<{
      title: string;
      start_time: string;
      end_time: string;
    }>;
    focusSessions: Array<{
      title: string | null;
      work_duration: number;
      status: string;
    }>;
  };
  recent: {
    tasksCompletedThisWeek: number;
    averageDailyCompletion: number;
    commonFocusTimes: string[];
    moodTrend: 'improving' | 'stable' | 'declining' | null;
  };
  upcoming: {
    tasksDueTomorrow: Array<{
      id: Id;
      title: string;
      priority: Priority;
    }>;
    overdueCount: number;
    weeklyGoals: string[];
  };
  // Planning context from daily reviews
  planning: {
    yesterdayPriorities: string[];
    recentChallenges: string[];
  };
  preferences: {
    communicationStyle: AICommunicationStyle;
    proactiveEnabled: boolean;
  };
  // Learning context (optional - may not exist for new users)
  learning?: AILearningContext;
};

/**
 * Response from AI chat endpoint.
 */
export type AIChatResponse = {
  ok: true;
  message: string;
  actions: AIAction[];
  conversationId: Id;
  messageId: Id;
};

/**
 * Response from AI process brain dump endpoint.
 */
export type AIProcessBrainDumpResponse = {
  ok: true;
  suggestions: Array<{
    type: 'task' | 'quest' | 'habit';
    title: string;
    due_date?: ISODateString;
    priority?: Priority;
    quest_suggestion?: string;
  }>;
  notes?: string;
};

/**
 * Response from AI insights endpoint.
 */
export type AIInsightsResponse = {
  ok: true;
  insights: AIInsight[];
};

// =============================================================================
// AI PROVIDER TYPES
// =============================================================================

/**
 * Available AI providers.
 * - gemini: Google's Gemini 2.5 Flash-Lite (primary for quality)
 * - groq: Groq's LLaMA 3.3 70B (fallback, high volume)
 */
export type AIProviderType = 'gemini' | 'groq';

/**
 * AI feature types for routing.
 * Each feature has a primary provider and fallback.
 */
export type AIFeatureType = 'chat' | 'briefing' | 'insights' | 'brain_dump';

/**
 * AI usage log entry for tracking.
 */
export type AIUsageLog = {
  id: Id;
  user_id: string;
  feature: AIFeatureType;
  provider: AIProviderType;
  created_at: string;
};

// =============================================================================
// AI LEARNING SYSTEM TYPES
// =============================================================================

/**
 * Work style preferences for the AI to understand user patterns.
 */
export type WorkStyle = 'deep-work' | 'task-switching' | 'balanced';

/**
 * Motivation drivers that help the AI frame advice effectively.
 */
export type MotivationDriver =
  | 'achievement'
  | 'mastery'
  | 'deadline'
  | 'social'
  | 'curiosity'
  | 'competition';

/**
 * Stress indicators that signal when to offer supportive advice.
 */
export type StressIndicator =
  | 'high-task-count'
  | 'broken-streak'
  | 'missed-deadlines'
  | 'long-work-sessions'
  | 'late-night-work';

/**
 * Work hours productivity scores.
 */
export type WorkHoursPreference = {
  morning: number | null;   // 5:00-12:00
  afternoon: number | null; // 12:00-17:00
  evening: number | null;   // 17:00-21:00
  night: number | null;     // 21:00-5:00
};

/**
 * User's learning profile - persistent memory for AI personalization.
 * Stores explicit preferences, goals, and learned behaviors.
 */
export type UserLearningProfile = {
  id: Id;
  user_id: string;
  stated_goals: string[];
  preferred_work_hours: WorkHoursPreference;
  preferred_focus_duration: number;
  work_style: WorkStyle;
  motivation_drivers: MotivationDriver[];
  stress_indicators: StressIndicator[];
  disliked_insight_types: AIInsightType[];
  quiet_hours: string[]; // Format: ["21:00-07:00"]
  learning_enabled: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Suggestion types for AI interaction tracking.
 */
export type AISuggestionType =
  | 'task_suggestion'
  | 'focus_suggestion'
  | 'habit_suggestion'
  | 'break_suggestion'
  | 'planning_suggestion'
  | 'goal_advice'
  | 'general_advice';

/**
 * Source types for AI interactions.
 */
export type AIInteractionSource = 'chat' | 'insight' | 'briefing' | 'brain_dump';

/**
 * Tracks outcomes of AI suggestions to learn what works.
 */
export type AIInteractionOutcome = {
  id: Id;
  user_id: string;
  suggestion_type: AISuggestionType;
  suggestion_content: string;
  source_type: AIInteractionSource;
  source_id: Id | null;
  action_taken: boolean;
  action_taken_at: string | null;
  task_created_id: Id | null;
  outcome_completed: boolean | null;
  outcome_completed_at: string | null;
  time_to_completion_hours: number | null;
  created_at: string;
};

/**
 * Most/least successful advice types with success rates.
 */
export type AdviceSuccessRates = {
  [key: string]: number; // e.g., {"focus_suggestion": 0.8, "task_creation": 0.6}
};

/**
 * Dismissed insights count by type.
 */
export type InsightsDismissedByType = {
  [key: string]: number; // e.g., {"habit_reminder": 5, "workload_warning": 2}
};

/**
 * Precomputed user behavior patterns for AI context.
 * Updated periodically to avoid computing on every request.
 */
export type UserPatternAggregates = {
  id: Id;
  user_id: string;

  // Task patterns
  avg_tasks_per_day: number;
  avg_completion_rate: number;
  best_completion_day: number | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
  worst_completion_day: number | null;

  // Focus patterns
  avg_focus_sessions_per_day: number;
  preferred_focus_hours: number[]; // Hours 0-23
  avg_focus_duration_minutes: number;

  // AI effectiveness
  ai_advice_acceptance_rate: number;
  most_successful_advice_types: AdviceSuccessRates;
  least_successful_advice_types: AdviceSuccessRates;

  // Insight engagement
  insight_engagement_rate: number;
  insight_action_rate: number;
  insights_dismissed_by_type: InsightsDismissedByType;

  // Time patterns
  most_active_hours: number[];
  quiet_period_detected: string | null; // e.g., "21:00-07:00"

  // Metadata
  days_analyzed: number;
  last_computed_at: string;
  created_at: string;
  updated_at: string;
};

/**
 * Extended user context with learning data for AI prompts.
 */
export type AILearningContext = {
  // From UserLearningProfile
  goals: string[];
  workStyle: WorkStyle;
  motivationDrivers: MotivationDriver[];
  preferredFocusDuration: number;
  dislikedInsightTypes: AIInsightType[];
  quietHours: string[];

  // From UserPatternAggregates
  avgCompletionRate: number;
  bestCompletionDay: string | null; // "Tuesday", "Friday", etc.
  preferredFocusHours: string[]; // "9-10 AM", "2-3 PM"
  aiAdviceAcceptanceRate: number;
  mostSuccessfulAdvice: string[]; // Top 3 advice types

  // Computed
  personalizationLevel: 'low' | 'medium' | 'high'; // Based on data availability
};

/**
 * Signals extracted from AI conversations for implicit learning.
 */
export type LearningSignal = {
  type: 'goal_stated' | 'preference_expressed' | 'feedback_given' | 'work_style_indicated';
  content: string;
  confidence: number; // 0.0 to 1.0
  extractedAt: string;
};

/**
 * LLM-extracted signals from user messages.
 * Uses AI to understand natural, unstructured "brain dump" style input
 * that regex patterns would miss.
 */
export type LLMExtractedSignals = {
  /** Detected goals from user message */
  goals: Array<{
    text: string;
    isHypothetical: boolean; // Filter out "If my goal was..."
    confidence: 0.5 | 0.7 | 0.9;
  }>;
  /** Detected work style preference */
  workStyle: {
    preference: 'deep-work' | 'task-switching' | 'balanced' | null;
    evidence: string;
    confidence: number;
  } | null;
  /** Time of day preferences */
  timePreferences: Array<{
    period: 'morning' | 'afternoon' | 'evening' | 'night';
    productivity: 'high' | 'low';
    confidence: number;
  }>;
  /** What motivates the user */
  motivationDrivers: Array<{
    driver: MotivationDriver;
    confidence: number;
  }>;
  /** Things the user explicitly doesn't want */
  dislikes: Array<{
    type: 'insight_type' | 'feature' | 'behavior';
    value: string;
    confidence: number;
  }>;
  /** Preferred focus session length */
  focusDuration: { minutes: number; confidence: number } | null;
  /** True if no learning signals were found */
  noSignalsDetected: boolean;
};

/**
 * Response from the /api/ai/learn endpoint.
 */
export type AILearnResponse = {
  ok: true;
  profile: UserLearningProfile;
  patterns: UserPatternAggregates | null;
};

/**
 * Request body for updating learning profile.
 */
export type AILearnUpdateRequest = {
  stated_goals?: string[];
  preferred_work_hours?: WorkHoursPreference;
  preferred_focus_duration?: number;
  work_style?: WorkStyle;
  motivation_drivers?: MotivationDriver[];
  stress_indicators?: StressIndicator[];
  quiet_hours?: string[];
  learning_enabled?: boolean;
};

// =============================================================================
// SOCIAL FEATURES TYPES
// =============================================================================

// -----------------------------------------------------------------------------
// PRIVACY SETTINGS
// -----------------------------------------------------------------------------

/** Profile visibility level */
export type ProfileVisibility = 'private' | 'friends' | 'public';

/**
 * User's privacy settings for social features.
 * Privacy-first: everything is private by default.
 */
export type UserPrivacySettings = {
  id: Id;
  user_id: string;
  show_on_global_leaderboard: boolean;
  show_xp: boolean;
  show_level: boolean;
  show_streak: boolean;
  show_achievements: boolean;
  show_activity_feed: boolean;
  allow_friend_requests: boolean;
  profile_visibility: ProfileVisibility;
  created_at: string;
  updated_at: string;
};

// -----------------------------------------------------------------------------
// FRIENDSHIPS
// -----------------------------------------------------------------------------

/** Friendship status */
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

/**
 * Friendship record between two users.
 * user_id = requester, friend_id = recipient.
 */
export type Friendship = {
  id: Id;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
};

/**
 * Friend with their profile information.
 * Used for displaying friends list and leaderboards.
 */
export type FriendWithProfile = {
  friendship_id: Id;
  user_id: string;
  status: FriendshipStatus;
  display_name: string | null;
  username: string | null;
  xp_total: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  title: LevelTitle;
  is_requester: boolean; // True if the current user sent the request
  requested_at: string;
  responded_at: string | null;
};

/**
 * Friend request for the pending requests list.
 */
export type FriendRequest = {
  id: Id;
  from_user_id: string;
  from_display_name: string | null;
  from_username: string | null;
  from_level: number;
  from_current_streak: number;
  requested_at: string;
};

// -----------------------------------------------------------------------------
// GROUPS
// -----------------------------------------------------------------------------

/**
 * Accountability group for mutual support.
 */
export type Group = {
  id: Id;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  max_members: number;
  is_public: boolean;
  member_count: number;
  total_xp: number;
  created_at: string;
  updated_at: string;
};

/** Group member role */
export type GroupMemberRole = 'owner' | 'admin' | 'member';

/**
 * Group membership record.
 */
export type GroupMember = {
  id: Id;
  group_id: Id;
  user_id: string;
  role: GroupMemberRole;
  weekly_xp: number;
  joined_at: string;
};

/**
 * Group member with profile information.
 * Used for displaying group members list.
 */
export type GroupMemberWithProfile = GroupMember & {
  display_name: string | null;
  xp_total: number;
  level: number;
  current_streak: number;
  title: LevelTitle;
};

/**
 * Group with user's membership info.
 * Used for displaying user's groups list.
 */
export type GroupWithMembership = Group & {
  my_role: GroupMemberRole;
  my_weekly_xp: number;
  joined_at: string;
};

// -----------------------------------------------------------------------------
// LEADERBOARDS
// -----------------------------------------------------------------------------

/** Leaderboard type */
export type LeaderboardType = 'global' | 'weekly' | 'monthly';

/** Leaderboard metric */
export type LeaderboardMetric = 'xp' | 'streak' | 'level' | 'tasks' | 'focus';

/**
 * Single entry in a leaderboard.
 */
export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  value: number;
  level?: number;
  current_streak?: number;
  is_current_user: boolean;
  is_friend?: boolean;
};

/**
 * Cached leaderboard entry from database.
 */
export type LeaderboardCacheEntry = {
  id: Id;
  leaderboard_type: LeaderboardType;
  metric: LeaderboardMetric;
  user_id: string;
  rank: number;
  value: number;
  display_name: string | null;
  computed_at: string;
  period_start: ISODateString | null;
};

/**
 * Full leaderboard response.
 */
export type LeaderboardResponse = {
  ok: true;
  leaderboard_type: LeaderboardType;
  metric: LeaderboardMetric;
  period_start: ISODateString | null;
  entries: LeaderboardEntry[];
  my_rank: number | null;
  my_value: number | null;
  total_participants: number;
};

// -----------------------------------------------------------------------------
// ACTIVITY FEED
// -----------------------------------------------------------------------------

/** Activity types for the feed */
export type ActivityType =
  | 'task_completed'
  | 'quest_completed'
  | 'level_up'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'habit_streak'
  | 'joined_group'
  | 'focus_milestone';

/**
 * Single activity in the feed.
 */
export type ActivityFeedItem = {
  id: Id;
  user_id: string;
  activity_type: ActivityType;
  metadata: Record<string, unknown>;
  message: string;
  reference_type: string | null;
  reference_id: Id | null;
  created_at: string;
};

/**
 * Activity with user info for display.
 */
export type ActivityFeedItemWithUser = ActivityFeedItem & {
  display_name: string | null;
  level: number;
};

// -----------------------------------------------------------------------------
// NOTIFICATIONS
// -----------------------------------------------------------------------------

/** Social notification types */
export type SocialNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'group_joined'
  | 'nudge'
  | 'achievement_shared'
  | 'streak_milestone_friend'
  | 'level_up_friend';

/**
 * Social notification.
 */
export type SocialNotification = {
  id: Id;
  user_id: string;
  type: SocialNotificationType;
  title: string;
  body: string | null;
  from_user_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

/**
 * Notification with sender info.
 */
export type NotificationWithSender = SocialNotification & {
  from_display_name: string | null;
  from_level: number | null;
};

// -----------------------------------------------------------------------------
// NUDGES
// -----------------------------------------------------------------------------

/** Nudge types for different encouragement contexts */
export type NudgeType = 'encouragement' | 'streak_reminder' | 'challenge' | 'celebration';

/**
 * Nudge between friends.
 */
export type Nudge = {
  id: Id;
  from_user_id: string;
  to_user_id: string;
  message: string | null;
  nudge_type: NudgeType;
  created_at: string;
};

/**
 * Nudge with sender info for display.
 */
export type NudgeWithSender = Nudge & {
  from_display_name: string | null;
  from_level: number;
  from_current_streak: number;
};

// -----------------------------------------------------------------------------
// API RESPONSES
// -----------------------------------------------------------------------------

/**
 * Response from friends list endpoint.
 */
export type FriendsListResponse = {
  ok: true;
  friends: FriendWithProfile[];
  pending_requests: FriendRequest[];
  sent_requests: FriendWithProfile[];
};

/**
 * Response from send friend request endpoint.
 */
export type FriendRequestResponse = {
  ok: true;
  friendship: Friendship;
  message: string;
};

/**
 * Response from groups list endpoint.
 */
export type GroupsListResponse = {
  ok: true;
  groups: GroupWithMembership[];
};

/**
 * Response from group detail endpoint.
 */
export type GroupDetailResponse = {
  ok: true;
  group: Group;
  members: GroupMemberWithProfile[];
  my_membership: GroupMember | null;
};

/**
 * Response from group join endpoint.
 */
export type GroupJoinResponse = {
  ok: true;
  group: Group;
  membership: GroupMember;
  message: string;
};

/**
 * Response from activity feed endpoint.
 */
export type ActivityFeedResponse = {
  ok: true;
  activities: ActivityFeedItemWithUser[];
  has_more: boolean;
  next_cursor: string | null;
};

/**
 * Response from notifications endpoint.
 */
export type NotificationsResponse = {
  ok: true;
  notifications: NotificationWithSender[];
  unread_count: number;
};

/**
 * Response from nudge endpoint.
 */
export type NudgeResponse = {
  ok: true;
  nudge: Nudge;
  message: string;
};

/**
 * Response from user search endpoint.
 */
export type UserSearchResult = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  level: number;
  current_streak: number;
  title: LevelTitle;
  is_friend: boolean;
  has_pending_request: boolean;
};

export type UserSearchResponse = {
  ok: true;
  users: UserSearchResult[];
};

// -----------------------------------------------------------------------------
// SOCIAL CONTEXT FOR PROVIDERS
// -----------------------------------------------------------------------------

/**
 * Social state for the SocialProvider context.
 */
export type SocialState = {
  friends: FriendWithProfile[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendWithProfile[];
  groups: GroupWithMembership[];
  notifications: NotificationWithSender[];
  unreadNotificationCount: number;
  isLoading: boolean;
  error: string | null;
};

/**
 * Social actions available in the SocialProvider.
 */
export type SocialActions = {
  // Friends
  refreshFriends: () => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<boolean>;
  acceptFriendRequest: (friendshipId: Id) => Promise<boolean>;
  rejectFriendRequest: (friendshipId: Id) => Promise<boolean>;
  removeFriend: (friendshipId: Id) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;

  // Groups
  refreshGroups: () => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<Group | null>;
  joinGroup: (inviteCode: string) => Promise<boolean>;
  leaveGroup: (groupId: Id) => Promise<boolean>;

  // Notifications
  refreshNotifications: () => Promise<void>;

  // Nudges
  sendNudge: (toUserId: string, message?: string, nudgeType?: NudgeType) => Promise<boolean>;

  // Search
  searchUsers: (query: string) => Promise<UserSearchResult[]>;
};

// -----------------------------------------------------------------------------
// SOCIAL ENHANCEMENTS TYPES
// Weekly cycles, group challenges, and accountability features
// -----------------------------------------------------------------------------

/**
 * Group weekly history record for archived results.
 */
export type GroupWeeklyHistory = {
  id: Id;
  group_id: Id;
  week_start: ISODateString;
  week_end: ISODateString;
  first_place_user_id: string | null;
  first_place_xp: number;
  second_place_user_id: string | null;
  second_place_xp: number | null;
  third_place_user_id: string | null;
  third_place_xp: number | null;
  total_group_xp: number;
  participant_count: number;
  created_at: string;
};

/**
 * Weekly history with user display names for podium.
 */
export type GroupWeeklyHistoryWithNames = GroupWeeklyHistory & {
  first_place_name: string | null;
  second_place_name: string | null;
  third_place_name: string | null;
};

/**
 * Group challenge template from database.
 */
export type GroupChallengeTemplate = {
  id: Id;
  name: string;
  description: string | null;
  challenge_type: 'tasks' | 'focus' | 'habits' | 'xp';
  target_per_member: number;
  xp_reward_per_member: number;
  is_active: boolean;
  created_at: string;
};

/**
 * Active weekly group challenge.
 */
export type GroupChallenge = {
  id: Id;
  group_id: Id;
  week_start: ISODateString;
  template_id: Id | null;
  name: string;
  description: string | null;
  challenge_type: 'tasks' | 'focus' | 'habits' | 'xp';
  target_value: number;
  current_progress: number;
  completed: boolean;
  completed_at: string | null;
  xp_reward_per_member: number;
  created_at: string;
};

/**
 * Group member streak status for accountability.
 */
export type GroupMemberStreakStatus = {
  id: Id;
  group_id: Id;
  user_id: string;
  last_productive_action: string | null;
  is_at_risk: boolean;
  last_nudged_at: string | null;
  nudge_count_today: number;
  created_at: string;
  updated_at: string;
};

/**
 * At-risk member with profile info for nudge display.
 */
export type AtRiskMember = {
  user_id: string;
  display_name: string | null;
  level: number;
  current_streak: number;
  last_productive_action: string | null;
  hours_inactive: number;
  can_nudge: boolean;
};

/**
 * Response from group history endpoint.
 */
export type GroupHistoryResponse = {
  ok: true;
  history: GroupWeeklyHistoryWithNames[];
};

/**
 * Response from group challenge endpoint.
 */
export type GroupChallengeResponse = {
  ok: true;
  challenge: GroupChallenge | null;
  progress_percentage: number;
};

/**
 * Response from at-risk members endpoint.
 */
export type GroupAtRiskResponse = {
  ok: true;
  at_risk_members: AtRiskMember[];
};

/**
 * Response from group nudge endpoint.
 */
export type GroupNudgeResponse = {
  ok: true;
  message: string;
};

/**
 * Response from update activity status endpoint.
 */
export type UpdateActivityResponse = {
  ok: true;
  current_activity: string | null;
};

/**
 * Weekly awards display data for podium.
 */
export type WeeklyAwards = {
  week_start: ISODateString;
  week_end: ISODateString;
  first_place: {
    user_id: string;
    display_name: string | null;
    xp: number;
    xp_bonus: number;
  } | null;
  second_place: {
    user_id: string;
    display_name: string | null;
    xp: number;
    xp_bonus: number;
  } | null;
  third_place: {
    user_id: string;
    display_name: string | null;
    xp: number;
    xp_bonus: number;
  } | null;
  total_group_xp: number;
};
