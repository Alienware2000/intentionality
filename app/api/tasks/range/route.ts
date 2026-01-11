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

    // 2) Read date range
    const url = new URL(req.url);
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");

    if (!start || !end) {
        return NextResponse.json(
            { ok: false, error: "Missing start or end query param" },
            { status: 400 }
        );
    }

    // 3) Fetch only this user's tasks
    const tasks = await prisma.task.findMany({
        where: {
            dueDate: { gte: start, lte: end },
            quest: {
                userId: userId, // <-- THIS is the security boundary
            },
        },
        orderBy: { dueDate: "asc" },
        include: { quest: true },
    });

    return NextResponse.json({ ok: true, tasks });
}