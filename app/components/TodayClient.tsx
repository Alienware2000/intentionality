"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { ISODateString, Id } from "../lib/types";                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        } from "../lib/store";
import { splitTasksForToday } from "../lib/selectors";

type Task = any; // later we'll type these
type Quest = any;

type Props = {
  date: ISODateString;
};

export default function TodayClient({ date }: Props) {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [questId, setQuestId] = useState<Id>("q_general");

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    setLoadingTasks(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks?date=${date}`);
      const text = await res.text(); // read raw first

      // If server returned HTML or empty, this prevents JSON crash.
      const data = text ? JSON.parse(text) : null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `Failed to load tasks (${res.status})`);
      }

      setTasks(data.tasks);
    } catch (e: any) {
      setError(e.message ?? "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, [date]);

  const refreshQuests = useCallback(async () => {
    setLoadingQuests(true);
    setError(null);

    try {
      const res = await fetch("/api/quests");
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? `Failed to load quests (${res.status})`);
      }

      setQuests(data.quests);

      // Ensure questId is valid
      if (!data.quests.some((q: any) => q.id === questId)) {
        setQuestId(data.quests[0]?.id ?? "q_general");
      }
    } catch (e: any) {
      setError(e.message ?? "Failed to load quests");
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

  const todayISO = date;

  const { overdue, today } = useMemo(() => {
      return splitTasksForToday(tasks, todayISO);
  }, [tasks, todayISO]);

  const total = today.length;
  const done = today.filter((t) => t.completed).length;

  async function handleToggle(taskId: Id) {
    const res = await fetch("/api/tasks/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });

    if (res.ok) {
      const r = await fetch(`/api/tasks?date=${date}`);
      const d = await r.json();
      if (d.ok) setTasks(d.tasks);
    } else {
      const data = await res.json().catch(() => null);
      console.warn("Failed to toggle task", data);
    }
  }

  async function handleMoveToday(taskId: Id) {
    const res = await fetch("/api/tasks/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, dueDate: date }),
    });

    if (res.ok) {
      const r = await fetch(`/api/tasks?date=${date}`);
      const d = await r.json();
      if (d.ok) setTasks(d.tasks);
    } else {
      console.warn("Request failed", await res.text());
      return
    }
  }

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setError(null);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({
        title: trimmed,
        dueDate: date,
        questId,
      }),
    });

    // same safety trick
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Failed to add task");
      return;
    }

    setTitle("");
    await refreshTasks();
  }

  return (
    <div className="space-y-3">
     <div className="flex gap-2">
        <select
            value={questId}
            onChange={(e) => setQuestId(e.target.value as Id)}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-white outline-none focus:border-white/25"
        >
            {quests.map((q) => (
                <option key={q.id} value={q.id}>
                    {q.title}
                </option>
            ))}
        </select>

        <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
            }}
            placeholder="Add one small task for today..."
            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/25"
        />

        <div className="flex items-center justify-between text-sm text-white/60">
            <span>Progress: {done} / {total} done</span>
        </div>

        <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15 transition"
        >
            Add
        </button>
        </div>
        <section className="space-y-3">
          {overdue.length > 0 && (
            <>
              <h3 className="text-red-400 font-semibold">Overdue</h3>

              {overdue.map((t) => (
              <div
                key={t.id}
                className="w-full rounded-xl border border-red-400/20 bg-red-500/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="font-medium text-white/90">{t.title}</div>
                        <div className="text-xs text-white/50 mt-1">Due: {t.dueDate}</div>
                    </div>

                    <div className="text-xs rounded-full px-3 py-1 border border-red-400/30 text-red-300">
                        Overdue
                    </div>
                </div>

                {/* Action row */}
                <div className="mt-3 flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleToggle(t.id)}
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 transition"
                    >
                        Mark done
                    </button>

                    <button
                        type="button"
                        onClick={() => handleMoveToday(t.id)}
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 transition"
                    >
                        Move to today
                    </button>
                </div>
            </div>
          ))}
        </>
          )}
        {today.length === 0 ? (
            <p className="text-white/50 text-sm">
            No tasks for today. Add one small thing and build momentum.
            </p>
        ) : (
        today.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleToggle(t.id)}
            className={[
              "w-full text-left rounded-xl border p-4 transition",
              "cursor-pointer",
              t.completed
                ? "border-white/10 bg-white/5 opacity-70"
                : "border-white/15 bg-black/20 hover:bg-white/10",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className={[
                    "font-medium",
                    t.completed ? "line-through text-white/50" : "text-white/90",
                  ].join(" ")}
                >
                  {t.title}
                </div>
                <div className="text-xs text-white/50 mt-1">Due: {t.dueDate}</div>
              </div>

              <div
                className={[
                  "text-xs rounded-full px-3 py-1 border",
                  t.completed
                    ? "border-green-400/30 text-green-300"
                    : "border-white/20 text-white/60",
                ].join(" ")}
              >
                {t.completed ? "Done" : "Planned"}
              </div>
            </div>
          </button>
        )))}
    </section>
      </div>
  )}
