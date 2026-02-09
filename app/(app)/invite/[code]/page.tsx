// =============================================================================
// INVITE CODE PAGE
// Landing page for invite codes - redirects to profile page.
// Supports both authenticated and unauthenticated users.
// =============================================================================

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function InviteCodePage({ params }: PageProps) {
  const { code } = await params;

  // Look up the invite code to get the username
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("username")
    .eq("invite_code", code.toUpperCase())
    .single();

  if (!profile?.username) {
    // Invalid invite code - redirect to home
    redirect("/");
  }

  // Redirect to the username-based profile page
  redirect(`/u/${profile.username}`);
}
