"use client";

// =============================================================================
// FRIENDS CLIENT COMPONENT
// Interactive friends management with tabs, friend requests, and search.
// Features smooth animations and responsive design.
// =============================================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Clock,
  Bell,
  Send,
  Heart,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatRelativeTime } from "@/app/lib/format-time";
import { useSocial } from "@/app/components/SocialProvider";
import {
  FriendRequestCard,
  NoRequestsMessage,
  AddFriendModal,
} from "@/app/components/social";
import GlowCard from "@/app/components/ui/GlowCard";
import type { FriendWithProfile } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type FriendsTab = "friends" | "requests" | "sent";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

// -----------------------------------------------------------------------------
// Tab Button Component
// -----------------------------------------------------------------------------

type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  alert?: boolean;
};

function TabButton({ active, onClick, icon, label, count, alert }: TabButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative",
        active
          ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20"
          : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]"
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "px-1.5 py-0.5 rounded-md text-xs font-bold",
            active ? "bg-white/20" : "bg-[var(--bg-elevated)]",
            alert && !active && "bg-[var(--accent-primary)] text-white"
          )}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

// -----------------------------------------------------------------------------
// Friend Card Component (extended UserCard)
// -----------------------------------------------------------------------------

type FriendCardProps = {
  friend: FriendWithProfile;
  onNudge: (friendId: string) => Promise<boolean>;
};

function FriendCard({ friend, onNudge }: FriendCardProps) {
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleNudge = async () => {
    setNudging(true);
    const success = await onNudge(friend.user_id);
    setNudging(false);
    if (success) {
      setNudged(true);
      // Reset the "Sent!" state after 3 seconds so user can nudge again later
      timeoutRef.current = setTimeout(() => setNudged(false), 3000);
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <GlowCard
        glowColor="none"
        hoverLift
        className="flex items-center gap-4"
      >
        {/* Avatar & Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-full bg-[var(--accent-primary)]/10 shrink-0">
            <Users size={20} className="text-[var(--accent-primary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--text-primary)] truncate">
              {friend.display_name || "Anonymous"}
            </p>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              {friend.username && (
                <span className="text-[var(--accent-primary)]">@{friend.username}</span>
              )}
              <span>{friend.title}</span>
            </div>
          </div>
        </div>

        {/* Stats - Condensed on mobile, full on desktop */}
        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          {/* Mobile: condensed inline stats */}
          <div className="flex sm:hidden items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="font-mono font-bold text-[var(--accent-primary)]">
              Lv.{friend.level}
            </span>
            {friend.current_streak > 0 && (
              <span className="font-mono font-bold text-[var(--accent-streak)]">
                {friend.current_streak}d
              </span>
            )}
          </div>
          {/* Desktop: full stats */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center">
              <p className="font-mono font-bold text-[var(--accent-primary)]">
                {friend.level}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Level</p>
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-[var(--accent-streak)]">
                {friend.current_streak}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Streak</p>
            </div>
            <div className="text-center">
              <p className="font-mono font-bold text-[var(--text-primary)]">
                {friend.xp_total.toLocaleString()}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">XP</p>
            </div>
          </div>
        </div>

        {/* Nudge Button */}
        <div className="relative group">
          <button
            onClick={handleNudge}
            disabled={nudging || nudged}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              nudged
                ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
              "disabled:opacity-50"
            )}
          >
            {nudging ? (
              <Loader2 size={14} className="animate-spin" />
            ) : nudged ? (
              <Check size={14} />
            ) : (
              <Heart size={14} />
            )}
            {nudged ? "Sent!" : "Nudge"}
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none shadow-lg z-10">
            Send encouragement to help your friend stay on track
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[var(--bg-elevated)]" />
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Sent Request Card Component
// -----------------------------------------------------------------------------

type SentRequestCardProps = {
  request: FriendWithProfile;
};

function SentRequestCard({ request }: SentRequestCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <GlowCard glowColor="none" className="flex items-center gap-3">
        {/* Avatar */}
        <div className="p-2.5 rounded-full bg-[var(--bg-elevated)] shrink-0">
          <Send size={18} className="text-[var(--text-muted)]" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {request.display_name || "Anonymous"}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {request.username && (
              <span className="text-[var(--accent-primary)]">@{request.username}</span>
            )}
            <span>Lv.{request.level}</span>
            {request.current_streak > 0 && (
              <span>{request.current_streak}d streak</span>
            )}
            <span>· Sent {formatRelativeTime(request.requested_at)}</span>
          </div>
        </div>

        {/* Status */}
        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]">
          <Clock size={12} />
          Pending
        </span>
      </GlowCard>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Empty States
// -----------------------------------------------------------------------------

function NoFriendsMessage() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex p-4 rounded-full bg-[var(--bg-elevated)] mb-4">
        <Users size={32} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)] font-medium">No friends yet</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Add friends to see their progress and compete together!
      </p>
    </div>
  );
}

