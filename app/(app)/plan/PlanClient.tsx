"use client";

// =============================================================================
// PLAN CLIENT COMPONENT
// Weekly planning flow:
// 1. Last Week Review - Stats from previous week
// 2. Weekly Goals - Set 3-5 goals for the week
// 3. Focus Areas - Define what to prioritize
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle,
  Target,
  Clock,
  BookOpen,
  Plus,
  X,
  Sparkles,
  Calendar,
  Smile,
  Battery,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/cn";
import { useProfile } from "@/app/components/ProfileProvider";
import { useCelebration } from "@/app/components/CelebrationOverlay";
import type { WeeklySummary, WeeklyPlan, ISODateString } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Step = "review" | "goals" | "focus";

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getWeekMonday(date: Date = new Date()): ISODateString {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}` as ISODateString;
}

function formatWeekRange(monday: ISODateString): string {
  const start = new Date(monday);
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

// -----------------------------------------------------------------------------
// Step Components
// -----------------------------------------------------------------------------

function ReviewStep({ summary }: { summary: WeeklySummary | null }) {
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
      value: summary.tasksCompleted.toString(),
      color: "text-[var(--accent-success)]",
    },
    {
      icon: Target,
      label: "Quests progressed",
      value: summary.questsProgressed.toString(),
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
      value: `${Math.round(summary.focusMinutes / 60)}h ${summary.focusMinutes % 60}m`,
      color: "text-[var(--text-secondary)]",
    },
    {
      icon: BookOpen,
      label: "Daily reviews",
      value: `${summary.dailyReviewsCompleted}/7`,
      color: "text-[var(--accent-success)]",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Last Week Review
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {formatWeekRange(summary.weekStart)}
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

      {/* Mood/Energy summary */}
      {(summary.averageMood !== null || summary.averageEnergy !== null) && (
        <div className="grid grid-cols-2 gap-3">
          {summary.averageMood !== null && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <Smile size={18} className="text-[var(--accent-primary)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">Avg. Mood</p>
                <p className="text-lg font-mono font-bold text-[var(--text-primary)]">
                  {summary.averageMood.toFixed(1)}/5
                </p>
              </div>
            </div>
          )}
          {summary.averageEnergy !== null && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <Battery size={18} className="text-[var(--accent-highlight)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">Avg. Energy</p>
                <p className="text-lg font-mono font-bold text-[var(--text-primary)]">
                  {summary.averageEnergy.toFixed(1)}/5
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalsStep({
  goals,
  setGoals,
}: {
  goals: string[];
  setGoals: (goals: string[]) => void;
}) {
  const [newGoal, setNewGoal] = useState("");

  const addGoal = () => {
    if (newGoal.trim() && goals.length < 5) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          This Week&apos;s Goals
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Set 3-5 clear goals for the week ahead
        </p>
      </div>

      <div className="space-y-2">
        {goals.map((goal, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30"
          >
            <span className="w-6 h-6 rounded-full bg-[var(--accent-primary)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-[var(--text-primary)]">{goal}</span>
            <button
              onClick={() => setGoals(goals.filter((_, j) => j !== i))}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {goals.length < 5 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGoal()}
              placeholder={`Goal ${goals.length + 1}...`}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm",
                "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:border-[var(--accent-primary)]"
              )}
            />
            <button
              onClick={addGoal}
              disabled={!newGoal.trim()}
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

        <p className="text-xs text-[var(--text-muted)]">
          {goals.length}/5 goals set
          {goals.length < 3 && " (minimum 3 recommended)"}
        </p>
      </div>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        <p className="text-xs text-[var(--text-secondary)] font-medium mb-2">Tips for effective goals:</p>
        <ul className="text-xs text-[var(--text-muted)] space-y-1">
          <li>• Be specific: &quot;Finish project report&quot; not &quot;Work on project&quot;</li>
          <li>• Make them achievable within the week</li>
          <li>• Connect to your Quests when possible</li>
        </ul>
      </div>
    </div>
  );
}

function FocusStep({
  focusAreas,
  setFocusAreas,
}: {
  focusAreas: string[];
  setFocusAreas: (areas: string[]) => void;
}) {
  const [newArea, setNewArea] = useState("");

  const presetAreas = [
    "Deep Work",
    "Health & Exercise",
    "Learning",
    "Relationships",
    "Career",
    "Creativity",
    "Rest & Recovery",
    "Organization",
  ];

  const addArea = (area: string) => {
    if (area.trim() && focusAreas.length < 3 && !focusAreas.includes(area.trim())) {
      setFocusAreas([...focusAreas, area.trim()]);
      setNewArea("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Focus Areas
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Choose up to 3 areas to prioritize this week
        </p>
      </div>

      {/* Selected areas */}
      {focusAreas.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Selected ({focusAreas.length}/3)
          </label>
          <div className="flex flex-wrap gap-2">
            {focusAreas.map((area) => (
              <div
                key={area}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-highlight)]/10 border border-[var(--accent-highlight)]/30"
              >
                <span className="text-sm text-[var(--accent-highlight)]">{area}</span>
                <button
                  onClick={() => setFocusAreas(focusAreas.filter((a) => a !== area))}
                  className="text-[var(--accent-highlight)]/60 hover:text-[var(--accent-highlight)]"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preset options */}
      {focusAreas.length < 3 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Quick add
          </label>
          <div className="flex flex-wrap gap-2">
            {presetAreas
              .filter((area) => !focusAreas.includes(area))
              .map((area) => (
                <button
                  key={area}
                  onClick={() => addArea(area)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm",
                    "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:border-[var(--border-default)] transition-colors"
                  )}
                >
                  {area}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Custom input */}
      {focusAreas.length < 3 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Or add your own
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addArea(newArea)}
              placeholder="Custom focus area..."
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm",
                "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:border-[var(--accent-primary)]"
              )}
            />
            <button
              onClick={() => addArea(newArea)}
              disabled={!newArea.trim()}
              className={cn(
                "px-3 py-2 rounded-lg",
                "bg-[var(--accent-highlight)] text-black",
                "hover:bg-[var(--accent-highlight)]/80",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function PlanClient() {
  const { refreshProfile } = useProfile();
  const { showXpGain, showLevelUp } = useCelebration();

  const [step, setStep] = useState<Step>("review");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Summary data
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  // Plan data
  const [goals, setGoals] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  // Existing plan
  const [existingPlan, setExistingPlan] = useState<WeeklyPlan | null>(null);

  const currentWeekMonday = getWeekMonday();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch summary (last week) and existing plan (this week) in parallel
        const [summaryRes, planRes] = await Promise.all([
          fetch("/api/weekly-plan/summary"),
          fetch(`/api/weekly-plan?week_start=${currentWeekMonday}`),
        ]);

        const [summaryData, planData] = await Promise.all([
          summaryRes.json(),
          planRes.json(),
        ]);

        if (summaryData.ok) setSummary(summaryData.summary);

        if (planData.ok && planData.plan) {
          const p = planData.plan as WeeklyPlan;
          setExistingPlan(p);
          setGoals(p.goals ?? []);
          setFocusAreas(p.focus_areas ?? []);
          setCompleted(true);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentWeekMonday]);

  const handleSave = useCallback(async () => {
    if (goals.length < 1) return;

    setSaving(true);

    try {
      const method = existingPlan ? "PATCH" : "POST";

      const res = await fetch("/api/weekly-plan", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: currentWeekMonday,
          goals,
          focus_areas: focusAreas,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setCompleted(true);
        setExistingPlan(data.plan);
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
  }, [existingPlan, currentWeekMonday, goals, focusAreas, refreshProfile, showXpGain, showLevelUp]);

  const steps: Step[] = ["review", "goals", "focus"];
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
  if (completed && step === "focus") {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
            <Calendar size={32} className="text-[var(--accent-success)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Week Planned!
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {existingPlan
              ? "Your weekly plan has been updated."
              : "You earned 25 XP for completing your weekly planning!"}
          </p>

          {/* Summary of plan */}
          <div className="text-left p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] mb-6">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">
              This week: {formatWeekRange(currentWeekMonday)}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-2">
              <strong className="text-[var(--text-primary)]">{goals.length}</strong> goals set
            </p>
            {focusAreas.length > 0 && (
              <p className="text-sm text-[var(--text-secondary)]">
                Focusing on: {focusAreas.join(", ")}
              </p>
            )}
          </div>

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
              onClick={() => setStep("review")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
                "hover:text-[var(--text-primary)] transition-colors"
              )}
            >
              Edit Plan
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
            {step === "review" && <ReviewStep summary={summary} />}
            {step === "goals" && <GoalsStep goals={goals} setGoals={setGoals} />}
            {step === "focus" && <FocusStep focusAreas={focusAreas} setFocusAreas={setFocusAreas} />}
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
          disabled={saving || (step === "goals" && goals.length === 0)}
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
              Complete Planning
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
