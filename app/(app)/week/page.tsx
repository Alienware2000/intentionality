import { requireUser } from "@/app/lib/auth/requireUser";
import { getQuests, getTasksBetweenDates, getWeekRange } from "../../lib/store";
import WeekClient from "./WeekClient"

// Grouped tasks by day
type DayGroup = {
    date: string; // Date in YYYY-MM-DD format
    tasks: {
        id: string;
        title: string
        completed: boolean;
        questTitle: string;
        dueDate: string;
    }[];
};

// Utility: Add days to an ISO date string
function addDaysISO(dateISO: string, daysToAdd: number): string {
    // Convert the date string to a Date object
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);

    // Add the specified number of days
    dt.setDate(dt.getDate() + daysToAdd);

    // Return the new date in YYYY-MM-DD format
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Utility: Format day label for display
function formatDayLabel(dateISO: string): string {
    // Example output: "Mon 12/23"
    const [y, m, d] = dateISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const weekday = dt.toLocaleDateString("en-US", { weekday: "short" });
    const month = String(m).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    return `${weekday} ${month}/${day}`;
}

export default async function WeekPage() {
    await requireUser();

    const quests = getQuests();
    const questTitleById = new Map(quests.map((q) => [q.id, q.title]));

    const { start, end } = getWeekRange(new Date());
    const tasksThisWeek = getTasksBetweenDates(start, end);

    // Group tasks by dueDate so the UI reads like a weekly planner.
    const grouped: DayGroup[] = [];
    for (let i = 0; i < 7; i++) {
        const date = addDaysISO(start, i);
        const tasksForDay = tasksThisWeek.filter((t) => t.dueDate === date).map((t) => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            questTitle: questTitleById.get(t.questId) ?? "Unknown Quest",
            dueDate: t.dueDate,
        }));

        grouped.push({ date, tasks: tasksForDay });
    }
    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-semibold">This Week</h1>
                <p className="text-white/70 mt-2">
                    Monday to Sunday plan. ({start} to {end})
                </p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <WeekClient start={start} end={end} />
            </section>
        </div>
    );
}