function NoSentRequestsMessage() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex p-4 rounded-full bg-[var(--bg-elevated)] mb-4">
        <Send size={32} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)] font-medium">No pending requests</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Friend requests you send will appear here until accepted.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Stats Card
// -----------------------------------------------------------------------------

function FriendsStatsCard({
  friendCount,
  pendingCount,
}: {
  friendCount: number;
  pendingCount: number;
}) {
  return (
    <GlowCard glowColor="primary" className="relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] rounded-full blur-3xl" />
      </div>

      <div className="relative flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10">
            <Users size={24} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
              {friendCount}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Friends
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-3 pl-6 border-l border-[var(--border-subtle)]">
            <div className="p-3 rounded-xl bg-[var(--accent-streak)]/10">
              <Bell size={24} className="text-[var(--accent-streak)]" />
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-[var(--accent-streak)]">
                {pendingCount}
              </p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Requests
              </p>
            </div>
          </div>
        )}
      </div>
    </GlowCard>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function FriendsClient() {
  const {
    friends,
    pendingRequests,
    sentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    sendNudge,
    friendsLoading,
  } = useSocial();

  const [tab, setTab] = useState<FriendsTab>("friends");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Note: SocialProvider handles initial data fetching - no need to refresh on mount

  // Handle nudge
  const handleNudge = useCallback(
    async (friendId: string) => {
      return await sendNudge(friendId);
    },
    [sendNudge]
  );

  // Handle accept request
  const handleAccept = useCallback(
    async (requestId: string) => {
      return await acceptFriendRequest(requestId);
    },
    [acceptFriendRequest]
  );

  // Handle reject request
  const handleReject = useCallback(
    async (requestId: string) => {
      return await rejectFriendRequest(requestId);
    },
    [rejectFriendRequest]
  );

  const pendingCount = pendingRequests.length;

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <FriendsStatsCard friendCount={friends.length} pendingCount={pendingCount} />

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={tab === "friends"}
            onClick={() => setTab("friends")}
            icon={<Users size={16} />}
            label="Friends"
            count={friends.length}
          />
          <TabButton
            active={tab === "requests"}
            onClick={() => setTab("requests")}
            icon={<Bell size={16} />}
            label="Requests"
            count={pendingCount}
            alert={pendingCount > 0}
          />
          <TabButton
            active={tab === "sent"}
            onClick={() => setTab("sent")}
            icon={<Send size={16} />}
            label="Sent"
            count={sentRequests.length}
          />
        </div>

        {/* Add Friend Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAddModalOpen(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl",
            "bg-[var(--accent-primary)] text-white",
            "shadow-lg shadow-[var(--accent-primary)]/20",
            "hover:opacity-90 transition-opacity"
          )}
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline font-medium">Add Friend</span>
        </motion.button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {friendsLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlowCard glowColor="none">
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
              </div>
            </GlowCard>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Friends Tab */}
            {tab === "friends" && (
              <>
                {friends.length === 0 ? (
                  <GlowCard glowColor="none">
                    <NoFriendsMessage />
                  </GlowCard>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {friends.map((friend) => (
                      <FriendCard
                        key={friend.user_id}
                        friend={friend}
                        onNudge={handleNudge}
                      />
                    ))}
                  </motion.div>
                )}
              </>
            )}

            {/* Requests Tab */}
            {tab === "requests" && (
              <>
                {pendingRequests.length === 0 ? (
                  <GlowCard glowColor="none">
                    <NoRequestsMessage />
                  </GlowCard>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {pendingRequests.map((request, index) => (
                      <FriendRequestCard
                        key={request.id}
                        request={request}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        index={index}
                      />
                    ))}
                  </motion.div>
                )}
              </>
            )}

            {/* Sent Tab */}
            {tab === "sent" && (
              <>
                {sentRequests.length === 0 ? (
                  <GlowCard glowColor="none">
                    <NoSentRequestsMessage />
                  </GlowCard>
                ) : (
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {sentRequests.map((request) => (
                      <SentRequestCard key={request.friendship_id} request={request} />
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Friend Modal */}
      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
