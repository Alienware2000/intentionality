// =============================================================================
// GROUPS PAGE — REDIRECT
// Groups are now accessible via the Social page (/friends?tab=groups).
// This redirect preserves bookmarks and old links.
// =============================================================================

import { redirect } from "next/navigation";

export default async function GroupsPage() {
  redirect("/friends?tab=groups");
}
