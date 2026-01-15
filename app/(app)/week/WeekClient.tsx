"use client";

import { useEffect, useMemo, useState } from "react";
import type { ISODateString, Id, Task, Priority } from "@/app/lib/types";
import { groupTasksByWeek, formatDayLabel } from "@/app/lib/date-utils";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";

type Props = {
  start: ISODateString;
  end: ISODateString;
};

type TasksResponse = { ok: true; tasks: Task[] };

const priorityColors: Record<Priority, string> = {
  high: "border-l-[var(--priority-high)]",
  medium: "border-l-[var(--priority-medium)]",
  low: "border-l-[var(--priority-low)]",
};

export default function WeekClient({ start, end }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchApi<TasksResponse>(
        `/api/tasks/range?start=${start}&end=${end}`
      );
      setTasks(data.tasks);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [start, end]);

  const groupedTasks = useMemo(() => {
    return groupTasksByWeek(tasks, start);
  }, [tasks, start]);

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

    await refresh();
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse bg-[var(--bg-card)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-[var(--accent-primary)]">Error: {error}</p>;
  }

  return (
    <div className="space-y-4">
      {groupedTasks.map((day) => {
        const completedCount = day.tasks.filter((t) => t.completed).length;
        const totalXp = day.tasks.reduce((sum, t) => sum + (t.xp_value ?? 10), 0);

        return (
          <div
            key={day.date}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]"
          >
            {/* Day Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                {formatDayLabel(day.date)}
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {completedCount}/{day.tasks.length} done
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  +{totalXp} XP
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="p-2">
              {day.tasks.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm py-4 text-center">
                  No tasks for this day.
                </p>
              ) : (
                <div className="space-y-1">
                  {day.tasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggle(t.id)}
                      className={cn(
                        "w-full text-left rounded-lg border-l-2 p-3 transition",
                        "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]",
                        priorityColors[t.priority ?? "medium"],
                        t.completed && "opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {/* Checkbox */}
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center",
                              t.completed
                                ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                                : "border-[var(--border-default)]"
                            )}
                          >
                            {t.completed && (
                              <svg
                                className="w-3 h-3 text-[var(--bg-base)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>

                          {/* Title */}
                          <span
                            className={cn(
                              "text-sm",
                              t.completed
                                ? "line-through text-[var(--text-muted)]"
                                : "text-[var(--text-primary)]"
                            )}
                          >
                            {t.title}
                          </span>
                        </div>

                        {/* XP Badge */}
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          +{t.xp_value ?? 10} XP
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
