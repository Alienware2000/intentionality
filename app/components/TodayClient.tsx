"use client";

import { useMemo, useState, useEffect } from "react";
import type { ISODateString, Id } from "../lib/types";
import { 
    addTask, 
    getTasksBetweenDates, 
    toggleTaskCompleted, 
    getQuests,
    hydrateTasksFromStorage } from "../lib/store";

type Props = {
  date: ISODateString;
};

export default function TodayClient({ date }: Props) {
  const [title, setTitle] = useState("");
  const [tick, setTick] = useState(0);
  const [questId, setQuestId] = useState<Id>("q_general");
  
  useEffect(() => {
    hydrateTasksFromStorage();
    setTick((t) => t + 1);
  }, []);
  
  const tasksToday = useMemo(() => {
    return getTasksBetweenDates(date, date);
  }, [date, tick]);

  const total = tasksToday.length;
  const done = tasksToday.filter((t) => t.completed).length;

  function handleToggle(taskId: Id) {
    const ok = toggleTaskCompleted(taskId);
    if (ok) setTick((t) => t + 1);
  }

  const quests = useMemo(() => {
    return getQuests();
  }, []);

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    // For v0, we attach all quick-added tasks to one default quest.
    // We'll upgrade this to a quest dropdown next.
    addTask({
        title: trimmed,
        dueDate: date,
        questId,
    });

    setTitle("");
    setTick((t) => t + 1);
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
      {tasksToday.length === 0 ? (
        <p className="text-white/50 text-sm">
          No tasks for today. Add one small thing and build momentum.
        </p>
      ) : (
        tasksToday.map((t) => (
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
        ))
      )}
    </div>
  );
}
