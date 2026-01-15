"use client";

// =============================================================================
// TODAY CLIENT COMPONENT
// Task management for today's tasks with priority and XP display.
// =============================================================================

import { useMemo, useState, useEffect, useCallback } from "react";
import { Plus, AlertCircle, ArrowRight } from "lucide-react";
import type { ISODateString, Id, Task, Quest, Priority } from "@/app/lib/types";
import { splitTasksForToday } from "@/app/lib/date-utils";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import TaskCard from "./TaskCard";

type Props = {
  date: ISODateString;
};

type TasksResponse = { ok: true; tasks: Task[] };
type QuestsResponse = { ok: true; quests: Quest[] };

export default function TodayClient({ date }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questId, setQuestId] = useState<Id>("");

  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    setLoadingTasks(true);
    setError(null);

    try {
      const data = await fetchApi<TasksResponse>(
        `/api/tasks/for-today?date=${date}`
      );
      setTasks(data.tasks);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingTasks(false);
    }
  }, [date]);

  const refreshQuests = useCallback(async () => {
    setLoadingQuests(true);
    setError(null);

    try {
      const data = await fetchApi<QuestsResponse>("/api/quests");
      setQuests(data.quests);

      // Set default quest if current selection is invalid
      if (!data.quests.some((q) => q.id === questId)) {
        setQuestId(data.quests[0]?.id ?? "");
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoadingQuests(false);
    }
  }, [questId]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    refreshQuests();
  }, [refreshQuests]);

  const { overdue, today } = useMemo(() => {
    return splitTasksForToday(tasks, date);
  }, [tasks, date]);

  async function handleToggle(taskId: Id) {
    const res = await fetch("/api/tasks/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });

    if (!res.ok) {
      console.warn("Failed to toggle", await res.text());
      return;
    }

    await refreshTasks();
  }

  async function handleMoveToday(taskId: Id) {
    const res = await fetch("/api/tasks/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, dueDate: date }),
    });

    if (!res.ok) {
      console.warn("Request failed", await res.text());
      return;
    }

    await refreshTasks();
  }

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || !questId) return;

    setError(null);

    try {
      await fetchApi("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          due_date: date,
          quest_id: questId,
          priority,
        }),
      });

      setTitle("");
      await refreshTasks();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  if (loadingTasks && loadingQuests) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Task Form */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={questId}
          onChange={(e) => setQuestId(e.target.value as Id)}
          className={cn(
            "rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-3 py-2.5 text-sm text-[var(--text-primary)]",
            "outline-none focus:border-[var(--accent-primary)]"
          )}
        >
          {quests.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className={cn(
            "rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-3 py-2.5 text-sm text-[var(--text-primary)]",
            "outline-none focus:border-[var(--accent-primary)]"
          )}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add a task..."
          className={cn(
            "flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-4 py-2.5 text-sm text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]",
            "outline-none focus:border-[var(--accent-primary)]"
          )}
        />

        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "flex items-center justify-center gap-2",
            "rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
            "px-4 py-2.5 text-sm text-[var(--accent-primary)]",
            "hover:bg-[var(--accent-primary)]/20 transition-colors"
          )}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {error && (
        <p className="text-sm text-[var(--accent-primary)]">Error: {error}</p>
      )}

      {/* Overdue Tasks */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[var(--accent-primary)]">
            <AlertCircle size={16} />
            <span className="text-xs font-bold tracking-widest uppercase">
              Overdue
            </span>
          </div>

          {overdue.map((t) => (
            <div
              key={t.id}
              className={cn(
                "p-4 rounded-lg",
                "border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {t.title}
                  </div>
                  <div className="text-xs font-mono text-[var(--text-muted)] mt-1">
                    Due: {t.due_date}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(t.id)}
                  className={cn(
                    "rounded-lg border border-[var(--border-default)]",
                    "px-3 py-1.5 text-xs text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  Mark done
                </button>

                <button
                  type="button"
                  onClick={() => handleMoveToday(t.id)}
                  className={cn(
                    "flex items-center gap-1",
                    "rounded-lg border border-[var(--border-default)]",
                    "px-3 py-1.5 text-xs text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  <span>Move to today</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's Tasks */}
      <div className="space-y-2">
        {today.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">
            No tasks for today. Add one to build momentum.
          </p>
        ) : (
          today.map((t) => (
            <TaskCard key={t.id} task={t} onToggle={handleToggle} />
          ))
        )}
      </div>
    </div>
  );
}
