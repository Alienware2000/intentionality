// =============================================================================
// WEEKLY PLAN MODAL EXPORTS
// AI-powered weekly planning with user-driven day selection.
// =============================================================================

export { default as WeeklyPlanModal } from "./WeeklyPlanModal";
export { useWeeklyPlanWizard } from "./hooks/useWeeklyPlanWizard";
export type {
  WizardState,
  WizardActions,
  AITaskSuggestion,
  AIHabitSuggestion,
  AIResult,
  ReviewTaskSuggestion,
  ParsedSuggestions,
} from "./hooks/useWeeklyPlanWizard";
export type { ModalView, PlanningMethod, DayKey } from "./constants";
export {
  PLANNING_METHODS,
  AI_BRAIN_DUMP,
  AI_TIPS,
  PRIORITY_CONFIG,
  DAY_CONFIG,
  REVIEW_CONFIG,
} from "./constants";
export { default as TaskDaySelector } from "./TaskDaySelector";
export type { TaskSuggestionItem } from "./TaskDaySelector";
