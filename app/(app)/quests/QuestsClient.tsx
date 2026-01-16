"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import type { Id, Quest, Task } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import { useProfile } from "@/app/components/ProfileProvider";
import ConfirmModal from "@/app/components/ConfirmModal";

type QuestsResponse = { ok: true; quests: Quest[] };
type TasksResponse = { ok: true; tasks: Task[] };

export default function QuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Edit/Delete state
  const [editingQuestId, setEditingQuestId] = useState<Id | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingQuestId, setDeletingQuestId] = useState<Id | null>(null);

  const { refreshProfile } = useProfile();

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

  function startEditing(quest: Quest) {
    setEditingQuestId(quest.id);
    setEditTitle(quest.title);
  }

  function cancelEditing() {
    setEditingQuestId(null);
    setEditTitle("");
  }

  async function handleEditQuest(questId: Id) {
    const title = editTitle.trim();
    if (!title) return;

    try {
      await fetchApi("/api/quests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, title }),
      });

      setQuests((qs) =>
        qs.map((q) => (q.id === questId ? { ...q, title } : q))
      );
      cancelEditing();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  async function handleDeleteQuest(questId: Id) {
    try {
      await fetchApi("/api/quests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });

      setQuests((qs) => qs.filter((q) => q.id !== questId));
      setTasks((ts) => ts.filter((t) => t.quest_id !== questId));
      setDeletingQuestId(null);
      refreshProfile();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  const loadData = useCallback(async () => {
    try {
      // Fetch all tasks - we need them all to show quest progress accurately
      // Using a wide date range to get all tasks
      const [questsData, tasksData] = await Promise.all([
        fetchApi<QuestsResponse>("/api/quests"),
        fetchApi<TasksResponse>("/api/tasks/range?start=2020-01-01&end=2030-01-01"),
      ]);

      setQuests(questsData.quests);
      setTasks(tasksData.tasks);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
                    <div className="flex-1 min-w-0">
                      {editingQuestId === quest.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditQuest(quest.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            className={cn(
                              "flex-1 px-2 py-1 rounded",
                              "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                              "text-[var(--text-primary)]",
                              "focus:outline-none focus:border-[var(--accent-primary)]"
                            )}
                          />
                          <button
                            onClick={() => handleEditQuest(quest.id)}
                            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                            title="Save"
                          >
                            <Check size={14} className="text-[var(--accent-success)]" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                            title="Cancel"
                          >
                            <X size={14} className="text-[var(--text-muted)]" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h2 className="font-medium text-[var(--text-primary)] truncate">
                            {quest.title}
                          </h2>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(quest)}
                              className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                              title="Edit quest"
                            >
                              <Pencil size={12} className="text-[var(--text-muted)]" />
                            </button>
                            {quests.length > 1 && (
                              <button
                                onClick={() => setDeletingQuestId(quest.id)}
                                className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
                                title="Delete quest"
                              >
                                <Trash2 size={12} className="text-[var(--text-muted)]" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                        Created: {quest.created_at.slice(0, 10)}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingQuestId !== null}
        title="Delete Quest"
        message="This will permanently delete the quest and all its tasks. This action cannot be undone."
        onConfirm={() => deletingQuestId && handleDeleteQuest(deletingQuestId)}
        onCancel={() => setDeletingQuestId(null)}
      />
    </div>
  );
}
