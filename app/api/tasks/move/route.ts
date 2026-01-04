import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function POST(req: Request) {
    const { taskId, dueDate } = (await req.json()) as { taskId?: string; dueDate?: string };
    
    if (!taskId || !dueDate) {
        return NextResponse.json(
            { ok: false, error: "Missing taskId or dueDate" },
            { status: 400 }
        );
    }

    const updated = await prisma.task.update({
        where: { id: taskId },
        data: { dueDate },
    });

    return NextResponse.json({ ok: true, task: updated });
}