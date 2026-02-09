"use client";

// =============================================================================
// WEEKLY PLAN MODAL
// Simplified weekly planning with two options:
// 1. Manual: Close modal, create tasks directly on week page
// 2. AI Assist: Brain dump text → AI parses → Auto-create tasks
// Responsive: Bottom sheet on mobile, centered modal on desktop.
// =============================================================================

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  PenLine,
  Sparkles,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Target,
  Zap,
  Lightbulb,
  Calendar,
  Scale,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useProfile } from "@/app/components/ProfileProvider";
import { useCelebration } from "@/app/components/CelebrationOverlay";
import ModalPortal from "@/app/components/ModalPortal";
import type { ISODateString, Quest, Priority } from "@/app/lib/types";
import { formatWeekRange, addDaysISO } from "@/app/lib/date-utils";
import {
  useWeeklyPlanWizard,
  type AIResult,
  type AITaskSuggestion,
  type ReviewTaskSuggestion,
} from "./hooks/useWeeklyPlanWizard";
import {
  PLANNING_METHODS,
  AI_BRAIN_DUMP,
  AI_TIPS,
  PRIORITY_CONFIG,
  GUIDANCE_CARDS,
  REVIEW_CONFIG,
  type GuidanceCard as GuidanceCardType,
  type DayKey,
} from "./constants";
import TaskDaySelector from "./TaskDaySelector";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  isOpen: boolean;
  weekStart: ISODateString;
  quests: Quest[];
  onClose: () => void;
  onSave: () => void;
  onTasksCreated?: () => void;
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function formatDueDate(date: string): string {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getIconForTip(iconName: string) {
  switch (iconName) {
    case "Calendar":
      return Calendar;
    case "Target":
      return Target;
    case "Zap":
      return Zap;
    case "Scale":
      return Scale;
    case "Lightbulb":
      return Lightbulb;
    default:
      return Lightbulb;
  }
}

function getIconForGuidance(iconName: string) {
  switch (iconName) {
    case "Target":
      return Target;
    case "TrendingUp":
      return TrendingUp;
    case "Zap":
      return Zap;
    case "RefreshCw":
      return RefreshCw;
    default:
      return Target;
  }
}

function getPriorityIcon(priority: Priority) {
  switch (priority) {
    case "high":
      return AlertTriangle;
    case "medium":
      return Target;
    case "low":
      return Zap;
  }
}

// -----------------------------------------------------------------------------
// Choice View Component
// -----------------------------------------------------------------------------

function ChoiceView({
  onSelectManual,
  onSelectAI,
}: {
  onSelectManual: () => void;
  onSelectAI: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        How would you like to plan?
      </h3>
      <p className="text-sm text-[var(--text-muted)] mb-8 text-center">
        Choose the method that works best for you
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        {/* Manual Option */}
        <button
          onClick={onSelectManual}
          className={cn(
            "flex-1 p-6 rounded-2xl border-2 transition-all",
            "border-[var(--border-subtle)] hover:border-[var(--accent-primary)]",
            "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]",
            "group text-left min-h-[140px]"
          )}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center mb-3",
                "bg-[var(--bg-card)] group-hover:bg-[var(--accent-primary)]/10",
                "transition-colors"
              )}
            >
              <PenLine
                size={24}
                className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors"
              />
            </div>
            <span className="text-base font-semibold text-[var(--text-primary)] mb-1">
              {PLANNING_METHODS.manual.title}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {PLANNING_METHODS.manual.description}
            </span>
          </div>
        </button>

        {/* AI Option */}
        <button
          onClick={onSelectAI}
          className={cn(
            "flex-1 p-6 rounded-2xl border-2 transition-all",
            "border-[var(--accent-primary)]/30 hover:border-[var(--accent-primary)]",
            "bg-gradient-to-br from-[var(--accent-primary)]/5 to-[var(--accent-primary)]/10",
            "hover:from-[var(--accent-primary)]/10 hover:to-[var(--accent-primary)]/15",
            "group text-left min-h-[140px]"
          )}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center mb-3",
                "bg-[var(--accent-primary)]/10 group-hover:bg-[var(--accent-primary)]/20",
                "transition-colors"
              )}
            >
              <Sparkles
                size={24}
                className="text-[var(--accent-primary)]"
              />
            </div>
            <span className="text-base font-semibold text-[var(--text-primary)] mb-1">
              {PLANNING_METHODS.ai.title}
            </span>
            <span className="text-sm text-[var(--text-muted)]">
              {PLANNING_METHODS.ai.description}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Guidance Card Component
