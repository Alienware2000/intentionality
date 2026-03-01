// =============================================================================
// FRIEND PROFILE PAGE
// Shows detailed stats and comparison for a specific friend.
// =============================================================================

import FriendProfileClient from "./FriendProfileClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FriendProfilePage({ params }: Props) {
  const { id } = await params;

  return <FriendProfileClient friendId={id} />;
}
