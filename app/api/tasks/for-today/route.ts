import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function GET(req: Request) {
    // 1) Identify the user
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        return NextResponse.json(
            { ok: false, error: "Not authenticated" },
            { status: 401 }
        );
    }

    const userId = data.user.id;

    // 2) Read date
    const url = new URL(req.url);
    const date = url.searchParams.get("date"); // YYYY-MM-DD

    if (!date) {
        return NextResponse.json(
            { ok: false, error: "Missing date query param" },
            { status: 400 }
        );
    }

    // 3) Return only this user's tasks:
    // - tasks due today (completed or not)
    // - tasks overdue AND not completed
    const tasks = await prisma.task.findMany({
        where: {
            quest: { userId }, // <-- security boundary
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