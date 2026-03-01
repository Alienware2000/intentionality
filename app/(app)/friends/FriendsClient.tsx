"use client";

// =============================================================================
// FRIENDS CLIENT COMPONENT (SOCIAL HUB)
// Unified social page with tabs for friends, requests, sent, and groups.
// Features smooth animations and responsive design.
// =============================================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  UsersRound,
  Clock,
  Bell,
  Send,
  Heart,
  Loader2,
  Check,
  CheckCircle2,
  Flame,
  Timer,
  HandMetal,
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
import GroupsTabContent from "./GroupsTabContent";
import type { FriendWithProfile, FriendDailyProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SocialTab = "friends" | "requests" | "sent" | "groups";

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
        "min-h-[44px] sm:min-h-0",
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
        "active:scale-[0.97]",
        "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
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
// Active Status Helper
// -----------------------------------------------------------------------------

function getActiveStatus(progress?: FriendDailyProgress): { text: string; color: string } {
  if (!progress) return { text: "", color: "" };
  if (!progress.is_active_today) return { text: "Not active today", color: "text-[var(--text-muted)]" };

  if (!progress.last_active) return { text: "Active today", color: "text-[var(--accent-success)]" };

  const now = Date.now();
  const lastActive = new Date(progress.last_active).getTime();
  const diffMinutes = Math.floor((now - lastActive) / 60000);

  if (diffMinutes < 15) return { text: "Active now", color: "text-[var(--accent-success)]" };
  if (diffMinutes < 60) return { text: `Active ${diffMinutes}m ago`, color: "text-[var(--accent-success)]" };

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return { text: `Active ${diffHours}h ago`, color: "text-[var(--text-muted)]" };

  return { text: "Not active today", color: "text-[var(--text-muted)]" };
}

// -----------------------------------------------------------------------------
// Friend Card Component (with Daily Progress)
// -----------------------------------------------------------------------------

type FriendCardProps = {
  friend: FriendWithProfile;
  progress?: FriendDailyProgress;
  onNudge: (friendId: string) => Promise<boolean>;
  onHighFive: (friendId: string) => Promise<boolean>;
};

function FriendCard({ friend, progress, onNudge, onHighFive }: FriendCardProps) {
  const [nudging, setNudging] = useState(false);
  const [nudged, setNudged] = useState(false);
  const [highFiving, setHighFiving] = useState(false);
  const [highFived, setHighFived] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hfTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hfTimeoutRef.current) clearTimeout(hfTimeoutRef.current);
    };
  }, []);

  const handleNudge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNudging(true);
    const success = await onNudge(friend.user_id);
    setNudging(false);
    if (success) {
      setNudged(true);
      timeoutRef.current = setTimeout(() => setNudged(false), 3000);
    }
  };

  const handleHighFive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setHighFiving(true);
    const success = await onHighFive(friend.user_id);
    setHighFiving(false);
    if (success) {
      setHighFived(true);
      hfTimeoutRef.current = setTimeout(() => setHighFived(false), 3000);
    }
  };

  const activeStatus = getActiveStatus(progress);
  const hasNotableProgress = progress && (
    progress.tasks_completed >= 5 ||
    progress.focus_minutes >= 60 ||
    (friend.current_streak > 0 && friend.current_streak % 7 === 0)
  );

  return (
    <motion.div variants={itemVariants}>
      <GlowCard
        glowColor="none"
        hoverLift
        className="cursor-pointer"
        onClick={() => router.push(`/friends/${friend.user_id}`)}
      >
        {/* Top Row: Avatar, Name, Level/Streak, Actions */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative p-2.5 rounded-full bg-[var(--accent-primary)]/10 shrink-0">
            <Users size={20} className="text-[var(--accent-primary)]" />
            {/* Active indicator dot */}
            {progress?.is_active_today && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent-success)] border-2 border-[var(--bg-card)]" />
            )}
          </div>

          {/* Name & Status */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-[var(--text-primary)] truncate">
                {friend.display_name || "Anonymous"}
              </p>
              <span className="hidden sm:inline font-mono text-xs font-bold text-[var(--accent-primary)]">
                Lv.{friend.level}
              </span>
              {friend.current_streak > 0 && (
                <span className="hidden sm:inline font-mono text-xs font-bold text-[var(--accent-streak)]">
                  {friend.current_streak}d streak
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              {friend.username && (
                <span className="text-[var(--accent-primary)]">@{friend.username}</span>
              )}
              {/* Mobile: inline level */}
              <span className="sm:hidden font-mono font-bold text-[var(--accent-primary)]">
                Lv.{friend.level}
              </span>
              {friend.current_streak > 0 && (
                <span className="sm:hidden font-mono font-bold text-[var(--accent-streak)]">
                  {friend.current_streak}d
                </span>
              )}
              {activeStatus.text && (
                <span className={activeStatus.color}>{activeStatus.text}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* High-five button — shown when friend has notable progress */}
            {hasNotableProgress && (
              <button
                onClick={handleHighFive}
                disabled={highFiving || highFived}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                  "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "active:scale-[0.97]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
                  highFived
                    ? "bg-[var(--accent-streak)]/10 text-[var(--accent-streak)]"
                    : "bg-[var(--accent-streak)]/5 text-[var(--accent-streak)] hover:bg-[var(--accent-streak)]/15",
                  "disabled:opacity-50"
                )}
                title="Send a high five!"
              >
                {highFiving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : highFived ? (
                  <Check size={14} />
                ) : (
                  <HandMetal size={14} />
                )}
              </button>
            )}

            {/* Nudge Button */}
            <button
              onClick={handleNudge}
              disabled={nudging || nudged}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "active:scale-[0.97]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
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
              <span className="hidden sm:inline">{nudged ? "Sent!" : "Nudge"}</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Today's Progress */}
        {progress && progress.is_active_today && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs">
              <CheckCircle2 size={13} className="text-[var(--accent-success)]" />
              <span className="font-mono font-bold text-[var(--text-primary)]">{progress.tasks_completed}</span>
              <span className="text-[var(--text-muted)]">tasks</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs">
              <Flame size={13} className="text-[var(--accent-streak)]" />
              <span className="font-mono font-bold text-[var(--text-primary)]">{progress.habits_completed}</span>
              <span className="text-[var(--text-muted)]">habits</span>
            </div>
            {progress.focus_minutes > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs">
                <Timer size={13} className="text-[var(--accent-info)]" />
                <span className="font-mono font-bold text-[var(--text-primary)]">{progress.focus_minutes}m</span>
                <span className="text-[var(--text-muted)]">focus</span>
              </div>
            )}
          </div>
        )}
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
        <div className="p-2.5 rounded-full bg-[var(--bg-elevated)] shrink-0">
          <Send size={18} className="text-[var(--text-muted)]" />
        </div>
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
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-1.5">
              <span className="text-[var(--accent-info)]">●</span> Friends
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
              <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-1.5">
                <span className="text-[var(--accent-streak)]">●</span> Requests
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    friends,
    pendingRequests,
    sentRequests,
    dailyProgress,
    acceptFriendRequest,
    rejectFriendRequest,
    sendNudge,
    friendsLoading,
  } = useSocial();

  // Initialize tab from URL param, default to "friends"
  const initialTab = (searchParams.get("tab") as SocialTab) || "friends";
  const [tab, setTab] = useState<SocialTab>(
    ["friends", "requests", "sent", "groups"].includes(initialTab) ? initialTab : "friends"
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sync tab changes to URL
  const handleTabChange = useCallback(
    (newTab: SocialTab) => {
      setTab(newTab);
      const params = new URLSearchParams(searchParams.toString());
      if (newTab === "friends") {
        params.delete("tab");
      } else {
        params.set("tab", newTab);
      }
      const query = params.toString();
      router.replace(`/friends${query ? `?${query}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Handle nudge
  const handleNudge = useCallback(
    async (friendId: string) => {
      return await sendNudge(friendId);
    },
    [sendNudge]
  );

  // Handle high five (kudos)
  const handleHighFive = useCallback(
    async (friendId: string) => {
      return await sendNudge(friendId, undefined, "high_five");
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
      {/* Stats Card - only show on friends-related tabs */}
      {tab !== "groups" && (
        <FriendsStatsCard friendCount={friends.length} pendingCount={pendingCount} />
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={tab === "friends"}
            onClick={() => handleTabChange("friends")}
            icon={<Users size={16} />}
            label="Friends"
            count={friends.length}
          />
          <TabButton
            active={tab === "requests"}
            onClick={() => handleTabChange("requests")}
            icon={<Bell size={16} />}
            label="Requests"
            count={pendingCount}
            alert={pendingCount > 0}
          />
          <TabButton
            active={tab === "sent"}
            onClick={() => handleTabChange("sent")}
            icon={<Send size={16} />}
            label="Sent"
            count={sentRequests.length}
          />
          <TabButton
            active={tab === "groups"}
            onClick={() => handleTabChange("groups")}
            icon={<UsersRound size={16} />}
            label="Groups"
          />
        </div>

        {/* Add Friend Button - only show on non-groups tabs */}
        {tab !== "groups" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-[var(--accent-primary)] text-white",
              "shadow-lg shadow-[var(--accent-primary)]/20",
              "hover:opacity-90 transition-opacity",
              "min-h-[44px] sm:min-h-0",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
              "active:scale-[0.97]",
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
            )}
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline font-medium">Add Friend</span>
          </motion.button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === "groups" ? (
          <motion.div
            key="groups"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GroupsTabContent />
          </motion.div>
        ) : friendsLoading ? (
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
                        progress={dailyProgress[friend.user_id]}
                        onNudge={handleNudge}
                        onHighFive={handleHighFive}
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
