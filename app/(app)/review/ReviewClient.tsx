"use client";

// =============================================================================
// REVIEW CLIENT COMPONENT
// Multi-step daily review flow:
// 1. Today's Summary - Auto-generated stats
// 2. Reflection - What went well/challenges + mood/energy
// 3. Tomorrow Setup - Set priorities for tomorrow
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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/cn";
import { useProfile } from "@/app/components/ProfileProvider";
import { useCelebration } from "@/app/components/CelebrationOverlay";
import { getTodayISO } from "@/app/lib/date-utils";
import type { DailySummary, DailyReflection, Task } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Step = "summary" | "reflection" | "tomorrow";

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

function TomorrowStep({
  priorities,
  setPriorities,
  tomorrowTasks,
}: {
  priorities: string[];
  setPriorities: (priorities: string[]) => void;
  tomorrowTasks: Task[];
}) {
  const [newPriority, setNewPriority] = useState("");

  const addPriority = () => {
    if (newPriority.trim() && priorities.length < 3) {
      setPriorities([...priorities, newPriority.trim()]);
      setNewPriority("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Plan Tomorrow
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Set your top 3 priorities for tomorrow
        </p>
      </div>

      {/* Tomorrow's Tasks Preview */}
      {tomorrowTasks.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Tasks scheduled for tomorrow ({tomorrowTasks.length})
          </label>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {tomorrowTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg",
                  "bg-[var(--bg-elevated)] border-l-2",
                  task.priority === "high" && "border-l-[var(--priority-high)]",
                  task.priority === "medium" && "border-l-[var(--priority-medium)]",
                  task.priority === "low" && "border-l-[var(--priority-low)]"
                )}
              >
                <span className="text-sm text-[var(--text-primary)] truncate">
                  {task.title}
                </span>
              </div>
            ))}
            {tomorrowTasks.length > 5 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-1">
                +{tomorrowTasks.length - 5} more tasks
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Priorities */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Top 3 priorities for tomorrow
        </label>
        <div className="space-y-2">
          {priorities.map((priority, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-3 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30"
            >
              <span className="w-6 h-6 rounded-full bg-[var(--accent-primary)] text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-[var(--text-primary)]">{priority}</span>
              <button
                onClick={() => setPriorities(priorities.filter((_, j) => j !== i))}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {priorities.length < 3 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPriority()}
                placeholder={`Priority ${priorities.length + 1}...`}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm",
                  "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                  "focus:outline-none focus:border-[var(--accent-primary)]"
                )}
              />
              <button
                onClick={addPriority}
                disabled={!newPriority.trim()}
                className={cn(
                  "px-3 py-2 rounded-lg",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {3 - priorities.length} slot{3 - priorities.length !== 1 ? "s" : ""} remaining
        </p>
      </div>
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
  const [completed, setCompleted] = useState(false);

  // Summary data
  const [summary, setSummary] = useState<DailySummary | null>(null);

  // Reflection data
  const [wins, setWins] = useState<string[]>([]);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Tomorrow data
  const [priorities, setPriorities] = useState<string[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);

  // Existing reflection
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);

  const today = getTodayISO();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch summary and existing reflection in parallel
        const [summaryRes, reflectionRes, tomorrowRes] = await Promise.all([
          fetch(`/api/daily-review/summary?date=${today}`),
          fetch(`/api/daily-review?date=${today}`),
          fetch(`/api/tasks/for-today?date=${getTomorrowISO()}`),
        ]);

        const [summaryData, reflectionData, tomorrowData] = await Promise.all([
          summaryRes.json(),
          reflectionRes.json(),
          tomorrowRes.json(),
        ]);

        if (summaryData.ok) setSummary(summaryData.summary);
        if (tomorrowData.ok) setTomorrowTasks(tomorrowData.tasks ?? []);

        if (reflectionData.ok && reflectionData.reflection) {
          const r = reflectionData.reflection as DailyReflection;
          setExistingReflection(r);
          setWins(r.wins ?? []);
          setChallenges(r.challenges ?? []);
          setMood(r.mood);
          setEnergy(r.energy);
          setNotes(r.notes ?? "");
          setPriorities(r.tomorrow_priorities ?? []);
          setCompleted(true);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [today]);

  const handleSave = useCallback(async () => {
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
          tomorrow_priorities: priorities,
          mood,
          energy,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setCompleted(true);
        setExistingReflection(data.reflection);
        refreshProfile();

        if (data.xpGained) {
          showXpGain(data.xpGained);
        }
        if (data.newLevel) {
          showLevelUp(data.newLevel);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setSaving(false);
    }
  }, [
    existingReflection,
    today,
    wins,
    challenges,
    priorities,
    mood,
    energy,
    notes,
    refreshProfile,
    showXpGain,
    showLevelUp,
  ]);

  const steps: Step[] = ["summary", "reflection", "tomorrow"];
  const currentIndex = steps.indexOf(step);

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      handleSave();
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="h-64 animate-pulse bg-[var(--skeleton-bg)] rounded-xl" />
      </div>
    );
  }

  // Completed state
  if (completed && step === "tomorrow") {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
            <Sparkles size={32} className="text-[var(--accent-success)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Review Complete!
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            {existingReflection
              ? "Your reflection has been updated."
              : "You earned 15 XP for completing your daily review!"}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--accent-primary)] text-white",
                "hover:bg-[var(--accent-primary)]/80 transition-colors"
              )}
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => setStep("summary")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
                "hover:text-[var(--text-primary)] transition-colors"
              )}
            >
              Edit Review
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
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
            {step === "tomorrow" && (
              <TomorrowStep
                priorities={priorities}
                setPriorities={setPriorities}
                tomorrowTasks={tomorrowTasks}
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

        <button
          onClick={goNext}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/80 transition-colors",
            "disabled:opacity-50"
          )}
        >
          {saving ? (
            "Saving..."
          ) : currentIndex === steps.length - 1 ? (
            <>
              Complete Review
              <Sparkles size={16} />
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
