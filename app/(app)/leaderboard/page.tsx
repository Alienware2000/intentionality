// =============================================================================
// LEADERBOARD PAGE
// Social leaderboard showing rankings across Global, Friends, and Groups.
// =============================================================================

import LeaderboardClient from "./LeaderboardClient";

export default async function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Leaderboard
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          See how you rank against friends and the community.
        </p>
      </header>

      <LeaderboardClient />
    </div>
  );
}
