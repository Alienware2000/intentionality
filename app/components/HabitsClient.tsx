"use client";

// =============================================================================
// HABITS CLIENT COMPONENT
// Daily habits management with add, toggle, edit, and delete.
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import type { ISODateString, Id, HabitWithStatus, Priority } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import { useProfile } from "./ProfileProvider";
import HabitCard from "./HabitCard";
import EditHabitModal from "./EditHabitModal";
import ConfirmModal from "./ConfirmModal";

type Props = {
  date: ISODateString;
};

type HabitsResponse = { ok: true; habits: HabitWithStatus[] };

export default function HabitsClient({ date }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit/Delete state
  const [editingHabit, setEditingHabit] = useState<HabitWithStatus | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<Id | null>(null);

  const { refreshProfile } = useProfile();

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

  // Sort: incomplete habits first, then by streak (descending)
  const sortedHabits = useMemo(() => {
    return [...habits].sort((a, b) => {
      if (a.completedToday !== b.completedToday) {
        return a.completedToday ? 1 : -1;
      }
      return b.current_streak - a.current_streak;
    });
  }, [habits]);

  async function handleToggle(habitId: Id) {
    const res = await fetch("/api/habits/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitId, date }),
    });

    if (!res.ok) {
      setError("Failed to toggle habit");
      return;
    }

    await refreshHabits();
    refreshProfile();
  }

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setError(null);

    try {
      await fetchApi("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, priority }),
      });

      setTitle("");
      await refreshHabits();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function handleEditHabit(
    habitId: Id,
    updates: { title?: string; priority?: Priority }
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
            className="h-12 animate-pulse bg-[var(--bg-card)] rounded-lg"
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
