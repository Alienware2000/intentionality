// =============================================================================
// AI ACTIONS HANDLER
// Parses and executes actions from AI responses.
//
// LEARNING: Action Extraction from LLM Responses
// -----------------------------------------------
// LLMs generate free-form text, but we often need structured actions.
// There are several approaches to this:
//
// 1. JSON Mode: Tell the AI to respond only in JSON
//    Pros: Clean parsing, no extraction needed
//    Cons: Loses the conversational feel, AI might fail to follow format
//
// 2. Function Calling: Use the API's built-in tool/function features
//    Pros: Reliable, well-defined schemas
//    Cons: More complex setup, not all models support it
//
// 3. Inline Action Tags: Embed structured tags within natural text
//    Pros: Natural conversation + actions, easy to implement
//    Cons: Need regex parsing, AI might malform tags
//
// We use approach #3 (inline action tags) because:
// - Maintains conversational flow
// - Easy for users to understand what actions will be taken
// - Actions are optional - AI can respond without actions
// - We can show action confirmations to users before executing
//
// Format: [ACTION:TYPE:{"json": "payload"}]
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AIAction,
  AIActionType,
  AICreateTaskPayload,
  AIUpdateTaskPayload,
  AICompleteTaskPayload,
  AIStartFocusPayload,
  AICreateHabitPayload,
  AICreateQuestPayload,
  AINavigatePayload,
  AISuggestionType,
  AIInteractionSource,
} from './types';
import { XP_VALUES } from './gamification';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Result of executing an action.
 */
export type ActionExecutionResult = {
  success: boolean;
  action: AIAction;
  message: string;
  data?: Record<string, unknown>;
};

/**
 * Context needed to execute actions.
 */
export type ActionExecutionContext = {
  supabase: SupabaseClient;
  userId: string;
  // Optional context for outcome tracking
  sourceType?: AIInteractionSource;
  sourceId?: string; // Message ID or insight ID that triggered this action
};

/**
 * Options for tracking AI interaction outcomes.
 */
export type OutcomeTrackingOptions = {
  suggestionType: AISuggestionType;
  suggestionContent: string;
  sourceType: AIInteractionSource;
  sourceId?: string;
  taskCreatedId?: string;
};

// -----------------------------------------------------------------------------
// Action Parsing
// -----------------------------------------------------------------------------

/**
 * Regular expression to match action tags in AI responses.
 *
 * LEARNING: Regex for Structured Extraction
 * -----------------------------------------
 * Pattern: [ACTION:TYPE:{"json":"data"}]
 *
 * Breaking down the regex:
 * - \[ACTION:     - Literal match for opening
 * - ([A-Z_]+)     - Capture group for action type (letters and underscores)
 * - :             - Literal colon separator
 * - (\{[^}]*\})   - Capture group for JSON payload (anything in braces)
 * - \]            - Literal closing bracket
 *
 * The 'g' flag finds all matches, not just the first one.
 */
const ACTION_REGEX = /\[ACTION:([A-Z_]+):(\{[^[\]]*\})\]/g;

/**
 * Parse action tags from an AI response.
 *
 * @param response - The full AI response text
 * @returns Array of parsed actions
 *
 * @example
 * const text = "I'll create that task for you. [ACTION:CREATE_TASK:{\"title\":\"Call mom\"}]";
 * const actions = parseActionsFromResponse(text);
 * // => [{ type: 'CREATE_TASK', payload: { title: 'Call mom' } }]
 */
