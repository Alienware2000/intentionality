"use client";

import { useEffect, useMemo, useState } from "react";
import type { Id } from "../../lib/types";

type Quest = {
  id: Id;
  title: string;
  createdAt: string;
};

type Task = {
  id: Id;
  questId: Id;
  completed: boolean;
};

export default function QuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;

    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok || !data?.ok) {
      alert(data?.error ?? "Failed to create quest");
      return;
    }

    setNewTitle("");
    setQuests((q) => [...q, data.quest]);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [questsRes, tasksRes] = await Promise.all([
          fetch("/api/quests"),
          fetch("/api/tasks/range?start=2000-01-01&end=2100-01-01"),
        ]);

        const questsText = await questsRes.text();
        const tasksText = await tasksRes.text();

        const questsData = questsText ? JSON.parse(questsText) : null;
        const tasksData = tasksText ? JSON.parse(tasksText) : null;

        if (!questsRes.ok || !questsData?.ok) {
          throw new Error(questsData?.error ?? "Failed to load quests");
        }

        if (!tasksRes.ok || !tasksData?.ok) {
          throw new Error(tasksData?.error ?? "Failed to load tasks");
        }

        setQuests(questsData.quests);
        setTasks(tasksData.tasks);
      } catch (e: any) {
        setError(e.message ?? "Failed to load quests");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const tasksByQuest = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!map[task.questId]) map[task.questId] = [];
      map[task.questId].push(task);
    }
    return map;
  }, [tasks]);

  if (loading) return <p className="text-white/50">Loading quests...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Quests</h1>
        <p className="text-white/70 mt-2">
          High-level goals and missions will live here.
        </p>
      </header>

      <div className="mb-6 flex gap-2">
        <input
          placeholder="New quest title..."
          className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button
          onClick={handleCreate}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15"
        >
          Create
        </button>
      </div>

      <section className="space-y-4">
        {quests.map((quest) => {
          const questTasks = tasksByQuest[quest.id] ?? [];
          const completed = questTasks.filter((t) => t.completed).length;
          const total = questTasks.length;
          const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

          return (
            <div
              key={quest.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{quest.title}</h2>
                  <p className="text-white/60 mt-1">
                    Created: {quest.createdAt.slice(0, 10)}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm text-white/60">Progress</div>
                  <div className="text-lg font-semibold">
                    {completed}/{total}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-white/40"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-xs text-white/50 mt-2">
                  {total === 0 ? "No tasks yet." : `${percent}% complete`}
                </p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
