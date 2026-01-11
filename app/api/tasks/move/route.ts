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
  const { taskId, dueDate } = (await req.json()) as {
    taskId?: string;
    dueDate?: string;
  };

  if (!taskId || !dueDate) {
    return NextResponse.json(
      { ok: false, error: "Missing taskId or dueDate" },
      { status: 400 }
    );
  }

  // 3) Ownership check
  const existing = await prisma.task.findFirst({
    where: {
      id: taskId,
      quest: { userId },
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Task not found" },
      { status: 404 }
    );
  }

  // 4) Move
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { dueDate },
  });

  return NextResponse.json({ ok: true, task: updated });
}
