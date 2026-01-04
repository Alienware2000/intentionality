import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET() {
    const quests = await prisma.quest.findMany({
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, quests });
}