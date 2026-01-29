"use client";

// =============================================================================
// REVIEW CLIENT COMPONENT
// Multi-step daily review flow:
// 1. Today's Summary - Auto-generated stats
// 2. Reflection - What went well/challenges + mood/energy (awards 10 XP)
// 3. Plan Tomorrow - Create tasks (manual or AI) (awards 10 XP for 3+ tasks)
// 4. Completion - XP celebration with breakdown
// 5. Review Summary - Editable summary view (for returning users or after completion)
//    - View/edit reflection
//    - View/add/edit/delete tomorrow's tasks
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  CheckCircle,
  Heart,
  Clock,
  Flame,
  Plus,
  X,
  Smile,
  Meh,
  Frown,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Sparkles,
  Loader2,
  Brain,
  List,
  ArrowRight,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import EditTaskModal from "@/app/components/EditTaskModal";
import ConfirmModal from "@/app/components/ConfirmModal";
import { fetchApi } from "@/app/lib/api";
import { useToast } from "@/app/components/Toast";
import Link from "next/link";
import { cn } from "@/app/lib/cn";
import { useProfile } from "@/app/components/ProfileProvider";
import { useCelebration } from "@/app/components/CelebrationOverlay";
import { getTodayISO } from "@/app/lib/date-utils";
import { PLANNING_XP } from "@/app/lib/gamification";
import type { DailySummary, DailyReflection, Task, Quest, Priority } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Step = "summary" | "reflection" | "planning" | "completion" | "reviewSummary";

type PlanningMode = "manual" | "ai";

type TaskDraft = {
  id: string;
  title: string;
  priority: Priority;
  quest_id: string | null;
};

type AISuggestion = {
  title: string;
  priority: Priority;
  time_of_day?: "morning" | "afternoon" | "evening";
  original_text: string;
  accepted?: boolean;
};

// -----------------------------------------------------------------------------
// Step Components
// -----------------------------------------------------------------------------

function SummaryStep({ summary }: { summary: DailySummary | null }) {
  if (!summary) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse bg-[var(--bg-elevated)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  const stats = [
    {
      icon: CheckCircle,
      label: "Tasks completed",
      value: `${summary.tasksCompleted}/${summary.tasksTotal}`,
      color: "text-[var(--accent-success)]",
    },
    {
      icon: Heart,
      label: "Habits done",
      value: `${summary.habitsCompleted}/${summary.habitsTotal}`,
      color: "text-[var(--accent-primary)]",
    },
    {
      icon: Zap,
      label: "XP earned",
      value: summary.xpEarned.toString(),
      color: "text-[var(--accent-highlight)]",
    },
    {
      icon: Clock,
      label: "Focus time",
      value: `${summary.focusMinutes} min`,
      color: "text-[var(--text-secondary)]",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Today&apos;s Summary
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Here&apos;s what you accomplished today
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={stat.color} />
                <span className="text-xs text-[var(--text-muted)]">{stat.label}</span>
              </div>
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {summary.streakMaintained ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--accent-streak)]/10 border border-[var(--accent-streak)]/30">
          <Flame size={20} className="text-[var(--accent-streak)]" />
          <p className="text-sm text-[var(--accent-streak)]">
            Streak maintained! Keep it going tomorrow.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <Flame size={20} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            No activity recorded. Tomorrow is a fresh start!
          </p>
        </div>
      )}
    </div>
  );
}

