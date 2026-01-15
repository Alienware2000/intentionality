"use client";

// =============================================================================
// DASHBOARD STATS COMPONENT
// Displays key stats: tasks today, XP, streak, quests.
// =============================================================================

import { useEffect, useState } from "react";
import StatCard from "./StatCard";
import type { Task, Quest, UserProfile } from "@/app/lib/types";

type Props = {
  date: string;
};

export default function DashboardStats({ date }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [profileRes, tasksRes, questsRes] = await Promise.all([
          fetch("/api/profile"),
          fetch(`/api/tasks/for-today?date=${date}`),
          fetch("/api/quests"),
        ]);

        const [profileData, tasksData, questsData] = await Promise.all([
          profileRes.json(),
          tasksRes.json(),
          questsRes.json(),
        ]);

        if (profileData.ok) setProfile(profileData.profile);
        if (tasksData.ok) setTasks(tasksData.tasks);
        if (questsData.ok) setQuests(questsData.quests);
      } catch (e) {
        console.error("Failed to load stats", e);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [date]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  const todayTasks = tasks.filter((t) => t.due_date === date);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const totalToday = todayTasks.length;

  const completedQuests = quests.filter((q) => {
    const questTasks = tasks.filter((t) => t.quest_id === q.id);
    return questTasks.length > 0 && questTasks.every((t) => t.completed);
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        value={`${completedToday}/${totalToday}`}
        label="tasks today"
        accent
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
