// app/api/tasks/route.ts
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

  // 2) Parse query
  const url = new URL(req.url);
  const date = url.searchParams.get("date"); // YYYY-MM-DD

  if (!date) {
    return NextResponse.json(
      { ok: false, error: "Missing date query param" },
      { status: 400 }
    );
  }

  // 3) Fetch only this user's tasks for that date
  const tasks = await prisma.task.findMany({
    where: {
      dueDate: date,
      quest: { userId },
    },
    orderBy: { createdAt: "asc" },
    include: { quest: true },
  });

  return NextResponse.json({ ok: true, tasks });
}

export async function POST(req: Request) {
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

  try {
    // 2) Read body
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

    // 3) Ownership check: the quest must belong to this user
    const quest = await prisma.quest.findFirst({
      where: { id: questId, userId },
      select: { id: true },
    });

    if (!quest) {
      return NextResponse.json(
        { ok: false, error: "Invalid questId (not owned by user)" },
        { status: 403 }
      );
    }

    // 4) Create the task inside a quest the user owns
    const task = await prisma.task.create({
      data: { title: title.trim(), dueDate, questId, completed: false },
      include: { quest: true },
    });

    return NextResponse.json({ ok: true, task });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
