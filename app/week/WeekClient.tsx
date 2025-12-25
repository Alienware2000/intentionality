"use client";

import { useMemo, useState } from "react";
import type { ISODateString, Id } from "../lib/types";
import { getTasksBetweenDates, toggleTaskCompleted } from "../lib/store";

type Props = {
    start: ISODateString;
    end: ISODateString;
};

export default function WeekClient({ start, end }: Props) {
    // Local state to trigger re-renders on task updates
    // Tick is a tiny piece of React state we use to force re-renders after mutating data
    const [tick, setTick] = useState(0);

    // Memoized tasks for the week
    // Recomputes only when start, end, or tick changes (i.e., when tasks are toggled)
    const tasks = useMemo(() => {
        return getTasksBetweenDates(start, end);
    }, [start, end, tick]);

    // Handler to toggle task completion
    function handleToggle(taskId: Id) {
        const ok = toggleTaskCompleted(taskId);
        if (ok) {
            setTick((t) => t + 1); // Trigger re-render
        }
    }

    return (
        <div className="space-y-3">
            {tasks.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggle(t.id)}
                    className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className={t.completed ? "line-through opacity-70" : ""}>
                                    {t.title}
                                </div>
                                <div className="text-sm opacity-70">{t.dueDate}</div>
                            </div>

                            <span className="text-sm rounded-full border border-white/15 px-3 py-1 opacity-80">
                                {t.completed ? "Done" : "Planned"}
                            </span>
                        </div>
                    </button>
            ))}
        </div>
    );
}