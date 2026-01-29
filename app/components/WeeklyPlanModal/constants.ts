// =============================================================================
// WEEKLY PLAN MODAL CONSTANTS
// Simplified weekly planning with AI brain dump.
// Two options: Manual (use week page) or AI Assist (brain dump → auto-create)
// =============================================================================

// -----------------------------------------------------------------------------
// View Types
// -----------------------------------------------------------------------------

export type ModalView = "choice" | "ai-input" | "ai-processing" | "ai-review" | "ai-result";

// -----------------------------------------------------------------------------
// Planning Method Choice
// -----------------------------------------------------------------------------

export const PLANNING_METHODS = {
  manual: {
    id: "manual" as const,
    icon: "PenLine",
    title: "Manual",
    description: "Create tasks one by one on the week page",
  },
  ai: {
    id: "ai" as const,
    icon: "Sparkles",
    title: "AI Assist",
    description: "Brain dump your thoughts, AI creates tasks for you",
  },
} as const;

export type PlanningMethod = keyof typeof PLANNING_METHODS;

// -----------------------------------------------------------------------------
// AI Brain Dump Configuration
// -----------------------------------------------------------------------------

export const AI_BRAIN_DUMP = {
  title: "Plan Your Week with AI",
  subtitle: "Tell me what's on your mind",
  inputPlaceholder: `e.g. "finish report by Friday, call mom, exercise 3x, work on thesis chapter..."`,
  maxLength: 5000,
  minLength: 10,
  processingTitle: "Creating your plan...",
  processingSubtitle: "Organizing your tasks for a balanced week",
} as const;

// -----------------------------------------------------------------------------
// Guidance Cards
// Displayed above the textarea to help users structure their brain dump
// -----------------------------------------------------------------------------

export const GUIDANCE_CARDS = [
  {
    id: "must-do",
    icon: "Target",
    label: "Must Do",
    description: "Deadlines & non-negotiables",
    examples: ["report due Friday", "exam on Thursday", "meeting Monday 2pm"],
    color: "var(--priority-high)",
  },
  {
    id: "goals",
    icon: "TrendingUp",
    label: "Goals",
    description: "Work toward something bigger",
    examples: ["work on thesis", "learn Spanish", "side project"],
    color: "var(--accent-primary)",
  },
  {
    id: "quick-tasks",
    icon: "Zap",
    label: "Quick Tasks",
    description: "Small stuff under 30 min",
    examples: ["call dentist", "buy groceries", "email professor"],
    color: "var(--accent-success)",
  },
  {
    id: "habits",
    icon: "RefreshCw",
    label: "Habits",
    description: "Recurring things",
    examples: ["exercise 3x", "read daily", "meditate"],
    color: "var(--accent-highlight)",
  },
] as const;

export type GuidanceCard = (typeof GUIDANCE_CARDS)[number];

// -----------------------------------------------------------------------------
// AI Tips
// Displayed below the textarea while user types
// -----------------------------------------------------------------------------

export const AI_TIPS = [
  {
    icon: "Calendar",
    text: "Include dates: 'by Friday', 'before weekend', 'Monday morning'",
  },
  {
    icon: "Target",
    text: "Add both deadlines AND goals you want to work toward",
  },
  {
    icon: "Zap",
    text: "The small stuff too - I'll batch them as quick wins",
  },
  {
    icon: "Scale",
    text: "I'll spread your tasks so no day is overloaded",
  },
  {
    icon: "Lightbulb",
    text: "Don't worry about organizing - that's my job",
  },
] as const;

// -----------------------------------------------------------------------------
// Priority Mapping (for display)
// -----------------------------------------------------------------------------

export const PRIORITY_CONFIG = {
  high: {
    label: "High Priority",
    icon: "AlertTriangle",
    color: "var(--priority-high)",
    bgClass: "bg-[var(--priority-high)]/10",
    borderClass: "border-[var(--priority-high)]/30",
  },
  medium: {
    label: "Normal",
    icon: "Target",
    color: "var(--accent-primary)",
    bgClass: "bg-[var(--accent-primary)]/10",
    borderClass: "border-[var(--accent-primary)]/30",
  },
  low: {
    label: "Quick Win",
    icon: "Zap",
    color: "var(--accent-success)",
    bgClass: "bg-[var(--accent-success)]/10",
    borderClass: "border-[var(--accent-success)]/30",
  },
} as const;

// -----------------------------------------------------------------------------
// Day Selection Configuration
// Used in the review view for user-driven day selection
// -----------------------------------------------------------------------------

export const DAY_CONFIG = [
  { key: "monday", label: "Mon", fullLabel: "Monday", index: 0 },
  { key: "tuesday", label: "Tue", fullLabel: "Tuesday", index: 1 },
  { key: "wednesday", label: "Wed", fullLabel: "Wednesday", index: 2 },
  { key: "thursday", label: "Thu", fullLabel: "Thursday", index: 3 },
  { key: "friday", label: "Fri", fullLabel: "Friday", index: 4 },
  { key: "saturday", label: "Sat", fullLabel: "Saturday", index: 5 },
  { key: "sunday", label: "Sun", fullLabel: "Sunday", index: 6 },
] as const;

export type DayKey = (typeof DAY_CONFIG)[number]["key"];

// -----------------------------------------------------------------------------
// Review View Configuration
// -----------------------------------------------------------------------------

export const REVIEW_CONFIG = {
  title: "Review Your Tasks",
  subtitle: "Select which day each task should be scheduled for",
  createButtonLabel: "Create {count} Tasks",
  noTasksMessage: "No tasks were extracted. Try adding more details.",
  detectedDayHint: "Detected from your input",
  defaultDay: "friday" as DayKey,
} as const;
