import type { ISODateString, Task } from "./types";

// Type representing a group of tasks for a specific day
export type DayGroup = {
    date: ISODateString;
    tasks: Task[];
};

// Utility: Add days to an ISO date string
function addDaysISO(dateISO: ISODateString, daysToAdd: number): ISODateString {
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + daysToAdd);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Group tasks into 7 buckets (Mon-Sun) starting at `start`.
 * 
 * Important properties:
 * - Always returns exactly 7 days.
 * - Does not mutate the input tasks.
 * - Assumes `start` is a Monday. (your getWeekRange function should ensure this)
 */
export function groupTasksByWeek(tasks: Task[], start: ISODateString): DayGroup[] {
    const grouped: DayGroup[] = [];

    for (let i = 0; i < 7; i++) {
        const date = addDaysISO(start, i);
        const tasksForDay = tasks.filter((t) => t.dueDate === date);
        grouped.push({ date, tasks: tasksForDay }); 
    }

    return grouped;
}
