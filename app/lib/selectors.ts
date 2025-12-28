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

/**
 * Compare two ISO date strings.
 * Returns:
 * - negative if a < b
 * - positive if a > b
 * - zero if a == b
 */
function compareISO(a: ISODateString, b: ISODateString): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

/** Type representing a Task with an added status field.
 */
export type TaskWithStatus = Task & {
    status: "planned" | "overdue" | "done";
};

/** Split tasks into overdue and today's tasks based on the given date.
 * 
 * - Overdue: dueDate < today and not completed
 * - Today: dueDate == today and not completed
 * - Completed tasks are only included in today's list with status "done"
 * 
 * Both lists are sorted by dueDate ascending.
 */
export function splitTasksForToday(
    tasks: Task[],
    today: ISODateString
): {
    overdue: TaskWithStatus[];
    today: TaskWithStatus[];
} {
    const overdue: TaskWithStatus[] = [];
    const todayList: TaskWithStatus[] = [];
    
    for (const t of tasks) {
        if (t.completed) {
            if (compareISO(t.dueDate, today) === 0) {
                todayList.push({ ...t, status: "done" });
            }
            continue; // Skip completed tasks for overdue
        }

        const cmp = compareISO(t.dueDate, today);

        if (cmp < 0) overdue.push({ ...t, status: "overdue" });
        else if (cmp === 0) todayList.push({ ...t, status: "planned" });
    }

    overdue.sort((a, b) => compareISO(a.dueDate, b.dueDate));

    return { overdue, today: todayList };

}
