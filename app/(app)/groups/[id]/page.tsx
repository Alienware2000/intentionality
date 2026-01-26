// =============================================================================
// GROUP DETAIL PAGE
// Shows a specific group with leaderboard, activity, and members.
// =============================================================================

import GroupDetailClient from "./GroupDetailClient";

type GroupPageProps = {
  params: Promise<{ id: string }>;
};

export default async function GroupPage({ params }: GroupPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <GroupDetailClient groupId={id} />
    </div>
  );
}