// -----------------------------------------------------------------------------

function GuidanceCard({ card }: { card: GuidanceCardType }) {
  const IconComponent = getIconForGuidance(card.icon);

  return (
    <div
      className={cn(
        "p-3 rounded-xl",
        "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
        "transition-colors"
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {/* eslint-disable-next-line react-hooks/static-components -- Dynamic icon selection based on prop */}
        {IconComponent && <IconComponent size={14} style={{ color: card.color }} />}
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: card.color }}
        >
          {card.label}
        </span>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] mb-2">
        {card.description}
      </p>
      <div className="space-y-0.5">
        {card.examples.slice(0, 2).map((example, i) => (
          <p
            key={i}
            className="text-xs text-[var(--text-secondary)] truncate"
          >
            &quot;{example}&quot;
          </p>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// AI Input View Component
// -----------------------------------------------------------------------------

function AIInputView({
  brainDumpText,
  error,
  onTextChange,
  onSubmit,
  onBack,
}: {
  brainDumpText: string;
  error: string | null;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % AI_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentTip = AI_TIPS[currentTipIndex];
  const TipIconComponent = getIconForTip(currentTip.icon);

  const canSubmit = brainDumpText.trim().length >= AI_BRAIN_DUMP.minLength;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className={cn(
            "p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center",
            "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            "hover:bg-[var(--bg-hover)] transition-colors"
          )}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {AI_BRAIN_DUMP.title}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            {AI_BRAIN_DUMP.subtitle}
          </p>
        </div>
      </div>

      {/* Guidance Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {GUIDANCE_CARDS.map((card) => (
          <GuidanceCard key={card.id} card={card} />
        ))}
      </div>

      {/* Text Area */}
      <div className="flex-1 min-h-0">
        <textarea
          value={brainDumpText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={AI_BRAIN_DUMP.inputPlaceholder}
          maxLength={AI_BRAIN_DUMP.maxLength}
          className={cn(
            "w-full h-full min-h-[150px] max-h-[300px] p-4 rounded-xl resize-none",
            "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
            "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
            "focus:outline-none focus:border-[var(--accent-primary)]",
            "transition-colors text-sm leading-relaxed"
          )}
          autoFocus
        />
      </div>

      {/* Character count */}
      <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
        <span>
          {brainDumpText.length} / {AI_BRAIN_DUMP.maxLength}
        </span>
        {brainDumpText.length > 0 && brainDumpText.length < AI_BRAIN_DUMP.minLength && (
          <span className="text-[var(--priority-medium)]">
            Add at least {AI_BRAIN_DUMP.minLength - brainDumpText.length} more characters
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-[var(--priority-high)]/10 border border-[var(--priority-high)]/30">
          <p className="text-sm text-[var(--priority-high)]">{error}</p>
        </div>
      )}

      {/* Rotating tip */}
      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-[var(--accent-highlight)]/10 border border-[var(--accent-highlight)]/30">
        {/* eslint-disable-next-line react-hooks/static-components -- Dynamic icon selection based on tip */}
        {TipIconComponent && <TipIconComponent size={16} className="text-[var(--accent-highlight)] flex-shrink-0" />}
        <p className="text-sm text-[var(--text-secondary)]">{currentTip.text}</p>
      </div>

      {/* Submit button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium min-h-[48px]",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        >
          <Sparkles size={16} />
          Create Tasks
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// AI Processing View Component
// -----------------------------------------------------------------------------

function AIProcessingView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <div className="w-20 h-20 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-6">
        <Loader2 size={32} className="text-[var(--accent-primary)] animate-spin" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {AI_BRAIN_DUMP.processingTitle}
      </h3>
      <p className="text-sm text-[var(--text-muted)] text-center">
        {AI_BRAIN_DUMP.processingSubtitle}
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// AI Review View Component
// User-driven day selection for parsed tasks
// -----------------------------------------------------------------------------

function AIReviewView({
  suggestions,
  habitSuggestions,
  aiAdvice,
  quests,
  isProcessing,
  error,
  onSelectDay,
  onSelectTaskQuest,
  onToggleInclude,
  onRemoveTask,
  onCreateTasks,
  onBack,
}: {
  suggestions: ReviewTaskSuggestion[];
  habitSuggestions: Array<{ title: string; frequency: string }>;
  aiAdvice?: string;
  quests: Quest[];
  isProcessing: boolean;
  error: string | null;
  onSelectDay: (taskId: string, day: DayKey) => void;
  onSelectTaskQuest: (taskId: string, questId: string) => void;
  onToggleInclude: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onCreateTasks: () => void;
  onBack: () => void;
}) {
  const includedCount = suggestions.filter((t) => t.included).length;
  const hasDetectedDays = suggestions.some((t) => t.detected_day);

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
        <div className="w-20 h-20 rounded-full bg-[var(--priority-medium)]/10 flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-[var(--priority-medium)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {REVIEW_CONFIG.noTasksMessage}
        </h3>
        <button
          onClick={onBack}
          className={cn(
            "mt-4 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium min-h-[48px]",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/90",
            "transition-colors"
          )}
        >
          <ChevronLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className={cn(
            "p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center",
            "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            "hover:bg-[var(--bg-hover)] transition-colors"
          )}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            {REVIEW_CONFIG.title}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            {REVIEW_CONFIG.subtitle}
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--priority-high)]/10 border border-[var(--priority-high)]/30">
          <p className="text-sm text-[var(--priority-high)]">{error}</p>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 mb-4">
        {suggestions.map((task) => (
          <TaskDaySelector
            key={task.id}
            task={task}
            quests={quests}
            onSelectDay={onSelectDay}
            onSelectQuest={onSelectTaskQuest}
            onToggleInclude={onToggleInclude}
            onRemove={onRemoveTask}
          />
        ))}
      </div>

      {/* Habits section */}
      {habitSuggestions.length > 0 && (
        <div className="mb-4 p-4 rounded-xl bg-[var(--accent-highlight)]/5 border border-[var(--accent-highlight)]/20">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={14} className="text-[var(--accent-highlight)]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-highlight)]">
              Habits to Create ({habitSuggestions.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {habitSuggestions.map((habit, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-md bg-[var(--bg-card)] text-xs text-[var(--text-secondary)]"
              >
                {habit.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detected days hint */}
      {hasDetectedDays && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--accent-highlight)]/10 border border-[var(--accent-highlight)]/30 mb-4">
          <Sparkles size={16} className="text-[var(--accent-highlight)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)]">
            {REVIEW_CONFIG.detectedDayHint}. You can change the day for any task.
          </p>
        </div>
      )}

      {/* AI Advice */}
      {aiAdvice && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 mb-4">
          <Lightbulb size={16} className="text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)]">{aiAdvice}</p>
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          onClick={onCreateTasks}
          disabled={includedCount === 0 || isProcessing}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium min-h-[48px]",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {REVIEW_CONFIG.createButtonLabel.replace("{count}", String(includedCount))}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// AI Result View Component
// -----------------------------------------------------------------------------

function AIResultView({
  result,
  onViewWeek,
  onClose,
  onTryAgain,
}: {
  result: AIResult;
  onViewWeek: () => void;
  onClose: () => void;
  onTryAgain: () => void;
}) {
  const totalCreated = result.tasksCreated + result.habitsCreated;

  // Group tasks by priority
  const highPriority = result.tasks.filter((t) => t.priority === "high");
  const mediumPriority = result.tasks.filter((t) => t.priority === "medium");
  const lowPriority = result.tasks.filter((t) => t.priority === "low");

  if (totalCreated === 0) {
    // No tasks created - something went wrong
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
        <div className="w-20 h-20 rounded-full bg-[var(--priority-medium)]/10 flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-[var(--priority-medium)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          No tasks could be created
        </h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-6 max-w-xs">
          Try adding more specific details about what you want to accomplish this week.
        </p>
        <button
          onClick={onTryAgain}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium min-h-[48px]",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/90",
            "transition-colors"
          )}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-2"
    >
      {/* Success header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
          <CheckCircle size={32} className="text-[var(--accent-success)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Created {result.tasksCreated} tasks for your week!
        </h3>
        {result.xpGained > 0 ? (
          <p className="text-sm text-[var(--accent-success)] mt-1">
            +{result.xpGained} XP
          </p>
        ) : result.xpAlreadyClaimed ? (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <CheckCircle size={14} className="text-[var(--text-secondary)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              Planning XP already earned (25 XP)
            </p>
          </div>
        ) : null}
      </div>

      {/* Tasks by priority */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar mb-6">
        {highPriority.length > 0 && (
          <TaskGroup
            label="High Priority"
            tasks={highPriority}
            priority="high"
          />
        )}
        {mediumPriority.length > 0 && (
          <TaskGroup
            label="Normal"
            tasks={mediumPriority}
            priority="medium"
          />
        )}
        {lowPriority.length > 0 && (
          <TaskGroup
            label="Quick Wins"
            tasks={lowPriority}
            priority="low"
          />
        )}

        {/* Habits */}
        {result.habitsCreated > 0 && (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={14} className="text-[var(--accent-highlight)]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-highlight)]">
                Habits Created ({result.habitsCreated})
              </span>
            </div>
            <div className="space-y-2">
              {result.habits.map((habit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-highlight)]" />
                  <span>{habit.title}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({habit.frequency === "daily" ? "Daily" : habit.frequency === "weekdays" ? "Weekdays" : "3x/week"})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Advice */}
      {result.advice && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--accent-highlight)]/10 border border-[var(--accent-highlight)]/30 mb-6">
          <Lightbulb size={16} className="text-[var(--accent-highlight)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)]">{result.advice}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onViewWeek}
          className={cn(
            "flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium min-h-[48px]",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/90",
            "transition-colors"
          )}
        >
          View Week
        </button>
        <button
          onClick={onClose}
          className={cn(
            "flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium min-h-[48px]",
            "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)]",
            "transition-colors"
          )}
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Task Group Component
// -----------------------------------------------------------------------------

function TaskGroup({
  label,
  tasks,
  priority,
}: {
  label: string;
  tasks: AITaskSuggestion[];
  priority: Priority;
}) {
  const config = PRIORITY_CONFIG[priority];
  const IconComponent = getPriorityIcon(priority);

  return (
    <div className={cn("rounded-xl border p-4", config.bgClass, config.borderClass)}>
      <div className="flex items-center gap-2 mb-3">
        {/* eslint-disable-next-line react-hooks/static-components -- Dynamic icon selection based on priority */}
        {IconComponent && <IconComponent size={14} style={{ color: config.color }} />}
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: config.color }}
        >
          {label} ({tasks.length})
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[var(--text-primary)]">{task.title}</span>
              <span className="text-xs text-[var(--text-muted)] ml-2">
                ({formatDueDate(task.due_date)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function WeeklyPlanModal({
  isOpen,
  weekStart,
  quests,
  onClose,
  onSave,
  onTasksCreated,
}: Props) {
  const { refreshProfile } = useProfile();
  const { showXpGain } = useCelebration();

  const { state, actions } = useWeeklyPlanWizard();

  // Handle manual selection - just close the modal
  const handleSelectManual = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle AI selection
  const handleSelectAI = useCallback(() => {
    actions.goToAIInput();
  }, [actions]);

  // Handle AI submit (parse only - goes to review)
  const handleAISubmit = useCallback(async () => {
    await actions.parseWithAI(weekStart);
  }, [actions, weekStart]);

  // Handle day selection in review
  const handleSelectDay = useCallback(
    (taskId: string, day: DayKey) => {
      actions.updateTaskDay(taskId, day);
    },
    [actions]
  );

  // Handle toggle task included
  const handleToggleInclude = useCallback(
    (taskId: string) => {
      actions.toggleTaskIncluded(taskId);
    },
    [actions]
  );

  // Handle remove task
  const handleRemoveTask = useCallback(
    (taskId: string) => {
      actions.removeTask(taskId);
    },
    [actions]
  );

  // Handle per-task quest selection
  const handleSelectTaskQuest = useCallback(
    (taskId: string, questId: string) => {
      actions.updateTaskQuest(taskId, questId);
    },
    [actions]
  );

  // Handle create tasks from review
  const handleCreateTasks = useCallback(async () => {
    const result = await actions.createTasks(weekStart);

    if (result && result.tasksCreated > 0) {
      refreshProfile();
      showXpGain(result.xpGained);

      // Trigger week view refresh so new tasks appear immediately
      onTasksCreated?.();
    }
  }, [actions, weekStart, refreshProfile, showXpGain, onTasksCreated]);

  // Handle back from review to input
  const handleBackToInput = useCallback(() => {
    actions.goToAIInput();
  }, [actions]);

  // Handle view week
  const handleViewWeek = useCallback(() => {
    onSave();
    // The week page will auto-refresh when modal closes
  }, [onSave]);

  // Handle try again
  const handleTryAgain = useCallback(() => {
    actions.goToAIInput();
  }, [actions]);

  // Set default quest per-task when entering review state
  useEffect(() => {
    if (state.view === "ai-review" && quests.length > 0) {
      // Find "General Tasks" quest, or use the first quest as fallback
      const generalTasksQuest = quests.find((q) => q.title === "General Tasks");
      const defaultQuest = generalTasksQuest || quests[0];
      if (defaultQuest) {
        // Set default quest for any tasks that don't have one selected
        state.suggestions.forEach((task) => {
          if (!task.selected_quest_id) {
            actions.updateTaskQuest(task.id, defaultQuest.id);
          }
        });
      }
    }
  }, [state.view, state.suggestions, quests, actions]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow exit animation
      const timer = setTimeout(() => {
        actions.reset();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, actions]);

  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={onClose}
            />

            {/* Modal - Bottom sheet on mobile, centered on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "fixed z-50",
                // Mobile: bottom sheet style
                "inset-x-0 bottom-0 top-auto rounded-t-2xl max-h-[90vh]",
                // Tablet+: centered modal
                "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
                "sm:rounded-2xl sm:max-h-[min(calc(100vh-4rem),700px)]",
                "sm:w-[min(calc(100vw-2rem),600px)]",
                // Base styles
                "bg-[var(--bg-base)] overflow-hidden",
                "border border-[var(--border-subtle)]",
                "shadow-2xl",
                "flex flex-col"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 p-4 sm:p-5 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      Plan Your Week
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {formatWeekRange(weekStart, addDaysISO(weekStart, 6))}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className={cn(
                      "p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg",
                      "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      "hover:bg-[var(--bg-hover)]",
                      "transition-colors"
                    )}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  {state.view === "choice" && (
                    <motion.div
                      key="choice"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChoiceView
                        onSelectManual={handleSelectManual}
                        onSelectAI={handleSelectAI}
                      />
                    </motion.div>
                  )}

                  {state.view === "ai-input" && (
                    <motion.div
                      key="ai-input"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AIInputView
                        brainDumpText={state.brainDumpText}
                        error={state.error}
                        onTextChange={actions.setBrainDumpText}
                        onSubmit={handleAISubmit}
                        onBack={actions.goToChoice}
                      />
                    </motion.div>
                  )}

                  {state.view === "ai-processing" && (
                    <motion.div
                      key="ai-processing"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AIProcessingView />
                    </motion.div>
                  )}

                  {state.view === "ai-review" && (
                    <motion.div
                      key="ai-review"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AIReviewView
                        suggestions={state.suggestions}
                        habitSuggestions={state.habitSuggestions}
                        aiAdvice={state.aiAdvice}
                        quests={quests}
                        isProcessing={state.isProcessing}
                        error={state.error}
                        onSelectDay={handleSelectDay}
                        onSelectTaskQuest={handleSelectTaskQuest}
                        onToggleInclude={handleToggleInclude}
                        onRemoveTask={handleRemoveTask}
                        onCreateTasks={handleCreateTasks}
                        onBack={handleBackToInput}
                      />
                    </motion.div>
                  )}

                  {state.view === "ai-result" && state.result && (
                    <motion.div
                      key="ai-result"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AIResultView
                        result={state.result}
                        onViewWeek={handleViewWeek}
                        onClose={onClose}
                        onTryAgain={handleTryAgain}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
