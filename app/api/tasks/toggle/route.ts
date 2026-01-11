import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function POST(req: Request) {
    // 1) Identify user
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        return NextResponse.json(
            { ok: false, error: "Not authenticated" },
            { status: 401 }
        );
    }

    const userId = data.user.id;

    // 2) Read input
    const { taskId } = (await req.json()) as { taskId?: string };

    if (!taskId) {
        return NextResponse.json(
            { ok: false, error: "Missing taskId" },
            { status: 400 }
        );
    }

    // 3) Ownership check: task must belong to a quest owned by this user
    const existing = await prisma.task.findFirst({
        where: {
            id: taskId,
            quest: { userId },
        },
        select: { id: true, completed: true },
    });

    if (!existing) {
        // Important: don't reveal whether it exists but belongs to someone else
            return NextResponse.json(
                { ok: false, error: "Task not found"},
                { status: 404 }
            );
    }

    // 4) Toggle
    await prisma.task.update({
        where: { id: taskId },
        data: { completed: !existing.completed },
    });

    return NextResponse.json({ ok: true });
}