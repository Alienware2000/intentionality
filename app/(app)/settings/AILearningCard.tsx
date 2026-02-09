"use client";

// =============================================================================
// AI LEARNING SETTINGS CARD
// Displays and manages what Kofi has learned about the user.
//
// Features:
// - View stated goals
// - Edit work preferences
// - See learned patterns
// - Toggle learning features
// - Reset learned data
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Target,
  Clock,
  Zap,
  RefreshCw,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import type {
  UserLearningProfile,
  UserPatternAggregates,
  WorkStyle,
  MotivationDriver,
} from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type LearningData = {
  profile: UserLearningProfile;
  patterns: UserPatternAggregates | null;
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const WORK_STYLES: Array<{ value: WorkStyle; label: string; description: string }> = [
  { value: "balanced", label: "Balanced", description: "Mix of focused and varied work" },
  { value: "deep-work", label: "Deep Work", description: "Prefer long, uninterrupted focus blocks" },
  { value: "task-switching", label: "Task Switching", description: "Prefer variety and shorter tasks" },
];

const MOTIVATION_DRIVERS: Array<{ value: MotivationDriver; label: string }> = [
  { value: "achievement", label: "Achievement" },
  { value: "mastery", label: "Mastery" },
  { value: "deadline", label: "Deadlines" },
  { value: "social", label: "Social" },
  { value: "competition", label: "Competition" },
  { value: "curiosity", label: "Curiosity" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// -----------------------------------------------------------------------------
// Types (Component Props)
// -----------------------------------------------------------------------------

type AILearningCardProps = {
  isExpanded?: boolean;
  onToggle?: () => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function AILearningCard({
  isExpanded: controlledExpanded,
  onToggle,
}: AILearningCardProps) {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Use controlled state if provided, otherwise internal state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Fetch learning data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/ai/learn");
      const result = await response.json();

      if (result.ok) {
        setData(result);
      } else {
        setError(result.error || "Failed to load learning data");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update profile
  const updateProfile = async (updates: Partial<UserLearningProfile>) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/ai/learn", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.ok) {
        setData(result);
        setSuccess("Saved!");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error || "Failed to save");
      }
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Add goal
  const addGoal = async () => {
    if (!newGoal.trim() || !data) return;

    const updatedGoals = [...data.profile.stated_goals, newGoal.trim()];
    await updateProfile({ stated_goals: updatedGoals });
    setNewGoal("");
  };

  // Remove goal
  const removeGoal = async (index: number) => {
    if (!data) return;

    const updatedGoals = data.profile.stated_goals.filter((_, i) => i !== index);
    await updateProfile({ stated_goals: updatedGoals });
  };

  // Toggle motivation driver
  const toggleMotivation = async (driver: MotivationDriver) => {
    if (!data) return;

    const current = data.profile.motivation_drivers as MotivationDriver[];
    const updated = current.includes(driver)
      ? current.filter((d) => d !== driver)
      : [...current, driver];

    await updateProfile({ motivation_drivers: updated });
  };

  // Reset all data
  const resetData = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/ai/learn", { method: "DELETE" });
      const result = await response.json();

      if (result.ok) {
        setData(result);
        setShowResetConfirm(false);
        setSuccess("Learning data reset");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error || "Failed to reset");
      }
    } catch {
      setError("Failed to reset data");
    } finally {
      setSaving(false);
    }
  };

  // Compute patterns
  const computePatterns = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/ai/learn/compute", { method: "POST" });
      const result = await response.json();

      if (result.ok) {
        await fetchData();
        setSuccess("Patterns updated!");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error || "Failed to compute patterns");
      }
    } catch {
      setError("Failed to compute patterns");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse">
        <div className="h-6 w-48 bg-[var(--skeleton-bg)] rounded mb-4" />
        <div className="h-4 w-full bg-[var(--skeleton-bg)] rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <p className="text-[var(--text-muted)]">Unable to load learning data</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-[var(--accent-primary)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { profile, patterns } = data;

  return (
    <div className="rounded-xl bg-[var(--bg-card)] glass-card border border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between p-4 text-left",
          "hover:bg-[var(--bg-hover)] transition-colors",
          "min-h-[44px]",
          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
          "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-highlight)]/10">
            <Bot size={18} className="text-[var(--accent-highlight)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              What Kofi Has Learned
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {profile.stated_goals.length > 0
                ? `${profile.stated_goals.length} goal${profile.stated_goals.length > 1 ? "s" : ""} tracked`
                : "Personalization data"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {success && (
            <span className="flex items-center gap-1 text-xs text-[var(--accent-success)]">
              <CheckCircle2 size={14} />
              {success}
            </span>
          )}
          {saving && <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />}
          {expanded ? (
            <ChevronUp size={18} className="text-[var(--text-muted)]" />
          ) : (
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Goals Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-[var(--accent-primary)]" />
              <h4 className="text-sm font-medium text-[var(--text-primary)]">Goals</h4>
            </div>
            <div className="space-y-2">
              {profile.stated_goals.map((goal, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-elevated)]"
                >
                  <span className="text-sm text-[var(--text-secondary)]">{goal}</span>
                  <button
                    onClick={() => removeGoal(index)}
                    className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  placeholder="Add a goal (e.g., Graduate with honors)"
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm",
                    "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                    "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                    "focus:outline-none focus:border-[var(--accent-primary)]"
                  )}
                />
                <button
                  onClick={addGoal}
                  disabled={!newGoal.trim() || saving}
                  className={cn(
                    "px-3 py-2 rounded-lg transition-colors",
                    newGoal.trim()
                      ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed"
                  )}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Work Style Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-[var(--accent-primary)]" />
              <h4 className="text-sm font-medium text-[var(--text-primary)]">Work Style</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {WORK_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => updateProfile({ work_style: style.value })}
                  disabled={saving}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-colors",
                    profile.work_style === style.value
                      ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]"
                      : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                  )}
                >
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {style.label}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {style.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Focus Duration */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-[var(--accent-primary)]" />
              <h4 className="text-sm font-medium text-[var(--text-primary)]">Preferred Focus Duration</h4>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="90"
                step="5"
                value={profile.preferred_focus_duration}
                onChange={(e) => updateProfile({ preferred_focus_duration: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm font-medium text-[var(--text-primary)] w-16 text-right">
                {profile.preferred_focus_duration} min
              </span>
            </div>
          </div>

          {/* Motivation Drivers */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-[var(--accent-primary)]" />
              <h4 className="text-sm font-medium text-[var(--text-primary)]">What Motivates You</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOTIVATION_DRIVERS.map((driver) => (
                <button
                  key={driver.value}
                  onClick={() => toggleMotivation(driver.value)}
                  disabled={saving}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-colors",
                    (profile.motivation_drivers as string[]).includes(driver.value)
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  {driver.label}
                </button>
              ))}
            </div>
          </div>

          {/* Learned Patterns */}
          {patterns && patterns.days_analyzed > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-[var(--accent-primary)]" />
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">Learned Patterns</h4>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  Based on {patterns.days_analyzed} days
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--bg-elevated)]">
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Completion Rate</div>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">
                    {Math.round(patterns.avg_completion_rate * 100)}%
                  </div>
                </div>
                {patterns.best_completion_day !== null && (
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Best Day</div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {DAY_NAMES[patterns.best_completion_day]}
                    </div>
                  </div>
                )}
                {patterns.ai_advice_acceptance_rate > 0 && (
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Advice Acceptance</div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {Math.round(patterns.ai_advice_acceptance_rate * 100)}%
                    </div>
                  </div>
                )}
                {patterns.preferred_focus_hours.length > 0 && (
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Peak Hours</div>
                    <div className="text-lg font-semibold text-[var(--text-primary)]">
                      {patterns.preferred_focus_hours.slice(0, 2).map(h => `${h}:00`).join(", ")}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={computePatterns}
                disabled={saving}
                className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <RefreshCw size={12} />
                Refresh patterns
              </button>
            </div>
          )}

          {/* Learning Toggle & Reset */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.learning_enabled}
                onChange={(e) => updateProfile({ learning_enabled: e.target.checked })}
                className="rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Enable learning from conversations
              </span>
            </label>

            {showResetConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">Are you sure?</span>
                <button
                  onClick={resetData}
                  disabled={saving}
                  className="px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 rounded text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-red-500"
              >
                <Trash2 size={12} />
                Reset all learned data
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
