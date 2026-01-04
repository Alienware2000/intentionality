import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function POST(req: Request) {
    const { taskId } = (await req.json()) as { taskId?: string };

    if (!taskId) {
        return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
    }

    const existing = await prisma.task.findUnique({ where: { id: taskId }});
    if (!existing) {
        return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    await prisma.task.update({
        where: { id: taskId },
        data: { completed: !existing.completed },
    });

    return NextResponse.json({ ok: true});
}