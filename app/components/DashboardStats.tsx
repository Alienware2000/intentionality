"use client";

// =============================================================================
// DASHBOARD STATS COMPONENT
// Displays key stats: tasks today, XP, streak, quests.
// =============================================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import StatCard from "./StatCard";
import type { Task, Quest, UserProfile, HabitWithStatus } from "@/app/lib/types";

type Props = {
  date: string;
};

export default function DashboardStats({ date }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [profileRes, tasksRes, questsRes, habitsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch(`/api/tasks/for-today?date=${date}`),
        fetch("/api/quests"),
        fetch(`/api/habits?date=${date}`),
      ]);

      const [profileData, tasksData, questsData, habitsData] = await Promise.all([
        profileRes.json(),
        tasksRes.json(),
        questsRes.json(),
        habitsRes.json(),
      ]);

      if (profileData.ok) setProfile(profileData.profile);
      if (tasksData.ok) setTasks(tasksData.tasks);
      if (questsData.ok) setQuests(questsData.quests);
      if (habitsData.ok) setHabits(habitsData.habits);
    } catch (e) {
      console.error("Failed to load stats", e);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadStats();

    // Listen for updates from other components
    const handleUpdate = () => loadStats();
    window.addEventListener("profile-updated", handleUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleUpdate);
    };
  }, [loadStats]);

  // Pre-compute tasks by quest for O(1) lookups instead of O(N×M)
  const tasksByQuest = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!map[task.quest_id]) map[task.quest_id] = [];
      map[task.quest_id].push(task);
    }
    return map;
  }, [tasks]);

  const completedQuests = useMemo(() => {
    return quests.filter((q) => {
      const questTasks = tasksByQuest[q.id] ?? [];
      return questTasks.length > 0 && questTasks.every((t) => t.completed);
    }).length;
  }, [quests, tasksByQuest]);

  const todayTasks = useMemo(() => tasks.filter((t) => t.due_date === date), [tasks, date]);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const totalToday = todayTasks.length;

  const completedHabits = useMemo(() => habits.filter((h) => h.completedToday).length, [habits]);
  const totalHabits = habits.length;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard
        value={`${completedHabits}/${totalHabits}`}
        label="habits today"
        accent
      />
      <StatCard
        value={`${completedToday}/${totalToday}`}
        label="tasks today"
      />
      <StatCard
        value={profile?.xp_total ?? 0}
        label="total XP"
      />
      <StatCard
        value={profile?.current_streak ?? 0}
        label="day streak"
      />
      <StatCard
        value={`${completedQuests}/${quests.length}`}
        label="quests done"
      />
    </div>
  );
}
