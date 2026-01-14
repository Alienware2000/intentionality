import type { ISODateString, Task, TaskWithStatus, DayGroup } from "./types";

/**
 * Get today's date in ISO format (YYYY-MM-DD).
 */
export function getTodayISO(): ISODateString {
  const d = new Date();
  return toISODateString(d);
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD).
 */
export function toISODateString(d: Date): ISODateString {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Add days to an ISO date string.
 */
export function addDaysISO(dateISO: ISODateString, daysToAdd: number): ISODateString {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);
  return toISODateString(dt);
}

/**
 * Format an ISO date (YYYY-MM-DD) into a human-friendly label.
 * Example: "2025-12-23" → "Monday, Dec 23"
 */
export function formatDayLabel(dateISO: ISODateString): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get the Monday-Sunday week range for a given date.
 */
export function getWeekRange(date: Date): { start: ISODateString; end: ISODateString } {
  const d = new Date(date);
  const day = d.getDay();
  // Monday is day 1, Sunday is day 0. Adjust to get Monday as start.
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);

  const start = toISODateString(d);
  const endDate = new Date(d);
  endDate.setDate(endDate.getDate() + 6);
  const end = toISODateString(endDate);

  return { start, end };
}

/**
 * Compare two ISO date strings.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export function compareISO(a: ISODateString, b: ISODateString): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Group tasks into 7 buckets (Mon-Sun) starting at `start`.
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
 * Split tasks into overdue and today's tasks based on the given date.
 */
export function splitTasksForToday(
  tasks: Task[],
  today: ISODateString
): { overdue: TaskWithStatus[]; today: TaskWithStatus[] } {
  const overdue: TaskWithStatus[] = [];
  const todayList: TaskWithStatus[] = [];

  for (const t of tasks) {
    if (t.completed) {
      if (compareISO(t.dueDate, today) === 0) {
        todayList.push({ ...t, status: "done" });
      }
      continue;
    }

    const cmp = compareISO(t.dueDate, today);
    if (cmp < 0) {
      overdue.push({ ...t, status: "overdue" });
    } else if (cmp === 0) {
      todayList.push({ ...t, status: "planned" });
    }
  }

  overdue.sort((a, b) => compareISO(a.dueDate, b.dueDate));
  return { overdue, today: todayList };
}
