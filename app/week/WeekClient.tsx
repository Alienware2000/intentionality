"use client";

import { useEffect, useMemo, useState } from "react";
import type { ISODateString, Id } from "../lib/types";
import { groupTasksByWeek } from "../lib/selectors";
import { formatDayLabel } from "../lib/formatters";

type Task = any; 

type Props = {
    start: ISODateString;
    end: ISODateString;
};

export default function WeekClient({ start, end }: Props) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function refresh() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/tasks/range?start=${start}&end=${end}`);
            const text = await res.text();
            const data = text ? JSON.parse(text) : null;

            if (!res.ok || !data?.ok) {
                throw new Error(data?.error ?? `Failed to load tasks (${res.status})`);
            }

            setTasks(data.tasks);
        } catch (e: any) {
            setError(e.message ?? "Failed to load tasks");
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

    if (loading) return <p className="text-white/50">Loading week...</p>;
    if (error) return <p className="text-red-400">Error: {error}</p>;
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
                        ): (
                                day.tasks.map((t) => (
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
                                                <div className="text-xs text-white/50 mt-1">
                                                    Due: {t.dueDate}
                                                </div>
                                            </div>

                                            <div
                                                className={[
                                                    "text-xs rounded-full px-3 py-1 border",
                                                    t.completed
                                                        ? "border-green-400/30 text-green-300"
                                                        : "border-white/20 text-white/60",
                                                ].join(" ")}
                                            >
                                                {t.completed ? "Done": "Planned"}
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
