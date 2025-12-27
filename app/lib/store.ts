import type { Quest, Task, Id, ISODateString } from "./types";

/**
 * In-memory store (for demonstration purposes). (Level 1 data layer).
 * 
 * Why it exists:
 * - It lets us build and test UI + data flow without a database yet.
 * - It forces us to define a clean interface (functions) for interacting with data.
 * - Later, we can swap the internals to a real database with minimal changes to the UI.
 */

/**
 * A tiny helper to generate simple IDs.
 * 
 * Important note:
 * - This is not secure or suitable for production use.
 * - We'll switch to real UUIDs once we're ready to use a real database.
 * - For now, we just need something that works for demonstration purposes.
 */
function makeId(prefix: string): Id {
    return `${prefix}-${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * For v0 we store dates as "YYYY-MM-DD" strings.
 * This helper returns today's date in that format in local time.
 */
function todayISODate(): ISODateString {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Seed data: realistic starting quests + tasks.
 * You can change these any time.
 */
const quests: Quest[] = [
    { id: "q_general", title: "General Tasks", createdAt: todayISODate()},
    {id: "q_leetcode", title: "Leetcode consistency", createdAt: todayISODate()},
    {id: "q_intentionality", title: "Ship Intentionality v0", createdAt: todayISODate()},
    {id: "q_portfolio", title: "Polish portfolio + LinkedIn", createdAt: todayISODate()},
]

const tasks: Task[] = [
    {
        id: "t_arrays",
        questId: "q_leetcode",
        title: "Solve 2 array problems",
        dueDate: todayISODate(),
        completed: false,
        createdAt: todayISODate(),
    },
    {
        id: "t_ui_cleanup",
        questId: "q_intentionality",
        title: "Refactor layout + pages (done today)",
        dueDate: todayISODate(),
        completed: true,
        createdAt: todayISODate(),
    },
    {
        id: "t_portfolio_about",
        questId: "q_portfolio",
        title: "Update About section",
        dueDate: todayISODate(),
        completed: false,
        createdAt: todayISODate(),
    },
];

/**
 * Read functions (safe interface to access data).
 * 
 * Engineering principle:
 * - We expose only the data we want to expose.
 * - Do not expose internal data structures directly.
 * - Always return copies of data to prevent other parts of the app from mutating the store accidentally.
 */
export function getQuests(): Quest[] {
    return [...quests];
}

export function getTasks(): Task[] {
    return [...tasks];
}

/**
 * Returns tasks whose dueDate is between startDate and endDate (inclusive).
 * 
 * Why this works with strings:
 * - Because "YYYY-MM-DD" strings sort lexicographically in the same order as dates.
 * - This is a common trick for working with dates in JavaScript.
 * Example: "2023-01-01" < "2023-01-02" is true as a string comparison.
 * 
 * If we used "MM/DD/YYYY" format, this would not work.
 */
export function getTasksBetweenDates(
    startDate: ISODateString, 
    endDate: ISODateString
): Task[] {
    return tasks.filter(t => t.dueDate >= startDate && t.dueDate <= endDate);
}

/**
 * Utility: get the Monday-Sunday week range for a given date.
 * 
 * Returns an object like:
 * {     start: "2023-10-02", 
 *     end: "2023-10-08"
 * }
 */
export function getWeekRange(date: Date): {start: ISODateString, end: ISODateString} {
    // Clone the date so we don't mutate the original
    const d = new Date(date);

    // Get the day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const day = d.getDay();

    // We want Monday as the start of the week, so adjust the date accordingly
    const diffToMonday = day === 0 ? -6 : 1 - day; // Monday is -6 days from Sunday, 1 day from Monday

    d.setDate(d.getDate() + diffToMonday);

    const start = toISODateString(d); // YYYY-MM-DD

    // Get the end of the week (Sunday)
    // End = start + 6 days
    const endDate = new Date(d);
    endDate.setDate(endDate.getDate() + 6);
    const end = toISODateString(endDate);

    return { start, end };
}


/**
 * Utility: Convert a Date to an ISO date string.
 * This keeps everything consistent with our dueDate format.
 */
function toISODateString(d: Date): ISODateString {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Write functions (safe interface to modify data).

/// Toggles the completed status of a task by its ID.
export function toggleTaskCompleted(taskId: Id): boolean {
    // Find the task
    const task = tasks.find((t) => t.id === taskId);

    // If task not found, return false
    if (!task) {
        console.warn(` [store] toggleTaskCompleted: Task with id ${taskId} not found.`);
        return false;
    }

    // Toggle the completed status
    task.completed = !task.completed;

    // In a real app, we'd persist this to a database.
    // For now, we'll just return true to indicate success.
    return true;
}

// Adds a new task to the store.
export function addTask(input: {
    title: string;
    dueDate: ISODateString;
    questId: Id;
}): Task {
    const newTask: Task = {
        id: makeId("t"),
        questId: input.questId,
        title: input.title,
        dueDate: input.dueDate,
        completed: false,
        createdAt: todayISODate(),
    };

    tasks.push(newTask);
    return newTask;
}