import { requireUser } from "@/app/lib/auth/requireUser";
import { getWeekRange } from "@/app/lib/date-utils";
import WeekClient from "./WeekClient";

export default async function WeekPage() {
  await requireUser();

  const { start, end } = getWeekRange(new Date());

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">This Week</h1>
        <p className="text-white/70 mt-2">
          Monday to Sunday plan. ({start} to {end})
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <WeekClient start={start} end={end} />
      </section>
    </div>
  );
}
