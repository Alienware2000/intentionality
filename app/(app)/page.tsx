import Link from "next/link"
import TodayClient from "../components/TodayClient"
import type { ISODateString } from "../lib/types"
import { requireUser } from "@/app/lib/auth/requireUser";

// Utility to get today's date in ISO format
function getTodayISO(): ISODateString {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function Home() {
  await requireUser();

  const today = getTodayISO();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">Intentionality</h1>
        <p className="text-white/70 mt-2">Command Center (v0)</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/week" className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition">
          <h2 className="text-lg font-medium">This Week</h2>
          <p className="text-white/60 mt-2">
          Your weekly plan will live here.
          </p>
        </Link>

        <Link href="/quests" className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition">
          <h2 className="text-lg font-medium">Quests</h2>
          <p className="text-white/60 mt-2">
            High-level goals and missions will live here.
          </p>
        </Link>

        <Link href="/auth" className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition">
          <h2 className="text-lg font-medium">Auth</h2>
          <p className="text-white/60 mt-2">
            Sign up, log in, log out.
          </p>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-medium">XP & Status</h2>
          <p className="text-white/60 mt-2">
            Progress, XP, and streaks will live here.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">Today</h2>
          <span className="text-sm text-white/60">{today} </span>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <TodayClient date={today} />
        </div>
      </section>
    </div>
  )
}