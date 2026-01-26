// =============================================================================
// FRIENDS PAGE
// Social friends management page for viewing friends and handling requests.
// =============================================================================

import FriendsClient from "./FriendsClient";

export default async function FriendsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Friends
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Connect with friends and track each other&apos;s progress.
        </p>
      </header>

      <FriendsClient />
    </div>
  );
}
