import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json(
      { ok: false, error: "Missing date query param" },
      { status: 400 }
    );
  }

  const tasks = await prisma.task.findMany({
    where: { dueDate: date },
    orderBy: { createdAt: "asc" },
    include: { quest: true },
  });

  return NextResponse.json({ ok: true, tasks });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, dueDate, questId } = body as {
    title?: string;
    dueDate?: string;
    questId?: string;
  };

  if (!title || !dueDate || !questId) {
    return NextResponse.json(
      { ok: false, error: "Missing title, dueDate, or questId" },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: { title, dueDate, questId, completed: false },
    include: { quest: true },
  });

  return NextResponse.json({ ok: true, task });
}
