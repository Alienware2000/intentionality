"use client";

// =============================================================================
// PROFILE PAGE CONTENT
// Client component for the public profile page.
// Handles friend request actions and invite acceptance.
// =============================================================================

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  Zap,
  Flame,
  UserPlus,
  Check,
  Clock,
  ArrowRight,
  Loader2,
  Trophy,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useSocial } from "@/app/components/SocialProvider";
import { useToast } from "@/app/components/Toast";
import GlowCard from "@/app/components/ui/GlowCard";
import type { LevelTitle } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ProfileData = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  level: number;
  current_streak: number;
  longest_streak: number;
  title: LevelTitle;
  xp_total: number;
  invite_code: string | null;
};

type ProfilePageContentProps = {
  profile: ProfileData;
  isAuthenticated: boolean;
  isOwnProfile: boolean;
  friendshipStatus: "none" | "pending" | "friends";
  friendshipId: string | null;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ProfilePageContent({
  profile,
  isAuthenticated,
  isOwnProfile,
  friendshipStatus: initialFriendshipStatus,
}: ProfilePageContentProps) {
  const { sendFriendRequest } = useSocial();
  const { showToast } = useToast();

  const [friendshipStatus, setFriendshipStatus] = useState(initialFriendshipStatus);
  const [sending, setSending] = useState(false);
  const [joiningViaInvite, setJoiningViaInvite] = useState(false);

  // Check for stored invite code on mount (for users who just signed up)
  useEffect(() => {
    if (!isAuthenticated || isOwnProfile) return;

    const storedUsername = localStorage.getItem("invite_username");

    if (storedUsername?.toLowerCase() === profile.username?.toLowerCase()) {
      // This is the inviter! Process the invite
      handleJoinViaInvite();
      // Clear stored invite
      localStorage.removeItem("invite_code");
      localStorage.removeItem("invite_username");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isOwnProfile, profile.username]);

  // Handle joining via invite (auto-connect)
  const handleJoinViaInvite = async () => {
    if (friendshipStatus === "friends") return;

    setJoiningViaInvite(true);

    try {
      const res = await fetch("/api/friends/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: profile.username }),
      });

      const data = await res.json();

      if (data.ok) {
        setFriendshipStatus("friends");
        showToast({
          message: data.message || `Connected with ${profile.display_name || profile.username}!`,
          type: "success",
        });

        if (data.user_xp_earned > 0) {
          showToast({
            message: `+${data.user_xp_earned} XP for joining via invite!`,
            type: "success",
          });
        }
      } else {
        // Show error but don't prevent user from adding friend manually
        showToast({
          message: data.error || "Couldn't auto-connect. You can add them manually.",
          type: "error",
        });
      }
    } catch {
      showToast({
        message: "Couldn't auto-connect. You can add them manually.",
        type: "error",
      });
    } finally {
      setJoiningViaInvite(false);
    }
  };

  // Handle sending friend request
  const handleAddFriend = useCallback(async () => {
    if (friendshipStatus !== "none" || sending) return;

    setSending(true);

    const success = await sendFriendRequest(profile.user_id);

    setSending(false);

    if (success) {
      setFriendshipStatus("pending");
      showToast({ message: "Friend request sent!", type: "success" });
    } else {
      showToast({ message: "Failed to send request", type: "error" });
    }
  }, [friendshipStatus, sending, sendFriendRequest, profile.user_id, showToast]);

  // Store invite info for signup flow
  const handleSignUpClick = () => {
    if (profile.invite_code) {
      localStorage.setItem("invite_code", profile.invite_code);
    }
    if (profile.username) {
      localStorage.setItem("invite_username", profile.username);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <GlowCard glowColor="primary" className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent-primary)] rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--accent-streak)] rounded-full blur-2xl" />
          </div>

          <div className="relative flex flex-col items-center text-center space-y-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/5 flex items-center justify-center border-2 border-[var(--accent-primary)]/20">
                <User size={48} className="text-[var(--accent-primary)]" />
              </div>
              {/* Level badge */}
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-white text-xs font-bold">
                Lv.{profile.level}
              </div>
            </div>

            {/* Name & Username */}
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {profile.display_name || "Anonymous"}
              </h1>
              {profile.username && (
                <p className="text-[var(--text-muted)] mt-1">@{profile.username}</p>
              )}
              <p className="text-sm text-[var(--accent-primary)] mt-1">{profile.title}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-mono font-bold text-[var(--accent-primary)]">
                  <Zap size={18} />
                  {profile.xp_total.toLocaleString()}
                </div>
                <p className="text-xs text-[var(--text-muted)] uppercase">XP</p>
              </div>

              <div className="w-px h-8 bg-[var(--border-subtle)]" />

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-mono font-bold text-[var(--accent-streak)]">
                  <Flame size={18} />
                  {profile.current_streak}
                </div>
                <p className="text-xs text-[var(--text-muted)] uppercase">Streak</p>
              </div>

              <div className="w-px h-8 bg-[var(--border-subtle)]" />

              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-mono font-bold text-[var(--text-primary)]">
                  <Trophy size={18} />
                  {profile.longest_streak}
                </div>
                <p className="text-xs text-[var(--text-muted)] uppercase">Best</p>
              </div>
            </div>

            {/* Action Button */}
            <div className="w-full pt-4 border-t border-[var(--border-subtle)]">
              {isOwnProfile ? (
                <p className="text-sm text-[var(--text-muted)]">This is your profile</p>
              ) : isAuthenticated ? (
                // Authenticated user actions
                <>
                  {joiningViaInvite ? (
                    <div className="flex items-center justify-center gap-2 text-[var(--accent-primary)]">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : friendshipStatus === "friends" ? (
                    <div className="flex items-center justify-center gap-2 text-[var(--accent-success)]">
                      <Check size={18} />
                      <span className="font-medium">Friends</span>
                    </div>
                  ) : friendshipStatus === "pending" ? (
                    <div className="flex items-center justify-center gap-2 text-[var(--text-muted)]">
                      <Clock size={18} />
                      <span>Request Pending</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      disabled={sending}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                        "min-h-[44px] sm:min-h-0",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "active:scale-[0.97]",
                        "bg-[var(--accent-primary)] text-white font-semibold",
                        "hover:opacity-90 transition-all duration-100",
                        "disabled:opacity-50",
                        "shadow-lg shadow-[var(--accent-primary)]/20",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
                      )}
                    >
                      {sending ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          Add as Friend
                        </>
                      )}
                    </button>
                  )}

                  <Link
                    href="/dashboard"
                    className={cn(
                      "mt-3 flex items-center justify-center gap-1 text-sm",
                      "text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    )}
                  >
                    Continue to dashboard
                    <ArrowRight size={14} />
                  </Link>
                </>
              ) : (
                // Not authenticated - show sign up CTA
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {profile.display_name || profile.username} invited you to join Intentionality!
                  </p>
                  <Link
                    href="/auth"
                    onClick={handleSignUpClick}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                      "min-h-[44px] sm:min-h-0",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "active:scale-[0.97]",
                      "bg-[var(--accent-primary)] text-white font-semibold",
                      "hover:opacity-90 transition-all duration-100",
                      "shadow-lg shadow-[var(--accent-primary)]/20",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
                    )}
                  >
                    <UserPlus size={18} />
                    Join & Connect with {profile.display_name?.split(" ")[0] || profile.username}
                  </Link>
                  <Link
                    href="/auth"
                    className="block text-sm text-[var(--text-muted)] hover:underline"
                  >
                    Already have an account? Log in
                  </Link>
                </div>
              )}
            </div>
          </div>
        </GlowCard>

        {/* What is Intentionality? (for non-authenticated users) */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Intentionality is a gamified productivity app. Complete tasks, build streaks,
              and compete with friends!
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
