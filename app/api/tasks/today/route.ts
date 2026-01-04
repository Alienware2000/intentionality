import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET() {
  // Step 1: determine "today"
  const todayISO = new Date().toISOString().slice(0, 10);

  // Step 2: ask the database for tasks
  const tasks = await prisma.task.findMany({
    where: { dueDate: todayISO },
    orderBy: { createdAt: "asc" },
    include: { quest: true },
  });

  // Step 3: return JSON to the client
  return NextResponse.json({ ok: true, tasks });
}