export function parseActionsFromResponse(response: string): AIAction[] {
  const actions: AIAction[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state (important when reusing regex)
  ACTION_REGEX.lastIndex = 0;

  while ((match = ACTION_REGEX.exec(response)) !== null) {
    const [, type, payloadStr] = match;

    // Validate action type
    if (!isValidActionType(type)) {
      console.warn(`Invalid action type: ${type}`);
      continue;
    }

    // Parse JSON payload
    try {
      const payload = JSON.parse(payloadStr);
      actions.push({
        type: type as AIActionType,
        payload,
        confirmed: false,
      });
    } catch (error) {
      console.warn(`Failed to parse action payload: ${payloadStr}`, error);
    }
  }

  return actions;
}

/**
 * Remove action tags from a response to get clean display text.
 *
 * @param response - The full AI response with action tags
 * @returns Clean text without action tags
 */
export function stripActionsFromResponse(response: string): string {
  return response.replace(ACTION_REGEX, '').trim();
}

/**
 * Check if a string is a valid action type.
 */
function isValidActionType(type: string): type is AIActionType {
  const validTypes: AIActionType[] = [
    'CREATE_TASK',
    'UPDATE_TASK',
    'COMPLETE_TASK',
    'DELETE_TASK',
    'START_FOCUS',
    'CREATE_HABIT',
    'CREATE_QUEST',
    'NAVIGATE',
    'OPEN_MODAL',
  ];
  return validTypes.includes(type as AIActionType);
}

// -----------------------------------------------------------------------------
// Action Execution
// -----------------------------------------------------------------------------

/**
 * Execute a single action.
 *
 * LEARNING: Server-Side Action Execution
 * --------------------------------------
 * Actions that modify data should be executed server-side:
 * - Ensures proper authentication via Supabase RLS
 * - Validates payload before database operations
 * - Returns consistent success/error responses
 *
 * Client-side actions (NAVIGATE, OPEN_MODAL) are handled by the frontend.
 *
 * @param action - The action to execute
 * @param ctx - Execution context with Supabase client and user ID
 */
export async function executeAction(
  action: AIAction,
  ctx: ActionExecutionContext
): Promise<ActionExecutionResult> {
  const { supabase, userId } = ctx;

  try {
    switch (action.type) {
      case 'CREATE_TASK':
        return await executeCreateTask(action.payload as AICreateTaskPayload, supabase, userId);

      case 'UPDATE_TASK':
        return await executeUpdateTask(action.payload as AIUpdateTaskPayload, supabase);

      case 'COMPLETE_TASK':
        return await executeCompleteTask(action.payload as AICompleteTaskPayload, supabase);

      case 'START_FOCUS':
        return await executeStartFocus(action.payload as AIStartFocusPayload, supabase, userId);

      case 'CREATE_HABIT':
        return await executeCreateHabit(action.payload as AICreateHabitPayload, supabase, userId);

      case 'CREATE_QUEST':
        return await executeCreateQuest(action.payload as AICreateQuestPayload, supabase, userId);

      case 'NAVIGATE':
      case 'OPEN_MODAL':
        // These are client-side actions, just mark as successful
        return {
          success: true,
          action,
          message: 'Client-side action ready',
        };

      default:
        return {
          success: false,
          action,
          message: `Unknown action type: ${action.type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      action,
      message: error instanceof Error ? error.message : 'Action execution failed',
    };
  }
}

/**
 * Execute multiple actions in sequence.
 */
export async function executeActions(
  actions: AIAction[],
  ctx: ActionExecutionContext
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    // Only execute confirmed actions
    if (!action.confirmed) {
      results.push({
        success: false,
        action,
        message: 'Action not confirmed by user',
      });
      continue;
    }

    const result = await executeAction(action, ctx);
    results.push(result);
  }

  return results;
}

// -----------------------------------------------------------------------------
// Individual Action Executors
// -----------------------------------------------------------------------------

/**
 * Create a new task.
 */
async function executeCreateTask(
  payload: AICreateTaskPayload,
  supabase: SupabaseClient,
  userId: string
): Promise<ActionExecutionResult> {
  // Validate required fields
  if (!payload.title?.trim()) {
    return {
      success: false,
      action: { type: 'CREATE_TASK', payload },
      message: 'Task title is required',
    };
  }

  // Get or create default quest for the user
  let questId = payload.quest_id;
  if (!questId) {
    // Find or create "Personal" quest as default
    const { data: existingQuest } = await supabase
      .from('quests')
      .select('id')
      .eq('user_id', userId)
      .eq('title', 'Personal')
      .is('archived_at', null)
      .single();

    if (existingQuest) {
      questId = existingQuest.id;
    } else {
      // Create default quest
      const { data: newQuest, error: questError } = await supabase
        .from('quests')
        .insert({
          user_id: userId,
          title: 'Personal',
          quest_type: 'user',
        })
        .select('id')
        .single();

      if (questError || !newQuest) {
        return {
          success: false,
          action: { type: 'CREATE_TASK', payload },
          message: 'Failed to create default quest',
        };
      }
      questId = newQuest.id;
    }
  }

  // Use flat XP value (all priorities earn same XP to prevent gaming)
  const priority = payload.priority || 'medium';
  const xpValue = XP_VALUES[priority];

  // Create the task
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      quest_id: questId,
      title: payload.title.trim(),
      due_date: payload.due_date || new Date().toISOString().split('T')[0],
      scheduled_time: payload.scheduled_time || null,
      priority,
      xp_value: xpValue,
      completed: false,
    })
    .select('id, title')
    .single();

  if (error || !task) {
    return {
      success: false,
      action: { type: 'CREATE_TASK', payload },
      message: `Failed to create task: ${error?.message || 'Unknown error'}`,
    };
  }

  // Track this as a successful AI interaction outcome
  await trackInteractionOutcome(
    {
      suggestionType: 'task_suggestion',
      suggestionContent: `Create task: ${payload.title}`,
      sourceType: 'chat',
      taskCreatedId: task.id,
    },
    supabase,
    userId
  );

  return {
    success: true,
    action: { type: 'CREATE_TASK', payload, executedAt: new Date().toISOString() },
    message: `Created task: "${task.title}"`,
    data: { taskId: task.id },
  };
}

/**
 * Update an existing task.
 */
async function executeUpdateTask(
  payload: AIUpdateTaskPayload,
  supabase: SupabaseClient
): Promise<ActionExecutionResult> {
  if (!payload.task_id) {
    return {
      success: false,
      action: { type: 'UPDATE_TASK', payload },
      message: 'Task ID is required',
    };
  }

  const updates: Record<string, unknown> = {};
  if (payload.title) updates.title = payload.title;
  if (payload.due_date) updates.due_date = payload.due_date;
  if (payload.scheduled_time !== undefined) updates.scheduled_time = payload.scheduled_time;
  if (payload.priority) updates.priority = payload.priority;

  if (Object.keys(updates).length === 0) {
    return {
      success: false,
      action: { type: 'UPDATE_TASK', payload },
      message: 'No updates provided',
    };
  }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', payload.task_id);

  if (error) {
    return {
      success: false,
      action: { type: 'UPDATE_TASK', payload },
      message: `Failed to update task: ${error.message}`,
    };
  }

  return {
    success: true,
    action: { type: 'UPDATE_TASK', payload, executedAt: new Date().toISOString() },
    message: 'Task updated successfully',
  };
}

/**
 * Mark a task as complete.
 */
async function executeCompleteTask(
  payload: AICompleteTaskPayload,
  supabase: SupabaseClient
): Promise<ActionExecutionResult> {
  if (!payload.task_id) {
    return {
      success: false,
      action: { type: 'COMPLETE_TASK', payload },
      message: 'Task ID is required',
    };
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', payload.task_id)
    .select('title')
    .single();

  if (error) {
    return {
      success: false,
      action: { type: 'COMPLETE_TASK', payload },
      message: `Failed to complete task: ${error.message}`,
    };
  }

  return {
    success: true,
    action: { type: 'COMPLETE_TASK', payload, executedAt: new Date().toISOString() },
    message: `Completed: "${task?.title}"`,
  };
}

/**
 * Start a focus session.
 * Note: This creates the session record. The actual timer is managed client-side.
 */
async function executeStartFocus(
  payload: AIStartFocusPayload,
  supabase: SupabaseClient,
  userId: string
): Promise<ActionExecutionResult> {
  const { data: session, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      task_id: payload.task_id || null,
      title: payload.title || null,
      work_duration: payload.work_duration || 25,
      break_duration: 5,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !session) {
    return {
      success: false,
      action: { type: 'START_FOCUS', payload },
      message: `Failed to start focus session: ${error?.message || 'Unknown error'}`,
    };
  }

  // Track this as a successful AI interaction outcome
  await trackInteractionOutcome(
    {
      suggestionType: 'focus_suggestion',
      suggestionContent: `Start focus session: ${payload.title || 'Untitled'} (${payload.work_duration || 25}min)`,
      sourceType: 'chat',
    },
    supabase,
    userId
  );

  return {
    success: true,
    action: { type: 'START_FOCUS', payload, executedAt: new Date().toISOString() },
    message: 'Focus session started!',
    data: { sessionId: session.id },
  };
}

/**
 * Create a new habit.
 */
async function executeCreateHabit(
  payload: AICreateHabitPayload,
  supabase: SupabaseClient,
  userId: string
): Promise<ActionExecutionResult> {
  if (!payload.title?.trim()) {
    return {
      success: false,
      action: { type: 'CREATE_HABIT', payload },
      message: 'Habit title is required',
    };
  }

  const priority = payload.priority || 'medium';

  const { data: habit, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      title: payload.title.trim(),
      priority,
      xp_value: XP_VALUES[priority],
      current_streak: 0,
      longest_streak: 0,
    })
    .select('id, title')
    .single();

  if (error || !habit) {
    return {
      success: false,
      action: { type: 'CREATE_HABIT', payload },
      message: `Failed to create habit: ${error?.message || 'Unknown error'}`,
    };
  }

  // Track this as a successful AI interaction outcome
  await trackInteractionOutcome(
    {
      suggestionType: 'habit_suggestion',
      suggestionContent: `Create habit: ${payload.title}`,
      sourceType: 'chat',
    },
    supabase,
    userId
  );

  return {
    success: true,
    action: { type: 'CREATE_HABIT', payload, executedAt: new Date().toISOString() },
    message: `Created habit: "${habit.title}"`,
    data: { habitId: habit.id },
  };
}

/**
 * Create a new quest.
 */
async function executeCreateQuest(
  payload: AICreateQuestPayload,
  supabase: SupabaseClient,
  userId: string
): Promise<ActionExecutionResult> {
  if (!payload.title?.trim()) {
    return {
      success: false,
      action: { type: 'CREATE_QUEST', payload },
      message: 'Quest title is required',
    };
  }

  const { data: quest, error } = await supabase
    .from('quests')
    .insert({
      user_id: userId,
      title: payload.title.trim(),
      quest_type: 'user',
    })
    .select('id, title')
    .single();

  if (error || !quest) {
    return {
      success: false,
      action: { type: 'CREATE_QUEST', payload },
      message: `Failed to create quest: ${error?.message || 'Unknown error'}`,
    };
  }

  // Track this as a successful AI interaction outcome
  await trackInteractionOutcome(
    {
      suggestionType: 'task_suggestion',
      suggestionContent: `Create quest: ${payload.title}`,
      sourceType: 'chat',
    },
    supabase,
    userId
  );

  return {
    success: true,
    action: { type: 'CREATE_QUEST', payload, executedAt: new Date().toISOString() },
    message: `Created quest: "${quest.title}"`,
    data: { questId: quest.id },
  };
}

// -----------------------------------------------------------------------------
// Outcome Tracking Functions
// -----------------------------------------------------------------------------

/**
 * Track an AI interaction outcome.
 *
 * LEARNING: Implicit Feedback Collection
 * --------------------------------------
 * By tracking whether users act on AI suggestions and whether those
 * actions lead to successful outcomes, we can learn:
 * - Which types of advice the user responds to
 * - What suggestions lead to completed tasks
 * - Patterns in advice effectiveness over time
 *
 * This data is used to personalize future suggestions.
 *
 * @param options - Tracking options including suggestion details
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID
 */
export async function trackInteractionOutcome(
  options: OutcomeTrackingOptions,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    await supabase.from('ai_interaction_outcomes').insert({
      user_id: userId,
      suggestion_type: options.suggestionType,
      suggestion_content: options.suggestionContent,
      source_type: options.sourceType,
      source_id: options.sourceId || null,
      action_taken: true,
      action_taken_at: new Date().toISOString(),
      task_created_id: options.taskCreatedId || null,
    });
  } catch (error) {
    // Outcome tracking is non-critical - log and continue
    console.warn('Failed to track AI interaction outcome:', error);
  }
}

/**
 * Record that an AI suggestion was made (before user acts on it).
 * Used to track suggestions that were NOT acted on.
 */
export async function recordSuggestion(
  options: Omit<OutcomeTrackingOptions, 'taskCreatedId'>,
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ai_interaction_outcomes')
      .insert({
        user_id: userId,
        suggestion_type: options.suggestionType,
        suggestion_content: options.suggestionContent,
        source_type: options.sourceType,
        source_id: options.sourceId || null,
        action_taken: false,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to record AI suggestion:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.warn('Failed to record AI suggestion:', error);
    return null;
  }
}

/**
 * Update an outcome record when user acts on a suggestion.
 */
export async function markOutcomeActionTaken(
  outcomeId: string,
  taskCreatedId: string | null,
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    await supabase
      .from('ai_interaction_outcomes')
      .update({
        action_taken: true,
        action_taken_at: new Date().toISOString(),
        task_created_id: taskCreatedId,
      })
      .eq('id', outcomeId)
      .eq('user_id', userId);
  } catch (error) {
    console.warn('Failed to update AI outcome:', error);
  }
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Format an action for display to the user.
 * Creates a human-readable description of what the action will do.
 */
export function formatActionForDisplay(action: AIAction): string {
  switch (action.type) {
    case 'CREATE_TASK': {
      const p = action.payload as AICreateTaskPayload;
      const due = p.due_date ? ` (due ${p.due_date})` : '';
      const priority = p.priority ? ` [${p.priority}]` : '';
      return `Create task: "${p.title}"${due}${priority}`;
    }

    case 'UPDATE_TASK': {
      const p = action.payload as AIUpdateTaskPayload;
      const changes = [];
      if (p.title) changes.push(`title to "${p.title}"`);
      if (p.due_date) changes.push(`due date to ${p.due_date}`);
      if (p.priority) changes.push(`priority to ${p.priority}`);
      return `Update task: ${changes.join(', ')}`;
    }

    case 'COMPLETE_TASK':
      return 'Mark task as complete';

    case 'START_FOCUS': {
      const p = action.payload as AIStartFocusPayload;
      const duration = p.work_duration || 25;
      const title = p.title ? `: ${p.title}` : '';
      return `Start ${duration}min focus session${title}`;
    }

    case 'CREATE_HABIT': {
      const p = action.payload as AICreateHabitPayload;
      return `Create habit: "${p.title}"`;
    }

    case 'CREATE_QUEST': {
      const p = action.payload as AICreateQuestPayload;
      return `Create quest: "${p.title}"`;
    }

    case 'NAVIGATE': {
      const p = action.payload as AINavigatePayload;
      return `Navigate to ${p.path}`;
    }

    case 'OPEN_MODAL':
      return 'Open dialog';

    default:
      return `Action: ${action.type}`;
  }
}

/**
 * Get an icon name for an action type (for UI).
 */
export function getActionIcon(type: AIActionType): string {
  const icons: Record<AIActionType, string> = {
    CREATE_TASK: 'plus-circle',
    UPDATE_TASK: 'edit',
    COMPLETE_TASK: 'check-circle',
    DELETE_TASK: 'trash',
    START_FOCUS: 'play-circle',
    CREATE_HABIT: 'heart',
    CREATE_QUEST: 'target',
    NAVIGATE: 'arrow-right',
    OPEN_MODAL: 'external-link',
  };
  return icons[type] || 'circle';
}
