"use client";

// =============================================================================
// DASHBOARD STATS COMPONENT
// Displays key stats with icons: habits, tasks, XP, streak, quests.
// =============================================================================

import { useEffect, useState, useMemo, useCallback } from "react";
import { Heart, CheckCircle, Zap, Flame, Target } from "lucide-react";
import StatCard from "./StatCard";
import type { Task, Quest, HabitWithStatus } from "@/app/lib/types";
import { useProfile } from "./ProfileProvider";

type Props = {
  date: string;
  refreshTrigger?: number;
};

export default function DashboardStats({ date, refreshTrigger }: Props) {
  const { profile, loading: profileLoading } = useProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [tasksRes, questsRes, habitsRes] = await Promise.all([
        fetch(`/api/tasks/for-today?date=${date}`),
        fetch("/api/quests"),
        fetch(`/api/habits?date=${date}`),
      ]);

      const [tasksData, questsData, habitsData] = await Promise.all([
        tasksRes.json(),
        questsRes.json(),
        habitsRes.json(),
      ]);

      if (tasksData.ok) setTasks(tasksData.tasks);
      if (questsData.ok) setQuests(questsData.quests);
      if (habitsData.ok) setHabits(habitsData.habits);
    } catch {
      // Silent fail - stats will show defaults
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

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

  if (loading || profileLoading) {
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
        icon={Heart}
        accent
        accentColor="primary"
      />
      <StatCard
        value={`${completedToday}/${totalToday}`}
        label="tasks today"
        icon={CheckCircle}
        accent
        accentColor="success"
      />
      <StatCard
        value={profile?.xp_total ?? 0}
        label="total XP"
        icon={Zap}
        accent
        accentColor="highlight"
      />
      <StatCard
        value={profile?.current_streak ?? 0}
        label="day streak"
        icon={Flame}
        accent
        accentColor="streak"
      />
      <StatCard
        value={`${completedQuests}/${quests.length}`}
        label="quests done"
        icon={Target}
      />
    </div>
  );
}
