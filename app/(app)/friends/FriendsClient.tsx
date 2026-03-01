"use client";

// =============================================================================
// FRIENDS CLIENT COMPONENT (SOCIAL HUB)
// Unified social page with two tabs: Friends and Groups.
// Friend requests are folded inline into the Friends tab.
// Features search, sort, section grouping, and visual hierarchy.
// =============================================================================

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatRelativeTime } from "@/app/lib/format-time";
import { useSocial } from "@/app/components/SocialProvider";
import {
  FriendRequestCard,
  AddFriendModal,
} from "@/app/components/social";
import GlowCard from "@/app/components/ui/GlowCard";
import UserAvatar from "@/app/components/social/UserAvatar";
import GroupsTabContent from "./GroupsTabContent";
import type { FriendWithProfile, FriendDailyProgress } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SocialTab = "friends" | "groups";
type SortOption = "activity" | "streak" | "level" | "name";

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
// Active Status Helper
// -----------------------------------------------------------------------------

function getActiveStatus(progress?: FriendDailyProgress): { text: string; color: string } {
  if (!progress) return { text: "", color: "" };
  if (!progress.is_active_today) {
    if (progress.last_active) {
      const now = Date.now();
      const lastActive = new Date(progress.last_active).getTime();
      const diffMinutes = Math.floor((now - lastActive) / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return { text: `Active ${diffHours}h ago`, color: "text-[var(--text-muted)]" };
      if (diffHours < 48) return { text: "Active yesterday", color: "text-[var(--text-muted)]" };
    }
    return { text: "", color: "" };
  }

  if (!progress.last_active) return { text: "Active today", color: "text-[var(--accent-success)]" };

  const now = Date.now();
  const lastActive = new Date(progress.last_active).getTime();
  const diffMinutes = Math.floor((now - lastActive) / 60000);

  if (diffMinutes < 15) return { text: "Active now", color: "text-[var(--accent-success)]" };
  if (diffMinutes < 60) return { text: `Active ${diffMinutes}m ago`, color: "text-[var(--accent-success)]" };

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return { text: `Active ${diffHours}h ago`, color: "text-[var(--text-muted)]" };

  return { text: "", color: "" };
}

// -----------------------------------------------------------------------------
// Friend Card Component
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

  const isActive = progress?.is_active_today ?? false;
  const activeStatus = getActiveStatus(progress);
  const hasNotableProgress = progress && (
    progress.tasks_completed >= 5 ||
    progress.focus_minutes >= 60 ||
    (friend.current_streak > 0 && friend.current_streak % 7 === 0)
  );

  return (
    <motion.div variants={itemVariants} layout>
      <GlowCard
        glowColor={isActive ? "success" : "none"}
        hoverLift
        className="cursor-pointer"
        onClick={() => router.push(`/friends/${friend.user_id}`)}
      >
        {/* Top Row: Avatar, Name, Level/Streak, Actions */}
        <div className="flex items-center gap-3">
          <UserAvatar
            userId={friend.user_id}
            displayName={friend.display_name}
            size={40}
            showActive={isActive}
          />

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

        {/* Bottom Row: Today's Progress (only for active friends) */}
        {progress && isActive && (
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
        <UserAvatar
          userId={request.user_id}
          displayName={request.display_name}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {request.display_name || "Anonymous"}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {request.username && (
              <span className="text-[var(--accent-primary)]">@{request.username}</span>
            )}
            <span>Lv.{request.level}</span>
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

// -----------------------------------------------------------------------------
// Stats Card
// -----------------------------------------------------------------------------

function FriendsStatsCard({
  friendCount,
  activeTodayCount,
  avgStreak,
}: {
  friendCount: number;
  activeTodayCount: number;
  avgStreak: number;
}) {
  return (
    <GlowCard glowColor="primary" className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] rounded-full blur-3xl" />
      </div>
      <div className="relative flex items-center gap-6 flex-wrap">
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
        <div className="flex items-center gap-3 pl-6 border-l border-[var(--border-subtle)]">
          <div>
            <p className="text-2xl font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              {activeTodayCount}
              {activeTodayCount > 0 && (
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
              )}
            </p>
            <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">
              Active today
            </p>
          </div>
        </div>
        {avgStreak > 0 && (
          <div className="flex items-center gap-3 pl-6 border-l border-[var(--border-subtle)]">
            <div>
              <p className="text-2xl font-mono font-bold text-[var(--accent-streak)]">
                {avgStreak}d
              </p>
              <p className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">
                Avg streak
              </p>
            </div>
          </div>
        )}
      </div>
    </GlowCard>
  );
}

// -----------------------------------------------------------------------------
// Sort Labels
// -----------------------------------------------------------------------------

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "streak", label: "Streak" },
  { value: "level", label: "Level" },
  { value: "name", label: "Name" },
];

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

  // Initialize tab from URL param — redirect old tabs to "friends"
  const rawTab = searchParams.get("tab");
  const initialTab: SocialTab =
    rawTab === "groups" ? "groups" : "friends";
  const [tab, setTab] = useState<SocialTab>(initialTab);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Search & sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("activity");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Inline requests collapsible
  const [requestsExpanded, setRequestsExpanded] = useState(true);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Redirect old tab params
  useEffect(() => {
    if (rawTab === "requests" || rawTab === "sent") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      router.replace(`/friends${params.toString() ? `?${params}` : ""}`, { scroll: false });
    }
  }, [rawTab, router, searchParams]);

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

  const handleNudge = useCallback(
    async (friendId: string) => await sendNudge(friendId),
    [sendNudge]
  );

  const handleHighFive = useCallback(
    async (friendId: string) => await sendNudge(friendId, undefined, "high_five"),
    [sendNudge]
  );

  const handleAccept = useCallback(
    async (requestId: string) => await acceptFriendRequest(requestId),
    [acceptFriendRequest]
  );

  const handleReject = useCallback(
    async (requestId: string) => await rejectFriendRequest(requestId),
    [rejectFriendRequest]
  );

  // Compute stats
  const activeTodayCount = useMemo(
    () => friends.filter((f) => dailyProgress[f.user_id]?.is_active_today).length,
    [friends, dailyProgress]
  );

  const avgStreak = useMemo(() => {
    if (friends.length === 0) return 0;
    const total = friends.reduce((sum, f) => sum + f.current_streak, 0);
    return Math.round(total / friends.length);
  }, [friends]);

  // Filter & sort friends
  const { activeFriends, inactiveFriends } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let filtered = friends;
    if (query) {
      filtered = friends.filter(
        (f) =>
          (f.display_name?.toLowerCase() || "").includes(query) ||
          (f.username?.toLowerCase() || "").includes(query)
      );
    }

    const sortFn = (a: FriendWithProfile, b: FriendWithProfile): number => {
      switch (sortBy) {
        case "activity": {
          const aActive = dailyProgress[a.user_id]?.is_active_today ? 1 : 0;
          const bActive = dailyProgress[b.user_id]?.is_active_today ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          return b.current_streak - a.current_streak;
        }
        case "streak":
          return b.current_streak - a.current_streak;
        case "level":
          return b.level - a.level;
        case "name":
          return (a.display_name || "").localeCompare(b.display_name || "");
        default:
          return 0;
      }
    };

    const sorted = [...filtered].sort(sortFn);

    const active = sorted.filter((f) => dailyProgress[f.user_id]?.is_active_today);
    const inactive = sorted.filter((f) => !dailyProgress[f.user_id]?.is_active_today);

    return { activeFriends: active, inactiveFriends: inactive };
  }, [friends, searchQuery, sortBy, dailyProgress]);

  const pendingCount = pendingRequests.length;

  return (
    <div className="space-y-6">
      {/* Stats Card - only show on friends tab */}
      {tab === "friends" && (
        <FriendsStatsCard
          friendCount={friends.length}
          activeTodayCount={activeTodayCount}
          avgStreak={avgStreak}
        />
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        {/* Tabs — 2 tabs with animated indicator */}
        <div className="relative flex gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
          {(
            [
              { id: "friends" as SocialTab, label: "Friends", icon: <Users size={16} /> },
              { id: "groups" as SocialTab, label: "Groups", icon: <UsersRound size={16} /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors z-10",
                "min-h-[44px] sm:min-h-0",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                tab === t.id
                  ? "text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="social-tab-indicator"
                  className="absolute inset-0 bg-[var(--accent-primary)] rounded-lg -z-10"
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                />
              )}
              {t.icon}
              <span>{t.label}</span>
              {t.id === "friends" && pendingCount > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-xs font-bold",
                    tab === t.id ? "bg-white/20" : "bg-[var(--accent-primary)] text-white"
                  )}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Add Friend Button */}
        {tab === "friends" && (
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
            key="friends"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Inline Pending Requests */}
            {pendingCount > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setRequestsExpanded((v) => !v)}
                  className={cn(
                    "flex items-center gap-2 w-full text-left text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]",
                    "min-h-[44px] sm:min-h-0",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
                  )}
                >
                  <Bell size={14} className="text-[var(--accent-primary)]" />
                  Friend Requests ({pendingCount})
                  {requestsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <AnimatePresence>
                  {requestsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3 overflow-hidden"
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
                </AnimatePresence>
              </div>
            )}

            {/* Sent Requests summary */}
            {sentRequests.length > 0 && (
              <details className="group">
                <summary
                  className={cn(
                    "flex items-center gap-2 cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors",
                    "min-h-[44px] sm:min-h-0 list-none",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
                  )}
                >
                  <Send size={12} />
                  <span>{sentRequests.length} sent request{sentRequests.length > 1 ? "s" : ""} pending</span>
                  <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-3 space-y-3">
                  {sentRequests.map((request) => (
                    <SentRequestCard key={request.friendship_id} request={request} />
                  ))}
                </div>
              </details>
            )}

            {/* Search & Sort Controls */}
            {friends.length > 0 && (
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search friends..."
                    className={cn(
                      "w-full pl-9 pr-3 py-2.5 rounded-xl text-sm",
                      "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30",
                      "min-h-[44px] sm:min-h-0",
                      "[touch-action:manipulation]"
                    )}
                  />
                </div>

                {/* Sort Dropdown */}
                <div ref={sortRef} className="relative">
                  <button
                    onClick={() => setShowSortDropdown((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium",
                      "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                      "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                      "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "transition-colors"
                    )}
                  >
                    <ArrowUpDown size={14} />
                    <span className="hidden sm:inline">
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                    </span>
                  </button>
                  <AnimatePresence>
                    {showSortDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1 }}
                        className={cn(
                          "absolute right-0 top-full mt-1 z-20 min-w-[140px]",
                          "rounded-xl overflow-hidden",
                          "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                          "shadow-lg"
                        )}
                      >
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortBy(option.value);
                              setShowSortDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm transition-colors",
                              "min-h-[44px] sm:min-h-0",
                              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                              sortBy === option.value
                                ? "text-[var(--accent-primary)] bg-[var(--accent-primary)]/5 font-medium"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Friends List */}
            {friends.length === 0 ? (
              <GlowCard glowColor="none">
                <NoFriendsMessage />
              </GlowCard>
            ) : activeFriends.length === 0 && inactiveFriends.length === 0 ? (
              <GlowCard glowColor="none">
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <p className="text-sm">No friends match &ldquo;{searchQuery}&rdquo;</p>
                </div>
              </GlowCard>
            ) : (
              <div className="space-y-5">
                {/* Active Now Section */}
                {activeFriends.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
                      Active Now ({activeFriends.length})
                    </h3>
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3"
                    >
                      {activeFriends.map((friend) => (
                        <FriendCard
                          key={friend.user_id}
                          friend={friend}
                          progress={dailyProgress[friend.user_id]}
                          onNudge={handleNudge}
                          onHighFive={handleHighFive}
                        />
                      ))}
                    </motion.div>
                  </div>
                )}

                {/* Friends Section */}
                {inactiveFriends.length > 0 && (
                  <div className="space-y-3">
                    {activeFriends.length > 0 && (
                      <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                        Friends ({inactiveFriends.length})
                      </h3>
                    )}
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3"
                    >
                      {inactiveFriends.map((friend) => (
                        <FriendCard
                          key={friend.user_id}
                          friend={friend}
                          progress={dailyProgress[friend.user_id]}
                          onNudge={handleNudge}
                          onHighFive={handleHighFive}
                        />
                      ))}
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Friend Modal */}
      <AddFriendModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
