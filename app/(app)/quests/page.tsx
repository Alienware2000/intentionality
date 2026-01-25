import QuestsClient from "./QuestsClient";

export default async function QuestsPage() {
  // Authentication is handled by middleware (middleware.ts)
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Quests
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          High-level goals and missions to pursue.
        </p>
      </header>

      <QuestsClient />
    </div>
  );
}
