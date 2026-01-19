import PlanClient from "./PlanClient";

export default async function PlanPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Weekly Planning
        </h1>
        <div className="mt-2 h-[2px] w-20 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Review last week and set goals for the upcoming week. Earn 25 XP for completing.
        </p>
      </header>

      <PlanClient />
    </div>
  );
}
