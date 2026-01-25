"use client";

// =============================================================================
// HABITS CLIENT COMPONENT
// Daily habits management with add, toggle, edit, and delete.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import type { ISODateString, Id, HabitWithStatus, Priority, HabitFrequency, DayOfWeek } from "@/app/lib/types";
import { isActiveDay } from "@/app/lib/date-utils";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import { useProfile } from "./ProfileProvider";
import { useOnboarding } from "./OnboardingProvider";
import { useCelebration } from "./CelebrationOverlay";
import HabitCard from "./HabitCard";
import EditHabitModal from "./EditHabitModal";
import ConfirmModal from "./ConfirmModal";

type Props = {
  date: ISODateString;
  onHabitToggle?: () => void;
};

type HabitsResponse = { ok: true; habits: HabitWithStatus[] };

// Frequency options for the add form dropdown
const frequencyOptions: { value: HabitFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Mon-Fri" },
  { value: "weekends", label: "Sat-Sun" },
];

export default function HabitsClient({ date, onHabitToggle }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit/Delete state
  const [editingHabit, setEditingHabit] = useState<HabitWithStatus | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<Id | null>(null);

  const { refreshProfile } = useProfile();
  const { markStepComplete } = useOnboarding();
  const { showXpGain, showLevelUp, showStreakMilestone } = useCelebration();

  const refreshHabits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<HabitsResponse>(`/api/habits?date=${date}`);
      setHabits(data.habits);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refreshHabits();
  }, [refreshHabits]);

  // Sort: active incomplete first, then completed, then inactive (not scheduled today)
  const sortedHabits = useMemo(() => {
    return [...habits].sort((a, b) => {
      const aActive = isActiveDay(date, a.active_days ?? [1, 2, 3, 4, 5, 6, 7]);
      const bActive = isActiveDay(date, b.active_days ?? [1, 2, 3, 4, 5, 6, 7]);

      // Active habits come before inactive
      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }

      // Within active habits: incomplete before completed
      if (aActive && bActive) {
        if (a.completedToday !== b.completedToday) {
          return a.completedToday ? 1 : -1;
        }
      }

      // Sort by streak (descending)
      return b.current_streak - a.current_streak;
    });
  }, [habits, date]);

  async function handleToggle(habitId: Id) {
    // 1. Find habit and capture previous state
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const wasCompleted = habit.completedToday;
    const previousStreak = habit.current_streak;

    // 2. Optimistic update - immediate
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habitId
          ? {
              ...h,
              completedToday: !wasCompleted,
              // Optimistically adjust streak: +1 if completing, -1 if uncompleting (min 0)
              current_streak: wasCompleted
                ? Math.max(0, h.current_streak - 1)
                : h.current_streak + 1,
            }
          : h
      )
    );

    // 3. API call in background
    try {
      const res = await fetch("/api/habits/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date }),
      });

      if (!res.ok) {
        // Rollback on HTTP error
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? { ...h, completedToday: wasCompleted, current_streak: previousStreak }
              : h
          )
        );
        setError("Failed to toggle habit");
        return;
      }

      // Reconcile streak with server response
      const data = await res.json();
      if (data.newStreak !== undefined) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId ? { ...h, current_streak: data.newStreak } : h
          )
        );
      }

      refreshProfile();
      onHabitToggle?.();

      // Show XP and streak celebrations when completing (not uncompleting)
      if (!wasCompleted) {
        if (data.xpGained) {
          showXpGain(data.xpGained);
        }
        if (data.newLevel) {
          showLevelUp(data.newLevel);
        }
        if (data.newStreak && [7, 14, 21, 30, 60, 90, 100, 150, 180, 200, 365].includes(data.newStreak)) {
          showStreakMilestone(data.newStreak);
        }
      }
    } catch {
      // 4. Rollback on error
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? { ...h, completedToday: wasCompleted, current_streak: previousStreak }
            : h
        )
      );
      setError("Failed to toggle habit");
    }
  }

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setError(null);

    try {
      await fetchApi("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, priority, frequency }),
      });

      setTitle("");
      setFrequency("daily");
      await refreshHabits();
      // Mark onboarding step complete
      markStepComplete("create_habit");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleEditHabit(
    habitId: Id,
    updates: {
      title?: string;
      priority?: Priority;
      frequency?: HabitFrequency;
      active_days?: DayOfWeek[];
    }
  ) {
    try {
      await fetchApi("/api/habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, ...updates }),
      });

      await refreshHabits();
      setEditingHabit(null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleDeleteHabit(habitId: Id) {
    try {
      await fetchApi("/api/habits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      });

      setDeletingHabitId(null);
      await refreshHabits();
      refreshProfile();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  function openEditModal(habitId: Id) {
    const habit = habits.find((h) => h.id === habitId);
    if (habit) setEditingHabit(habit);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse bg-[var(--skeleton-bg)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add Habit Form - stacks on mobile */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={cn(
              "flex-1 sm:flex-initial rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
              "px-3 py-2.5 text-sm text-[var(--text-primary)]",
              "outline-none focus:border-[var(--accent-primary)]"
            )}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
            className={cn(
              "flex-1 sm:flex-initial rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
              "px-3 py-2.5 text-sm text-[var(--text-primary)]",
              "outline-none focus:border-[var(--accent-primary)]"
            )}
          >
            {frequencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Add a daily habit..."
            className={cn(
              "flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
              "px-3 py-2.5 text-sm text-[var(--text-primary)]",
              "placeholder:text-[var(--text-muted)]",
              "outline-none focus:border-[var(--accent-primary)]"
            )}
          />

          <button
            type="button"
            onClick={handleAdd}
            className={cn(
              "flex items-center justify-center",
              "rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
              "px-4 py-2.5 text-sm text-[var(--accent-primary)]",
              "hover:bg-[var(--accent-primary)]/20 transition-colors"
            )}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--accent-primary)]">Error: {error}</p>
      )}

      {/* Habits List */}
      <div className="space-y-1">
        {sortedHabits.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-6 text-center">
            No habits yet. Add one to build consistency.
          </p>
        ) : (
          sortedHabits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              date={date}
              onToggle={handleToggle}
              onEdit={openEditModal}
              onDelete={setDeletingHabitId}
            />
          ))
        )}
      </div>

      {/* Edit Habit Modal */}
      <EditHabitModal
        habit={editingHabit}
        onSave={handleEditHabit}
        onClose={() => setEditingHabit(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingHabitId !== null}
        title="Delete Habit"
        message="This will permanently delete the habit and all its completion history."
        onConfirm={() => deletingHabitId && handleDeleteHabit(deletingHabitId)}
        onCancel={() => setDeletingHabitId(null)}
      />
    </div>
  );
}
