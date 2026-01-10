import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const date = url.searchParams.get("date"); // YYYY-MM-DD

    if (!date) {
        return NextResponse.json(
            { ok: false, error: "Missing date query param" },
            { status: 400 }
        );
    }

    // Return:
    // - all tasks due today (completed or not)
    // - all tasks overdue AND not completed
    const tasks = await prisma.task.findMany({
        where: {
            OR: [
                { dueDate: date },
                { dueDate: { lt: date }, completed: false },
            ],
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        include: { quest: true },
    });

    return NextResponse.json({ ok: true, tasks });
}