function ReflectionStep({
  wins,
  setWins,
  challenges,
  setChallenges,
  mood,
  setMood,
  energy,
  setEnergy,
  notes,
  setNotes,
}: {
  wins: string[];
  setWins: (wins: string[]) => void;
  challenges: string[];
  setChallenges: (challenges: string[]) => void;
  mood: number | null;
  setMood: (mood: number | null) => void;
  energy: number | null;
  setEnergy: (energy: number | null) => void;
  notes: string;
  setNotes: (notes: string) => void;
}) {
  const [newWin, setNewWin] = useState("");
  const [newChallenge, setNewChallenge] = useState("");

  const addWin = () => {
    if (newWin.trim()) {
      setWins([...wins, newWin.trim()]);
      setNewWin("");
    }
  };

  const addChallenge = () => {
    if (newChallenge.trim()) {
      setChallenges([...challenges, newChallenge.trim()]);
      setNewChallenge("");
    }
  };

  const moodOptions = [
    { value: 1, icon: Frown, label: "Rough" },
    { value: 2, icon: Frown, label: "Meh" },
    { value: 3, icon: Meh, label: "Okay" },
    { value: 4, icon: Smile, label: "Good" },
    { value: 5, icon: Smile, label: "Great!" },
  ];

  const energyOptions = [
    { value: 1, icon: BatteryLow, label: "Drained" },
    { value: 2, icon: BatteryLow, label: "Low" },
    { value: 3, icon: BatteryMedium, label: "Okay" },
    { value: 4, icon: BatteryMedium, label: "Good" },
    { value: 5, icon: BatteryFull, label: "Full" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Reflect
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Take a moment to reflect on your day
        </p>
      </div>

      {/* Wins */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          What went well?
        </label>
        <div className="space-y-2">
          {wins.map((win, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/30"
            >
              <Check size={14} className="text-[var(--accent-success)]" />
              <span className="flex-1 text-sm text-[var(--text-primary)]">{win}</span>
              <button
                onClick={() => setWins(wins.filter((_, j) => j !== i))}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newWin}
              onChange={(e) => setNewWin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWin()}
              placeholder="Add a win..."
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm",
                "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:border-[var(--accent-primary)]"
              )}
            />
            <button
              onClick={addWin}
              disabled={!newWin.trim()}
              className={cn(
                "px-3 py-2 rounded-lg",
                "bg-[var(--accent-success)] text-white",
                "hover:bg-[var(--accent-success)]/80",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Challenges */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          What was challenging?
        </label>
        <div className="space-y-2">
          {challenges.map((challenge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
            >
              <span className="flex-1 text-sm text-[var(--text-primary)]">{challenge}</span>
              <button
                onClick={() => setChallenges(challenges.filter((_, j) => j !== i))}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newChallenge}
              onChange={(e) => setNewChallenge(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addChallenge()}
              placeholder="Add a challenge..."
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm",
                "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:border-[var(--accent-primary)]"
              )}
            />
            <button
              onClick={addChallenge}
              disabled={!newChallenge.trim()}
              className={cn(
                "px-3 py-2 rounded-lg",
                "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mood & Energy */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Mood
          </label>
          <div className="flex gap-1">
            {moodOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setMood(mood === option.value ? null : option.value)}
                  className={cn(
                    "flex-1 p-2 rounded-lg transition-colors",
                    mood === option.value
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                  title={option.label}
                >
                  <Icon size={16} className="mx-auto" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Energy
          </label>
          <div className="flex gap-1">
            {energyOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setEnergy(energy === option.value ? null : option.value)}
                  className={cn(
                    "flex-1 p-2 rounded-lg transition-colors",
                    energy === option.value
                      ? "bg-[var(--accent-highlight)] text-black"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                  title={option.label}
                >
                  <Icon size={16} className="mx-auto" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Additional notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any thoughts about today..."
          rows={3}
          className={cn(
            "w-full px-3 py-2 rounded-lg text-sm",
            "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
            "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
            "focus:outline-none focus:border-[var(--accent-primary)]",
            "resize-none"
          )}
        />
      </div>
    </div>
  );
}

function PlanningStep({
  mode,
  setMode,
  taskDrafts,
  setTaskDrafts,
  quests,
  tomorrowTasks,
  aiSuggestions,
  setAiSuggestions,
  brainDumpText,
  setBrainDumpText,
  isParsingAI,
  onParseAI,
  aiAdvice,
}: {
  mode: PlanningMode;
  setMode: (mode: PlanningMode) => void;
  taskDrafts: TaskDraft[];
  setTaskDrafts: (drafts: TaskDraft[]) => void;
  quests: Quest[];
  tomorrowTasks: Task[];
  aiSuggestions: AISuggestion[];
  setAiSuggestions: (suggestions: AISuggestion[]) => void;
  brainDumpText: string;
  setBrainDumpText: (text: string) => void;
  isParsingAI: boolean;
  onParseAI: () => void;
  aiAdvice: string | null;
}) {
  const defaultQuestId = quests.length > 0 ? quests[0].id : null;

  const updateTaskDraft = (id: string, updates: Partial<TaskDraft>) => {
    setTaskDrafts(
      taskDrafts.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const removeTaskDraft = (id: string) => {
    setTaskDrafts(taskDrafts.filter((d) => d.id !== id));
  };

  const addEmptyTaskDraft = () => {
    setTaskDrafts([
      ...taskDrafts,
      {
        id: `draft-${Date.now()}`,
        title: "",
        priority: "medium",
        quest_id: defaultQuestId,
      },
    ]);
  };

  const toggleAiSuggestion = (index: number) => {
    setAiSuggestions(
      aiSuggestions.map((s, i) =>
        i === index ? { ...s, accepted: !s.accepted } : s
      )
    );
  };

  const acceptedCount = mode === "ai"
    ? aiSuggestions.filter((s) => s.accepted).length
    : taskDrafts.filter((d) => d.title.trim()).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Plan Tomorrow
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Set up tasks for tomorrow to earn +{PLANNING_XP.daily_planning} XP
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-[var(--bg-elevated)] rounded-lg">
        <button
          onClick={() => setMode("manual")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            mode === "manual"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          <List size={16} />
          Quick Add
        </button>
        <button
          onClick={() => setMode("ai")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            mode === "ai"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          <Brain size={16} />
          AI Assist
        </button>
      </div>

      {/* Tomorrow's Existing Tasks */}
      {tomorrowTasks.length > 0 && (
        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {tomorrowTasks.length} task{tomorrowTasks.length !== 1 ? "s" : ""} already scheduled
            </span>
          </div>
          <div className="space-y-1">
            {tomorrowTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="text-sm text-[var(--text-muted)] truncate">
                {task.title}
              </div>
            ))}
            {tomorrowTasks.length > 3 && (
              <div className="text-xs text-[var(--text-muted)]">
                +{tomorrowTasks.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Mode */}
      {mode === "manual" && (
        <div className="space-y-3">
          {taskDrafts.map((draft) => (
            <div
              key={draft.id}
              className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
            >
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateTaskDraft(draft.id, { title: e.target.value })}
                  placeholder="Task title..."
                  className={cn(
                    "w-full px-2 py-1 rounded text-sm",
                    "bg-transparent border-0",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none"
                  )}
                />
                <div className="flex gap-2">
                  <select
                    value={draft.priority}
                    onChange={(e) => updateTaskDraft(draft.id, { priority: e.target.value as Priority })}
                    className={cn(
                      "px-2 py-1 rounded text-xs",
                      "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                      "text-[var(--text-secondary)]",
                      "focus:outline-none focus:border-[var(--accent-primary)]"
                    )}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  {quests.length > 0 && (
                    <select
                      value={draft.quest_id ?? ""}
                      onChange={(e) => updateTaskDraft(draft.id, { quest_id: e.target.value || null })}
                      className={cn(
                        "flex-1 px-2 py-1 rounded text-xs truncate",
                        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                        "text-[var(--text-secondary)]",
                        "focus:outline-none focus:border-[var(--accent-primary)]"
                      )}
                    >
                      {quests.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeTaskDraft(draft.id)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {taskDrafts.length < 5 && (
            <button
              onClick={addEmptyTaskDraft}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                "border border-dashed border-[var(--border-subtle)]",
                "text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                "hover:border-[var(--accent-primary)] transition-colors"
              )}
            >
              <Plus size={16} />
              Add task
            </button>
          )}
        </div>
      )}

      {/* AI Mode */}
      {mode === "ai" && (
        <div className="space-y-4">
          {aiSuggestions.length === 0 ? (
            <>
              <textarea
                value={brainDumpText}
                onChange={(e) => setBrainDumpText(e.target.value)}
                placeholder="What do you want to get done tomorrow? Just type your thoughts..."
                rows={4}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm",
                  "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                  "focus:outline-none focus:border-[var(--accent-primary)]",
                  "resize-none"
                )}
              />
              <button
                onClick={onParseAI}
                disabled={!brainDumpText.trim() || isParsingAI}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isParsingAI ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain size={16} />
                    Generate Tasks
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {aiAdvice && (
                <div className="p-3 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-[var(--accent-primary)] mt-0.5" />
                    <p className="text-sm text-[var(--text-secondary)]">{aiAdvice}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => toggleAiSuggestion(index)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      suggestion.accepted
                        ? "bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/30"
                        : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                        suggestion.accepted
                          ? "bg-[var(--accent-success)] text-white"
                          : "border border-[var(--border-default)]"
                      )}
                    >
                      {suggestion.accepted && <Check size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {suggestion.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            suggestion.priority === "high"
                              ? "bg-red-500/10 text-red-500"
                              : suggestion.priority === "medium"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-green-500/10 text-green-600"
                          )}
                        >
                          {suggestion.priority}
                        </span>
                        {suggestion.time_of_day && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {suggestion.time_of_day}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setAiSuggestions([]);
                  setBrainDumpText("");
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Start over
              </button>
            </>
          )}
        </div>
      )}

      {/* Task Count Indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">
          {acceptedCount < 3
            ? `Add ${3 - acceptedCount} more task${3 - acceptedCount !== 1 ? "s" : ""} to earn planning XP`
            : "Planning bonus unlocked!"}
        </span>
        <span
          className={cn(
            "font-medium",
            acceptedCount >= 3 ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"
          )}
        >
          {acceptedCount}/3
        </span>
      </div>
    </div>
  );
}

function CompletionStep({
  reviewXP,
  planningXP,
  tasksCreated,
  newDailyReviewStreak,
  isNew,
  onViewSummary,
}: {
  reviewXP: number;
  planningXP: number;
  tasksCreated: number;
  newDailyReviewStreak?: number;
  isNew: boolean;
  onViewSummary: () => void;
}) {
  const totalXP = reviewXP + planningXP;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
          <Sparkles size={32} className="text-[var(--accent-success)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          {isNew ? "Review Complete!" : "Review Updated!"}
        </h2>
        {isNew && totalXP > 0 && (
          <p className="text-sm text-[var(--text-muted)]">
            You earned {totalXP} XP today!
          </p>
        )}
      </motion.div>

      {/* XP Breakdown */}
      {isNew && (
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[var(--accent-primary)]" />
              <span className="text-sm text-[var(--text-primary)]">Daily Review</span>
            </div>
            <span className="font-mono font-medium text-[var(--accent-highlight)]">
              +{reviewXP} XP
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              planningXP > 0 ? "bg-[var(--accent-success)]/10" : "bg-[var(--bg-elevated)]"
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className={planningXP > 0 ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"} />
              <span className="text-sm text-[var(--text-primary)]">
                Planning ({tasksCreated} task{tasksCreated !== 1 ? "s" : ""})
              </span>
            </div>
            <span className={cn(
              "font-mono font-medium",
              planningXP > 0 ? "text-[var(--accent-success)]" : "text-[var(--text-muted)]"
            )}>
              {planningXP > 0 ? `+${planningXP} XP` : "Not earned"}
            </span>
          </motion.div>

          {newDailyReviewStreak && newDailyReviewStreak > 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--accent-streak)]/10"
            >
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-[var(--accent-streak)]" />
                <span className="text-sm text-[var(--text-primary)]">
                  Review Streak: {newDailyReviewStreak} days
                </span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/80 transition-colors"
          )}
        >
          Back to Dashboard
          <ArrowRight size={16} />
        </Link>
        <button
          onClick={onViewSummary}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
            "hover:text-[var(--text-primary)] transition-colors"
          )}
        >
          View Summary
        </button>
      </motion.div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Review Summary View Component
// Displays the completed review with edit capabilities
// -----------------------------------------------------------------------------

const moodLabels: Record<number, { icon: typeof Smile; label: string }> = {
  1: { icon: Frown, label: "Rough" },
  2: { icon: Frown, label: "Meh" },
  3: { icon: Meh, label: "Okay" },
  4: { icon: Smile, label: "Good" },
  5: { icon: Smile, label: "Great!" },
};

const energyLabels: Record<number, { icon: typeof BatteryFull; label: string }> = {
  1: { icon: BatteryLow, label: "Drained" },
  2: { icon: BatteryLow, label: "Low" },
  3: { icon: BatteryMedium, label: "Okay" },
  4: { icon: BatteryMedium, label: "Good" },
  5: { icon: BatteryFull, label: "Full" },
};

function ReviewSummaryView({
  reflection,
  tomorrowTasks,
  quests,
  reviewXP,
  planningXP,
  onEditReflection,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
  editingTask,
  setEditingTask,
  deletingTaskId,
  setDeletingTaskId,
  showAddTaskForm,
  setShowAddTaskForm,
}: {
  reflection: DailyReflection;
  tomorrowTasks: Task[];
  quests: Quest[];
  reviewXP: number;
  planningXP: number;
  onEditReflection: () => void;
  onToggleTask: (taskId: string) => Promise<void>;
  onEditTask: (taskId: string, updates: { title?: string; due_date?: string; priority?: Priority; scheduled_time?: string | null; default_work_duration?: number | null }) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddTask: (title: string, priority: Priority, questId: string | null) => Promise<void>;
  editingTask: Task | null;
  setEditingTask: (task: Task | null) => void;
  deletingTaskId: string | null;
  setDeletingTaskId: (id: string | null) => void;
  showAddTaskForm: boolean;
  setShowAddTaskForm: (show: boolean) => void;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [newTaskQuestId, setNewTaskQuestId] = useState<string | null>(quests[0]?.id ?? null);
  const [addingTask, setAddingTask] = useState(false);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      await onAddTask(newTaskTitle.trim(), newTaskPriority, newTaskQuestId);
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setShowAddTaskForm(false);
    } finally {
      setAddingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* XP Badge */}
      <div className="p-4 rounded-lg bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/30">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={18} className="text-[var(--accent-success)]" />
          <span className="font-semibold text-[var(--text-primary)]">Daily Review Complete</span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Check size={14} className="text-[var(--accent-success)]" />
            <span className="text-[var(--text-secondary)]">+{reviewXP} XP Review</span>
          </span>
          {planningXP > 0 ? (
            <span className="flex items-center gap-1">
              <Check size={14} className="text-[var(--accent-success)]" />
              <span className="text-[var(--text-secondary)]">+{planningXP} XP Planning</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[var(--text-muted)]">
              <X size={14} />
              <span>Planning XP not earned</span>
            </span>
          )}
        </div>
      </div>

      {/* Reflection Summary Card */}
      <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Today&apos;s Reflection
          </h3>
          <button
            onClick={onEditReflection}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
              "text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
            )}
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>

        {/* Wins */}
        {reflection.wins && reflection.wins.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[var(--text-muted)] mb-2">What went well</div>
            <div className="space-y-1">
              {reflection.wins.map((win, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                  <Check size={14} className="text-[var(--accent-success)] mt-0.5 flex-shrink-0" />
                  <span>{win}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Challenges */}
        {reflection.challenges && reflection.challenges.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[var(--text-muted)] mb-2">Challenges</div>
            <div className="space-y-1">
              {reflection.challenges.map((challenge, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                  <X size={14} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                  <span>{challenge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood & Energy */}
        <div className="flex gap-4">
          {reflection.mood && moodLabels[reflection.mood] && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Mood:</span>
              {(() => {
                const MoodIcon = moodLabels[reflection.mood].icon;
                return (
                  <span className="flex items-center gap-1 text-sm text-[var(--text-primary)]">
                    <MoodIcon size={14} className="text-[var(--accent-primary)]" />
                    {moodLabels[reflection.mood].label}
                  </span>
                );
              })()}
            </div>
          )}
          {reflection.energy && energyLabels[reflection.energy] && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Energy:</span>
              {(() => {
                const EnergyIcon = energyLabels[reflection.energy].icon;
                return (
                  <span className="flex items-center gap-1 text-sm text-[var(--text-primary)]">
                    <EnergyIcon size={14} className="text-[var(--accent-highlight)]" />
                    {energyLabels[reflection.energy].label}
                  </span>
                );
              })()}
            </div>
          )}
        </div>

        {/* Notes */}
        {reflection.notes && (
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Notes</div>
            <p className="text-sm text-[var(--text-secondary)]">{reflection.notes}</p>
          </div>
        )}
      </div>

      {/* Tomorrow's Tasks Card */}
      <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Tomorrow&apos;s Plan
          </h3>
          <button
            onClick={() => setShowAddTaskForm(true)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
              "text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
            )}
          >
            <Plus size={12} />
            Add Task
          </button>
        </div>

        {/* Task List */}
        {tomorrowTasks.length > 0 ? (
          <div className="space-y-2">
            {tomorrowTasks.map((task) => {
              const quest = quests.find((q) => q.id === task.quest_id);
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-colors",
                    task.completed ? "bg-[var(--accent-success)]/5" : "hover:bg-[var(--bg-card)]"
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => onToggleTask(task.id)}
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                      task.completed
                        ? "bg-[var(--accent-success)] text-white"
                        : "border border-[var(--border-default)] hover:border-[var(--accent-primary)]"
                    )}
                  >
                    {task.completed && <Check size={12} />}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      task.completed
                        ? "text-[var(--text-muted)] line-through"
                        : "text-[var(--text-primary)]"
                    )}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          task.priority === "high"
                            ? "bg-red-500/10 text-red-500"
                            : task.priority === "medium"
                            ? "bg-yellow-500/10 text-yellow-600"
                            : "bg-green-500/10 text-green-600"
                        )}
                      >
                        {task.priority}
                      </span>
                      {quest && (
                        <span className="text-xs text-[var(--text-muted)] truncate">
                          {quest.title}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingTaskId(task.id)}
                      className="p-1.5 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No tasks planned for tomorrow
          </p>
        )}

        {/* Add Task Form */}
        {showAddTaskForm && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder="Task title..."
              autoFocus
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm",
                "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:border-[var(--accent-primary)]"
              )}
            />
            <div className="flex gap-2">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                className={cn(
                  "px-2 py-1 rounded text-xs",
                  "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                  "text-[var(--text-secondary)]",
                  "focus:outline-none focus:border-[var(--accent-primary)]"
                )}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {quests.length > 0 && (
                <select
                  value={newTaskQuestId ?? ""}
                  onChange={(e) => setNewTaskQuestId(e.target.value || null)}
                  className={cn(
                    "flex-1 px-2 py-1 rounded text-xs truncate",
                    "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                    "text-[var(--text-secondary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                >
                  {quests.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowAddTaskForm(false);
                  setNewTaskTitle("");
                }}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium",
                  "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim() || addingTask}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {addingTask ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        )}

        {/* View in Week View link */}
        <Link
          href="/week"
          className={cn(
            "flex items-center justify-center gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]",
            "text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors"
          )}
        >
          View in Week View
          <ExternalLink size={14} />
        </Link>
      </div>

      {/* Back to Dashboard */}
      <div className="flex justify-center">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/80 transition-colors"
          )}
        >
          Back to Dashboard
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        onSave={async (taskId, updates) => {
          await onEditTask(taskId, updates);
          setEditingTask(null);
        }}
        onClose={() => setEditingTask(null)}
      />

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={deletingTaskId !== null}
        title="Delete Task"
        message="Delete this task? This action cannot be undone."
        onConfirm={async () => {
          if (deletingTaskId) {
            await onDeleteTask(deletingTaskId);
            setDeletingTaskId(null);
          }
        }}
        onCancel={() => setDeletingTaskId(null)}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function ReviewClient() {
  const { refreshProfile } = useProfile();
  const { showXpGain, showLevelUp } = useCelebration();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("summary");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);

  // Summary data
  const [summary, setSummary] = useState<DailySummary | null>(null);

  // Reflection data
  const [wins, setWins] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Planning data
  const [planningMode, setPlanningMode] = useState<PlanningMode>("manual");
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [brainDumpText, setBrainDumpText] = useState("");
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  // Completion data
  const [reviewXPAwarded, setReviewXPAwarded] = useState(0);
  const [planningXPAwarded, setPlanningXPAwarded] = useState(0);
  const [tasksCreatedCount, setTasksCreatedCount] = useState(0);
  const [newDailyReviewStreak, setNewDailyReviewStreak] = useState<number | undefined>();

  // Existing reflection
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);

  // Edit mode state (for editing reflection from summary view)
  const [isEditingFromSummary, setIsEditingFromSummary] = useState(false);

  // Task management state for summary view
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  // Track if this is the first completion (for showing celebration)
  const [showCelebration, setShowCelebration] = useState(false);

  const today = getTodayISO();
  const tomorrow = getTomorrowISO();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch summary, existing reflection, tomorrow tasks, and quests in parallel
        const [summaryRes, reflectionRes, tomorrowRes, questsRes] = await Promise.all([
          fetch(`/api/daily-review/summary?date=${today}`),
          fetch(`/api/daily-review?date=${today}`),
          fetch(`/api/tasks/for-today?date=${tomorrow}`),
          fetch("/api/quests"),
        ]);

        const [summaryData, reflectionData, tomorrowData, questsData] = await Promise.all([
          summaryRes.json(),
          reflectionRes.json(),
          tomorrowRes.json(),
          questsRes.json(),
        ]);

        if (summaryData.ok) setSummary(summaryData.summary);
        if (tomorrowData.ok) {
          // Filter to only include tasks actually due tomorrow (exclude overdue)
          const tasksForTomorrow = (tomorrowData.tasks ?? []).filter(
            (task: Task) => task.due_date === tomorrow
          );
          setTomorrowTasks(tasksForTomorrow);
        }
        if (questsData.ok) setQuests(questsData.quests ?? []);

        // Initialize task drafts with default quest
        if (questsData.ok && questsData.quests?.length > 0) {
          const defaultQuestId = questsData.quests[0].id;
          setTaskDrafts([
            { id: "draft-1", title: "", priority: "medium", quest_id: defaultQuestId },
            { id: "draft-2", title: "", priority: "medium", quest_id: defaultQuestId },
            { id: "draft-3", title: "", priority: "medium", quest_id: defaultQuestId },
          ]);
        }

        if (reflectionData.ok && reflectionData.reflection) {
          const r = reflectionData.reflection as DailyReflection;
          setExistingReflection(r);
          setWins(r.wins ?? []);
          setChallenges(r.challenges ?? []);
          setMood(r.mood);
          setEnergy(r.energy);
          setNotes(r.notes ?? "");
          setReviewXPAwarded(r.xp_awarded ?? 0);
          setPlanningXPAwarded(r.planning_xp_awarded ?? 0);
          // If already completed, go directly to summary view (not celebration)
          if (r.xp_awarded > 0) {
            setStep("reviewSummary");
          }
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [today, tomorrow]);

  // Parse AI brain dump
  const handleParseAI = useCallback(async () => {
    if (!brainDumpText.trim()) return;

    setIsParsingAI(true);
    try {
      const res = await fetch("/api/ai/daily-plan/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brain_dump_text: brainDumpText,
          target_date: tomorrow,
        }),
      });

      const data = await res.json();

      if (data.ok && data.suggestions) {
        // Pre-select all suggestions
        setAiSuggestions(
          data.suggestions.map((s: AISuggestion) => ({ ...s, accepted: true }))
        );
        setAiAdvice(data.advice || null);
      }
    } catch {
      // Silent fail
    } finally {
      setIsParsingAI(false);
    }
  }, [brainDumpText, tomorrow]);

  // Save reflection (awards review XP)
  const saveReflection = useCallback(async () => {
    setSaving(true);

    try {
      const method = existingReflection ? "PATCH" : "POST";

      const res = await fetch("/api/daily-review", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          wins,
          challenges,
          tomorrow_priorities: [], // No longer using text priorities
          mood,
          energy,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setExistingReflection(data.reflection);

        if (data.xpGained) {
          setReviewXPAwarded(data.xpGained);
          showXpGain(data.xpGained);
        }
        if (data.newLevel) {
          showLevelUp(data.newLevel);
        }
        if (data.newDailyReviewStreak) {
          setNewDailyReviewStreak(data.newDailyReviewStreak);
        }

        return true;
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
    return false;
  }, [
    existingReflection,
    today,
    wins,
    challenges,
    mood,
    energy,
    notes,
    showXpGain,
    showLevelUp,
  ]);

  // Create tasks and award planning XP
  const createTasksAndAwardXP = useCallback(async () => {
    // Gather tasks to create
    const tasksToCreate: { title: string; priority: Priority; quest_id: string | null }[] = [];

    if (planningMode === "manual") {
      taskDrafts.forEach((draft) => {
        if (draft.title.trim()) {
          tasksToCreate.push({
            title: draft.title.trim(),
            priority: draft.priority,
            quest_id: draft.quest_id,
          });
        }
      });
    } else {
      const defaultQuestId = quests.length > 0 ? quests[0].id : null;
      aiSuggestions.forEach((s) => {
        if (s.accepted) {
          tasksToCreate.push({
            title: s.title,
            priority: s.priority,
            quest_id: defaultQuestId,
          });
        }
      });
    }

    if (tasksToCreate.length === 0) {
      return { tasksCreated: 0, planningXP: 0 };
    }

    setCreatingTasks(true);
    let successCount = 0;

    try {
      // Create tasks in parallel
      const results = await Promise.all(
        tasksToCreate.map((task) =>
          fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: task.title,
              due_date: tomorrow,
              priority: task.priority,
              quest_id: task.quest_id,
            }),
          }).then((r) => r.json())
        )
      );

      successCount = results.filter((r) => r.ok).length;
      setTasksCreatedCount(successCount);

      // Award planning XP if 3+ tasks created
      if (successCount >= 3) {
        // Call API to award planning XP
        const xpRes = await fetch("/api/daily-review/planning-xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: today, tasks_created: successCount }),
        });

        const xpData = await xpRes.json();
        if (xpData.ok && xpData.xpGained) {
          setPlanningXPAwarded(xpData.xpGained);
          showXpGain(xpData.xpGained);
        }
      }

      refreshProfile();
    } catch {
      // Silent fail
    } finally {
      setCreatingTasks(false);
    }

    return { tasksCreated: successCount, planningXP: successCount >= 3 ? PLANNING_XP.daily_planning : 0 };
  }, [planningMode, taskDrafts, aiSuggestions, quests, tomorrow, today, refreshProfile, showXpGain]);

  // Refresh tomorrow's tasks
  const refreshTomorrowTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/for-today?date=${tomorrow}`);
      const data = await res.json();
      if (data.ok) {
        // Filter to only include tasks actually due tomorrow (exclude overdue)
        const tasksForTomorrow = (data.tasks ?? []).filter(
          (task: Task) => task.due_date === tomorrow
        );
        setTomorrowTasks(tasksForTomorrow);
      }
    } catch {
      // Silent fail
    }
  }, [tomorrow]);

  // Task operations for summary view
  const handleToggleTask = useCallback(async (taskId: string) => {
    try {
      const res = await fetchApi<{ ok: boolean; xpGained?: number; newLevel?: number }>("/api/tasks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      if (res.ok) {
        if (res.xpGained) {
          showXpGain(res.xpGained);
        }
        if (res.newLevel) {
          showLevelUp(res.newLevel);
        }
        await refreshTomorrowTasks();
        refreshProfile();
      }
    } catch {
      // Silent fail
    }
  }, [refreshTomorrowTasks, refreshProfile, showXpGain, showLevelUp]);

  const handleEditTask = useCallback(async (
    taskId: string,
    updates: { title?: string; due_date?: string; priority?: Priority; scheduled_time?: string | null; default_work_duration?: number | null }
  ) => {
    try {
      await fetchApi("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });
      await refreshTomorrowTasks();
    } catch {
      // Silent fail
    }
  }, [refreshTomorrowTasks]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await fetchApi("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      await refreshTomorrowTasks();
      refreshProfile();

      showToast({
        message: "Task deleted",
        type: "default",
        duration: 4000,
      });
    } catch {
      // Silent fail
    }
  }, [refreshTomorrowTasks, refreshProfile, showToast]);

  const handleAddTask = useCallback(async (title: string, priority: Priority, questId: string | null) => {
    try {
      const res = await fetchApi<{ ok: boolean }>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          due_date: tomorrow,
          priority,
          quest_id: questId,
        }),
      });

      if (res.ok) {
        await refreshTomorrowTasks();
        showToast({
          message: "Task added",
          type: "success",
          duration: 3000,
        });
      }
    } catch {
      // Silent fail
    }
  }, [tomorrow, refreshTomorrowTasks, showToast]);

  // Handle editing reflection from summary view
  const handleEditReflection = useCallback(() => {
    setIsEditingFromSummary(true);
    setStep("reflection");
  }, []);

  // Save reflection when editing from summary (returns to summary view)
  const handleSaveReflectionFromSummary = useCallback(async () => {
    const saved = await saveReflection();
    if (saved) {
      setIsEditingFromSummary(false);
      setStep("reviewSummary");
    }
  }, [saveReflection]);

  // Navigation
  const steps: Step[] = ["summary", "reflection", "planning", "completion"];
  const currentIndex = steps.indexOf(step);

  const goNext = async () => {
    if (step === "reflection") {
      // If editing from summary, save and return to summary
      if (isEditingFromSummary) {
        await handleSaveReflectionFromSummary();
        return;
      }
      // Save reflection and move to planning
      const saved = await saveReflection();
      if (saved) {
        setStep("planning");
      }
    } else if (step === "planning") {
      // Create tasks and move to completion (celebration)
      await createTasksAndAwardXP();
      setShowCelebration(true);
      setStep("completion");
    } else if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    // If editing from summary, go back to summary instead of previous step
    if (isEditingFromSummary && step === "reflection") {
      setIsEditingFromSummary(false);
      setStep("reviewSummary");
      return;
    }
    if (currentIndex > 0 && step !== "completion" && step !== "reviewSummary") {
      setStep(steps[currentIndex - 1]);
    }
  };

  const skipPlanning = async () => {
    setTasksCreatedCount(0);
    setPlanningXPAwarded(0);
    setStep("completion");
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="h-64 animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
      </div>
    );
  }

  // Completion state - show celebration step
  if (step === "completion") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <CompletionStep
            reviewXP={reviewXPAwarded}
            planningXP={planningXPAwarded}
            tasksCreated={tasksCreatedCount}
            newDailyReviewStreak={newDailyReviewStreak}
            isNew={showCelebration}
            onViewSummary={() => setStep("reviewSummary")}
          />
        </div>
      </div>
    );
  }

  // Review Summary state - show editable summary view
  if (step === "reviewSummary" && existingReflection) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <ReviewSummaryView
            reflection={existingReflection}
            tomorrowTasks={tomorrowTasks}
            quests={quests}
            reviewXP={reviewXPAwarded}
            planningXP={planningXPAwarded}
            onEditReflection={handleEditReflection}
            onToggleTask={handleToggleTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
            deletingTaskId={deletingTaskId}
            setDeletingTaskId={setDeletingTaskId}
            showAddTaskForm={showAddTaskForm}
            setShowAddTaskForm={setShowAddTaskForm}
          />
        </div>
      </div>
    );
  }

  const acceptedTaskCount = planningMode === "ai"
    ? aiSuggestions.filter((s) => s.accepted).length
    : taskDrafts.filter((d) => d.title.trim()).length;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress indicator - hide when editing from summary */}
      {!isEditingFromSummary && (
        <div className="flex items-center gap-2">
          {steps.slice(0, -1).map((s, i) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                i <= currentIndex ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-elevated)]"
              )}
            />
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === "summary" && <SummaryStep summary={summary} />}
            {step === "reflection" && (
              <>
                {isEditingFromSummary && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30">
                    <div className="flex items-center gap-2 text-sm text-[var(--accent-primary)]">
                      <Pencil size={14} />
                      <span>Editing your reflection</span>
                      <span className="text-[var(--text-muted)]">• XP already earned</span>
                    </div>
                  </div>
                )}
                <ReflectionStep
                  wins={wins}
                  setWins={setWins}
                  challenges={challenges}
                  setChallenges={setChallenges}
                  mood={mood}
                  setMood={setMood}
                  energy={energy}
                  setEnergy={setEnergy}
                  notes={notes}
                  setNotes={setNotes}
                />
              </>
            )}
            {step === "planning" && (
              <PlanningStep
                mode={planningMode}
                setMode={setPlanningMode}
                taskDrafts={taskDrafts}
                setTaskDrafts={setTaskDrafts}
                quests={quests}
                tomorrowTasks={tomorrowTasks}
                aiSuggestions={aiSuggestions}
                setAiSuggestions={setAiSuggestions}
                brainDumpText={brainDumpText}
                setBrainDumpText={setBrainDumpText}
                isParsingAI={isParsingAI}
                onParseAI={handleParseAI}
                aiAdvice={aiAdvice}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={goBack}
          disabled={currentIndex === 0 && !isEditingFromSummary}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <ChevronLeft size={16} />
          {isEditingFromSummary ? "Cancel" : "Back"}
        </button>

        <div className="flex items-center gap-2">
          {step === "planning" && (
            <button
              onClick={skipPlanning}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              Skip
            </button>
          )}

          <button
            onClick={goNext}
            disabled={saving || creatingTasks}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--accent-primary)] text-white",
              "hover:bg-[var(--accent-primary)]/80 transition-colors",
              "disabled:opacity-50"
            )}
          >
            {saving || creatingTasks ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {saving ? "Saving..." : "Creating tasks..."}
              </>
            ) : step === "planning" ? (
              acceptedTaskCount >= 3 ? (
                <>
                  Create {acceptedTaskCount} Tasks
                  <Sparkles size={16} />
                </>
              ) : acceptedTaskCount > 0 ? (
                <>
                  Create {acceptedTaskCount} Task{acceptedTaskCount !== 1 ? "s" : ""}
                  <ChevronRight size={16} />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight size={16} />
                </>
              )
            ) : step === "reflection" ? (
              isEditingFromSummary ? (
                <>
                  Save Changes
                  <Check size={16} />
                </>
              ) : (
                <>
                  Save & Continue
                  <ChevronRight size={16} />
                </>
              )
            ) : (
              <>
                Continue
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper to get tomorrow's date
function getTomorrowISO(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
