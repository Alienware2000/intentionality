// =============================================================================
// USE WEEKLY PLAN WIZARD HOOK
// State management for AI-powered weekly planning with user-driven day selection.
// Flow: choice → ai-input → processing → review (select days) → result
// =============================================================================

import { useState, useCallback } from "react";
import type { ISODateString, Priority } from "@/app/lib/types";
import type { ModalView, DayKey } from "../constants";
import { REVIEW_CONFIG } from "../constants";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Task suggestion from AI (before day selection).
 */
export type AITaskSuggestion = {
  title: string;
  due_date: ISODateString;
  priority: Priority;
  category: "major" | "have-to" | "quick-win";
};

/**
 * Task suggestion with user-controlled state.
 */
export type ReviewTaskSuggestion = {
  id: string;
  title: string;
  priority: Priority;
  category: "major" | "have-to" | "quick-win";
  detected_day?: DayKey;
  selected_day: DayKey;
  selected_quest_id: string | null; // Per-task quest selection
  included: boolean;
  original_text: string;
};

/**
 * Habit suggestion from AI.
 */
export type AIHabitSuggestion = {
  title: string;
  frequency: "daily" | "weekdays" | "3x_week";
};

/**
 * Parsed result from AI (suggestions before creation).
 */
export type ParsedSuggestions = {
  suggestions: Array<{
    title: string;
    priority: Priority;
    category: "major" | "have-to" | "quick-win";
    detected_day?: string;
    original_text: string;
  }>;
  habits: AIHabitSuggestion[];
  advice?: string;
};

/**
 * Result from AI weekly plan processing (after creation).
 */
export type AIResult = {
  tasks: AITaskSuggestion[];
  habits: AIHabitSuggestion[];
  advice?: string;
  tasksCreated: number;
  habitsCreated: number;
  xpGained: number;
  xpAlreadyClaimed?: boolean;
};

/**
 * Wizard state.
 */
export type WizardState = {
  view: ModalView;
  brainDumpText: string;
  isProcessing: boolean;
  error: string | null;
  // Review state
  suggestions: ReviewTaskSuggestion[];
  habitSuggestions: AIHabitSuggestion[];
  aiAdvice?: string;
  // Final result
  result: AIResult | null;
};

/**
 * Wizard actions.
 */
