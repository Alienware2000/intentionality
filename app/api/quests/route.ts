import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

export async function GET() {
    // 1) Identify the user (identity)
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        return NextResponse.json(
            { ok: false, error: "Not authenticated" },
            { status: 401 }
        );
    }

    const userId = data.user.id;

    // 2) Fetch only this user's quests (ownership)
    let quests = await prisma.quest.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });

    // 3) If none exist, create a default one
    if (quests.length === 0) {
        const general = await prisma.quest.create({
            data: {
                title: "General Tasks",
                userId,
            },
        });

        quests = [general]
    }

    return NextResponse.json({ ok: true, quests });
}