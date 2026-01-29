"use client";

// =============================================================================
// REVIEW CLIENT COMPONENT
// Multi-step daily review flow (4 steps):
// 1. Today's Summary - Auto-generated stats
// 2. Reflection - What went well/challenges + mood/energy (awards 10 XP)
// 3. Plan Tomorrow - Create tasks (manual or AI) (awards 10 XP for 3+ tasks)
// 4. Completion - XP celebration with breakdown
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
} from "lucide-react";
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

type Step = "summary" | "reflection" | "planning" | "completion";

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
}: {
  reviewXP: number;
  planningXP: number;
  tasksCreated: number;
  newDailyReviewStreak?: number;
  isNew: boolean;
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
        className="flex gap-3 justify-center"
      >
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
        {tasksCreated > 0 && (
          <Link
            href="/week"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
              "hover:text-[var(--text-primary)] transition-colors"
            )}
          >
            View Tomorrow
          </Link>
        )}
      </motion.div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function ReviewClient() {
  const { refreshProfile } = useProfile();
  const { showXpGain, showLevelUp } = useCelebration();

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
        if (tomorrowData.ok) setTomorrowTasks(tomorrowData.tasks ?? []);
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
          // If already completed, go to completion step
          if (r.xp_awarded > 0) {
            setStep("completion");
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

  // Navigation
  const steps: Step[] = ["summary", "reflection", "planning", "completion"];
  const currentIndex = steps.indexOf(step);

  const goNext = async () => {
    if (step === "reflection") {
      // Save reflection and move to planning
      const saved = await saveReflection();
      if (saved) {
        setStep("planning");
      }
    } else if (step === "planning") {
      // Create tasks and move to completion
      await createTasksAndAwardXP();
      setStep("completion");
    } else if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentIndex > 0 && step !== "completion") {
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

  // Completion state - show completion step
  if (step === "completion") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          <CompletionStep
            reviewXP={reviewXPAwarded}
            planningXP={planningXPAwarded}
            tasksCreated={tasksCreatedCount}
            newDailyReviewStreak={newDailyReviewStreak}
            isNew={!existingReflection || reviewXPAwarded > 0}
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
      {/* Progress indicator */}
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
          disabled={currentIndex === 0}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <ChevronLeft size={16} />
          Back
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
              <>
                Save & Continue
                <ChevronRight size={16} />
              </>
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
