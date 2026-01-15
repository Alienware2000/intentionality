"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Id, Quest, Task } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";

type QuestsResponse = { ok: true; quests: Quest[] };
type TasksResponse = { ok: true; tasks: Task[] };

export default function QuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;

    try {
      const data = await fetchApi<{ ok: true; quest: Quest }>("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      setNewTitle("");
      setQuests((q) => [...q, data.quest]);
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [questsData, tasksData] = await Promise.all([
          fetchApi<QuestsResponse>("/api/quests"),
          fetchApi<TasksResponse>("/api/tasks/range?start=2000-01-01&end=2100-01-01"),
        ]);

        setQuests(questsData.quests);
        setTasks(tasksData.tasks);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const tasksByQuest = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!map[task.quest_id]) map[task.quest_id] = [];
      map[task.quest_id].push(task);
    }
    return map;
  }, [tasks]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[var(--accent-primary)]">Error: {error}</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Quest Form */}
      <div className="flex gap-2">
        <input
          placeholder="New quest title..."
          className={cn(
            "flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-4 py-2.5 text-sm text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]",
            "outline-none focus:border-[var(--accent-primary)]"
          )}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <button
          onClick={handleCreate}
          className={cn(
            "flex items-center gap-2",
            "rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
            "px-4 py-2.5 text-sm text-[var(--accent-primary)]",
            "hover:bg-[var(--accent-primary)]/20 transition"
          )}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Create</span>
        </button>
      </div>

      {/* Quests List */}
      <section className="space-y-4">
        {quests.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">
            No quests yet. Create one to get started.
          </p>
        ) : (
          quests.map((quest) => {
            const questTasks = tasksByQuest[quest.id] ?? [];
            const completed = questTasks.filter((t) => t.completed).length;
            const total = questTasks.length;
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            const totalXp = questTasks.reduce((sum, t) => sum + (t.xp_value ?? 10), 0);
            const earnedXp = questTasks
              .filter((t) => t.completed)
              .reduce((sum, t) => sum + (t.xp_value ?? 10), 0);

            return (
              <div
                key={quest.id}
                className={cn(
                  "rounded-lg border-l-2 bg-[var(--bg-card)]",
                  percent === 100
                    ? "border-l-[var(--accent-success)]"
                    : "border-l-[var(--accent-primary)]"
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-medium text-[var(--text-primary)]">
                        {quest.title}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                        Created: {quest.created_at.slice(0, 10)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                        {completed}/{total}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        +{earnedXp}/{totalXp} XP
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-1 w-full rounded-full bg-[var(--bg-elevated)]">
                      <div
                        className={cn(
                          "h-1 rounded-full transition-all",
                          percent === 100
                            ? "bg-[var(--accent-success)]"
                            : "bg-[var(--accent-primary)]"
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {total === 0 ? "No tasks yet." : `${percent}% complete`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
