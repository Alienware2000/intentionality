"use client";

import { useMemo, useState } from "react";
import type { ISODateString, Id } from "../lib/types";
import { getTasksBetweenDates, toggleTaskCompleted } from "../lib/store";

type Props = {
  date: ISODateString;
};

export default function TodayClient({ date }: Props) {
  const [tick, setTick] = useState(0);

  const tasksToday = useMemo(() => {
    return getTasksBetweenDates(date, date);
  }, [date, tick]);

  function handleToggle(taskId: Id) {
    const ok = toggleTaskCompleted(taskId);
    if (ok) setTick((t) => t + 1);
  }

  return (
    <div className="space-y-3">
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
