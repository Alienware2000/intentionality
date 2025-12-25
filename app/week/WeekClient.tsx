"use client";

import { useMemo, useState } from "react";
import type { ISODateString, Id } from "../lib/types";
import { getTasksBetweenDates, toggleTaskCompleted } from "../lib/store";
import { groupTasksByWeek } from "../lib/selectors";
import { formatDayLabel } from "../lib/formatters";

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
    const tasksThisWeek = useMemo(() => {
        return getTasksBetweenDates(start, end);
    }, [start, end, tick]);

    // Group tasks by day using the selector utility
    const groupedTasks = useMemo(() => {
        return groupTasksByWeek(tasksThisWeek, start);
    }, [tasksThisWeek, start]);

    // Handler to toggle task completion
    function handleToggle(taskId: Id) {
        const ok = toggleTaskCompleted(taskId);
        if (ok) {
            setTick((t) => t + 1); // Trigger re-render
        }
    }

    return (
        <div className="space-y-3">
            {groupedTasks.map((day) => (
                <div
                    key={day.date}
                    className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">{formatDayLabel(day.date)}</h2>
                        <span className="text-xs text-white/50">{day.date}</span>
                    </div>

                    <div className="mt-4 space-y-3">
                        {day.tasks.length === 0 ? (
                            <p className="text-white/50 text-sm">No tasks for this day.</p>
                        ) : (
                            day.tasks.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleToggle(t.id)}
                                    className="w-full text-left rounded-xl border border-white/10 bg-black/20 p-4 hover:bg-white/10 transition"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div
                                                className={
                                                    "text-white/90 font-medium " +
                                                    (t.completed ? "line-through text-white/70" : "")
                                                }
                                            >
                                                {t.title}
                                            </div>
                                            <div className="text-xs text-white/50 mt-1">
                                                Due: {t.dueDate}
                                            </div>
                                        </div>

                                        <div
                                            className={
                                                "text-xs rounded-full px-3 py-1 border " +
                                                (t.completed
                                                    ? "border-white/20 text-white/70"
                                                    : "border-white/10 text-white/50")
                                            }
                                        >
                                            {t.completed ? "Done" : "Planned"}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}