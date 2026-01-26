// =============================================================================
// GROUPS PAGE
// Accountability groups management page for viewing and creating groups.
// =============================================================================

import GroupsClient from "./GroupsClient";

export default async function GroupsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Groups
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Join accountability groups and compete together.
        </p>
      </header>

      <GroupsClient />
    </div>
  );
}
