// =============================================================================
// PUBLIC PROFILE PAGE
// Shows user's public profile and allows adding as friend.
// Accessible via /u/[username] for shareable profile URLs.
// =============================================================================

import { Suspense } from "react";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import { notFound } from "next/navigation";
import ProfilePageContent from "./ProfilePageContent";
import type { LevelTitle } from "@/app/lib/types";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  // Look up the user by username
  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select(`
      user_id,
      display_name,
      username,
      level,
      current_streak,
      longest_streak,
      title,
      xp_total,
      invite_code
    `)
    .ilike("username", username)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Get current user (if authenticated)
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.user_id;

  // Check friendship status
  let friendshipStatus: "none" | "pending" | "friends" = "none";
  let friendshipId: string | null = null;

  if (user && !isOwnProfile) {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id, status, user_id")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${profile.user_id}),and(user_id.eq.${profile.user_id},friend_id.eq.${user.id})`
      )
      .single();

    if (friendship) {
      friendshipId = friendship.id;
      friendshipStatus = friendship.status === "accepted" ? "friends" : "pending";
    }
  }

  const profileData = {
    user_id: profile.user_id,
    display_name: profile.display_name,
    username: profile.username,
    level: profile.level,
    current_streak: profile.current_streak,
    longest_streak: profile.longest_streak,
    title: (profile.title as LevelTitle) ?? "Novice",
    xp_total: profile.xp_total,
    invite_code: profile.invite_code,
  };

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfilePageContent
        profile={profileData}
        isAuthenticated={!!user}
        isOwnProfile={isOwnProfile}
        friendshipStatus={friendshipStatus}
        friendshipId={friendshipId}
      />
    </Suspense>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-[var(--skeleton-bg)]" />
          <div className="h-6 w-32 bg-[var(--skeleton-bg)] rounded" />
          <div className="h-4 w-24 bg-[var(--skeleton-bg)] rounded" />
        </div>
      </div>
    </div>
  );
}
