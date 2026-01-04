import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const start = url.searchParams.get("start"); // YYYY-MM-DD
    const end = url.searchParams.get("end"); // YYYY-MM-DD

    if (!start || !end) {
        return NextResponse.json(
            { ok: false, error: "Missing start or end query param" },
            { status: 400 }
        );
    }

    const tasks = await prisma.task.findMany({
        where: {
            dueDate: { gte:  start, lte: end },
        },
        orderBy: { dueDate: "asc" },
        include: { quest: true },
    });

    return NextResponse.json({ ok: true, tasks });
}