export type WizardActions = {
  // View navigation
  setView: (view: ModalView) => void;
  goToChoice: () => void;
  goToAIInput: () => void;

  // Brain dump text
  setBrainDumpText: (text: string) => void;
  clearBrainDumpText: () => void;

  // AI processing (parse only)
  parseWithAI: (weekStart: ISODateString) => Promise<boolean>;

  // Review actions
  updateTaskDay: (taskId: string, day: DayKey) => void;
  updateTaskQuest: (taskId: string, questId: string) => void;
  toggleTaskIncluded: (taskId: string) => void;
  removeTask: (taskId: string) => void;

  // Create tasks with selected days
  createTasks: (weekStart: ISODateString) => Promise<AIResult | null>;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Generate a unique ID for tasks.
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Convert detected day string to DayKey.
 */
function normalizeDayKey(day?: string): DayKey | undefined {
  if (!day) return undefined;
  const lower = day.toLowerCase();
  const validDays: DayKey[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  return validDays.find((d) => d === lower);
}

/**
 * Get date string for a day in the given week.
 */
function getDayDate(weekStart: ISODateString, dayKey: DayKey): ISODateString {
  const dayIndex: Record<DayKey, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };

  const start = new Date(weekStart);
  start.setDate(start.getDate() + dayIndex[dayKey]);
  return start.toISOString().split("T")[0] as ISODateString;
}

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------

const INITIAL_STATE: WizardState = {
  view: "choice",
  brainDumpText: "",
  isProcessing: false,
  error: null,
  suggestions: [],
  habitSuggestions: [],
  aiAdvice: undefined,
  result: null,
};

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useWeeklyPlanWizard(
  weekStart: ISODateString
): { state: WizardState; actions: WizardActions } {
  const [state, setState] = useState<WizardState>(() => INITIAL_STATE);

  // ---------------------------------------------------------------------------
  // View Navigation
  // ---------------------------------------------------------------------------

  const setView = useCallback((view: ModalView) => {
    setState((s) => ({ ...s, view, error: null }));
  }, []);

  const goToChoice = useCallback(() => {
    setState((s) => ({ ...s, view: "choice", error: null }));
  }, []);

  const goToAIInput = useCallback(() => {
    setState((s) => ({ ...s, view: "ai-input", error: null }));
  }, []);

  // ---------------------------------------------------------------------------
  // Brain Dump Text
  // ---------------------------------------------------------------------------

  const setBrainDumpText = useCallback((text: string) => {
    setState((s) => ({ ...s, brainDumpText: text, error: null }));
  }, []);

  const clearBrainDumpText = useCallback(() => {
    setState((s) => ({ ...s, brainDumpText: "" }));
  }, []);

  // ---------------------------------------------------------------------------
  // AI Parsing (Returns suggestions for review)
  // ---------------------------------------------------------------------------

  const parseWithAI = useCallback(
    async (weekStartDate: ISODateString): Promise<boolean> => {
      const text = state.brainDumpText.trim();

      if (text.length < 10) {
        setState((s) => ({
          ...s,
          error: "Please add more details about your week (at least 10 characters).",
        }));
        return false;
      }

      setState((s) => ({
        ...s,
        view: "ai-processing",
        isProcessing: true,
        error: null,
      }));

      try {
        const response = await fetch("/api/ai/weekly-plan/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brain_dump_text: text,
            week_start: weekStartDate,
          }),
        });

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "Failed to process your input");
        }

        const parsed = data as ParsedSuggestions;

        // Convert to ReviewTaskSuggestion with IDs and default days
        const suggestions: ReviewTaskSuggestion[] = (parsed.suggestions || []).map((s) => {
          const detectedDay = normalizeDayKey(s.detected_day);
          return {
            id: generateId(),
            title: s.title,
            priority: s.priority,
            category: s.category,
            detected_day: detectedDay,
            selected_day: detectedDay || REVIEW_CONFIG.defaultDay,
            selected_quest_id: null, // Will be set to default quest in modal
            included: true,
            original_text: s.original_text,
          };
        });

        setState((s) => ({
          ...s,
          view: "ai-review",
          isProcessing: false,
          suggestions,
          habitSuggestions: parsed.habits || [],
          aiAdvice: parsed.advice,
          error: null,
        }));

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Something went wrong. Please try again.";

        setState((s) => ({
          ...s,
          view: "ai-input",
          isProcessing: false,
          error: errorMessage,
        }));

        return false;
      }
    },
    [state.brainDumpText]
  );

  // ---------------------------------------------------------------------------
  // Review Actions
  // ---------------------------------------------------------------------------

  const updateTaskDay = useCallback((taskId: string, day: DayKey) => {
    setState((s) => ({
      ...s,
      suggestions: s.suggestions.map((t) =>
        t.id === taskId ? { ...t, selected_day: day } : t
      ),
    }));
  }, []);

  const toggleTaskIncluded = useCallback((taskId: string) => {
    setState((s) => ({
      ...s,
      suggestions: s.suggestions.map((t) =>
        t.id === taskId ? { ...t, included: !t.included } : t
      ),
    }));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setState((s) => ({
      ...s,
      suggestions: s.suggestions.filter((t) => t.id !== taskId),
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Quest Selection (per-task)
  // ---------------------------------------------------------------------------

  const updateTaskQuest = useCallback((taskId: string, questId: string) => {
    setState((s) => ({
      ...s,
      suggestions: s.suggestions.map((t) =>
        t.id === taskId ? { ...t, selected_quest_id: questId } : t
      ),
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Create Tasks
  // ---------------------------------------------------------------------------

  const createTasks = useCallback(
    async (weekStartDate: ISODateString): Promise<AIResult | null> => {
      const includedTasks = state.suggestions.filter((t) => t.included);

      if (includedTasks.length === 0) {
        setState((s) => ({
          ...s,
          error: "Please include at least one task.",
        }));
        return null;
      }

      setState((s) => ({
        ...s,
        isProcessing: true,
        error: null,
      }));

      try {
        // Create tasks with user-selected dates and quests
        const tasksToCreate = includedTasks.map((t) => ({
          title: t.title,
          due_date: getDayDate(weekStartDate, t.selected_day),
          priority: t.priority,
          quest_id: t.selected_quest_id || undefined,
        }));

        const response = await fetch("/api/tasks/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: tasksToCreate,
            week_start: weekStartDate,
          }),
        });

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "Failed to create tasks");
        }

        // Create habits if any
        let habitsCreated = 0;
        if (state.habitSuggestions.length > 0) {
          // Create habits one by one using existing API
          for (const habit of state.habitSuggestions) {
            try {
              const habitRes = await fetch("/api/habits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: habit.title,
                  frequency: habit.frequency === "3x_week" ? "custom" : habit.frequency,
                  active_days:
                    habit.frequency === "daily"
                      ? [1, 2, 3, 4, 5, 6, 7]
                      : habit.frequency === "weekdays"
                        ? [1, 2, 3, 4, 5]
                        : [1, 3, 5],
                }),
              });
              if (habitRes.ok) {
                habitsCreated++;
              }
            } catch {
              // Ignore individual habit creation errors
            }
          }
        }

        // Build result
        const result: AIResult = {
          tasks: includedTasks.map((t) => ({
            title: t.title,
            due_date: getDayDate(weekStartDate, t.selected_day),
            priority: t.priority,
            category: t.category,
          })),
          habits: state.habitSuggestions,
          advice: state.aiAdvice,
          tasksCreated: data.tasksCreated || 0,
          habitsCreated,
          xpGained: data.xpGained || 0,
          xpAlreadyClaimed: data.xpAlreadyClaimed || false,
        };

        setState((s) => ({
          ...s,
          view: "ai-result",
          isProcessing: false,
          result,
          error: null,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create tasks. Please try again.";

        setState((s) => ({
          ...s,
          isProcessing: false,
          error: errorMessage,
        }));

        return null;
      }
    },
    [state.suggestions, state.habitSuggestions, state.aiAdvice]
  );

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  const setError = useCallback((error: string | null) => {
    setState((s) => ({ ...s, error }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    state,
    actions: {
      setView,
      goToChoice,
      goToAIInput,
      setBrainDumpText,
      clearBrainDumpText,
      parseWithAI,
      updateTaskDay,
      updateTaskQuest,
      toggleTaskIncluded,
      removeTask,
      createTasks,
      setError,
      clearError,
      reset,
    },
  };
}
