import { NextResponse } from "next/server";
import { toggleTaskCompleted } from "@/app/lib/store";
import type { Id } from "@/app/lib/types";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const taskId = body.taskId as Id;

        if (!taskId) {
            return NextResponse.json(
                { ok: false, error: "Missing taskId" },
                { status: 400 }
            );
        }

        const success = toggleTaskCompleted(taskId);

    if (!success) {
        return NextResponse.json(
            { ok: false, error: "Task not found "},
            { status: 404 }
        );
    }

    return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Toggle task failed:", err);
        return NextResponse.json(
            { ok: false, error: "Server error" },
            { status: 500 }
        );
    }
}