// =============================================================================
// SOCIAL PAGE
// Unified social hub for friends, groups, and accountability.
// =============================================================================

import FriendsClient from "./FriendsClient";

export default async function SocialPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Social
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Friends, groups, and accountability.
        </p>
      </header>

      <FriendsClient />
    </div>
  );
}
