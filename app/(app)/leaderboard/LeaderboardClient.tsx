"use client";

// =============================================================================
// LEADERBOARD CLIENT COMPONENT
// Interactive leaderboard with tabs for Global/Friends/Groups and metric filters.
// Features smooth animations, skeleton loading, and responsive design.
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import anime from "animejs";
import {
  Trophy,
  Users,
  Globe,
  Zap,
  Flame,
  TrendingUp,
  Crown,
  Shield,
  Settings,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { prefersReducedMotion } from "@/app/lib/anime-utils";
import { useSocial } from "@/app/components/SocialProvider";
import { RankingRow, RankingRowSkeleton } from "@/app/components/social";
import GlowCard from "@/app/components/ui/GlowCard";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  GroupWithMembership,
} from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type LeaderboardTab = "global" | "friends" | "groups";

type LeaderboardResponse = {
  ok: true;
  entries: LeaderboardEntry[];
  my_rank: number | null;
  my_value?: number | null;
  total_participants: number;
};

/** Items per page for pagination */
const ITEMS_PER_PAGE = 50;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
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
};

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
        active
          ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20"
          : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]"
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "px-1.5 py-0.5 rounded-md text-xs",
            active ? "bg-white/20" : "bg-[var(--bg-elevated)]"
          )}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

// -----------------------------------------------------------------------------
// Metric Filter Component
// -----------------------------------------------------------------------------

type MetricFilterProps = {
  metric: LeaderboardMetric;
  onChange: (metric: LeaderboardMetric) => void;
};

function MetricFilter({ metric, onChange }: MetricFilterProps) {
  const metrics: { value: LeaderboardMetric; label: string; icon: React.ReactNode }[] = [
    { value: "xp", label: "XP", icon: <Zap size={14} /> },
    { value: "streak", label: "Streak", icon: <Flame size={14} /> },
    { value: "level", label: "Level", icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
      {metrics.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            metric === m.value
              ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// User Rank Card Component
// -----------------------------------------------------------------------------

type UserRankCardProps = {
  rank: number;
  totalCount: number;
  metric: LeaderboardMetric;
  value: number;
};

function UserRankCard({ rank, totalCount, metric, value }: UserRankCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !valueRef.current) return;

    anime({
      targets: { val: 0 },
      val: value,
      round: 1,
      duration: 600,
      easing: "easeOutExpo",
      update: (anim) => {
        const current = Math.round(
          (anim.animations[0] as unknown as { currentValue: number }).currentValue
        );
        if (valueRef.current) {
          valueRef.current.textContent = current.toLocaleString();
        }
      },
    });
  }, [value]);

  const percentile = totalCount > 0 ? Math.round(((totalCount - rank + 1) / totalCount) * 100) : 0;

  const getRankIcon = () => {
    if (rank === 1) return <Crown size={20} className="text-amber-400" />;
    if (rank <= 3) return <Trophy size={20} className="text-[var(--accent-primary)]" />;
    if (rank <= 10) return <Shield size={20} className="text-[var(--accent-highlight)]" />;
    return <TrendingUp size={20} className="text-[var(--text-muted)]" />;
  };

  const metricLabels: Record<LeaderboardMetric, string> = {
    xp: "Total XP",
    streak: "Day Streak",
    level: "Level",
    tasks: "Tasks",
    focus: "Focus Time",
  };
  const metricLabel = metricLabels[metric];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlowCard glowColor="primary" className="relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--accent-streak)] rounded-full blur-2xl" />
        </div>

        <div className="relative flex items-center gap-4">
          {/* Rank badge */}
          <div
            className={cn(
              "flex items-center justify-center w-16 h-16 rounded-xl",
              rank <= 3
                ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10"
                : "bg-[var(--bg-elevated)]"
            )}
          >
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                #{rank}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Your Rank
            </p>
            <div className="flex items-center gap-2 mt-1">
              {getRankIcon()}
              <span
                ref={valueRef}
                className="text-xl font-mono font-bold text-[var(--accent-primary)]"
              >
                {value.toLocaleString()}
              </span>
              <span className="text-sm text-[var(--text-muted)]">{metricLabel}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Top {percentile}% of {totalCount.toLocaleString()} users
            </p>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Privacy Notice Component
// -----------------------------------------------------------------------------

function PrivacyNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]"
      )}
    >
      <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
        <Shield size={18} className="text-[var(--accent-primary)]" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-[var(--text-secondary)]">
          You appear on the global leaderboard by default
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Want to hide your ranking? You can opt out in privacy settings.
        </p>
      </div>
      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium",
          "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
          "hover:bg-[var(--bg-hover)] transition-colors"
        )}
      >
        <Settings size={12} />
        Settings
        <ChevronRight size={12} />
      </Link>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Empty State Component
// -----------------------------------------------------------------------------

type EmptyStateProps = {
  tab: LeaderboardTab;
};

function EmptyState({ tab }: EmptyStateProps) {
  const config = {
    global: {
      icon: <Globe size={32} className="text-[var(--text-muted)]" />,
      title: "No global rankings yet",
      message: "No users on the leaderboard yet. Start earning XP to appear here!",
    },
    friends: {
      icon: <Users size={32} className="text-[var(--text-muted)]" />,
      title: "No friends to compare with",
      message: "Add some friends to see how you rank against them.",
    },
    groups: {
      icon: <Trophy size={32} className="text-[var(--text-muted)]" />,
      title: "No groups joined",
      message: "Join or create a group to compete with teammates.",
    },
  };

  const { icon, title, message } = config[tab];

  return (
    <div className="text-center py-12">
      <div className="inline-flex p-4 rounded-full bg-[var(--bg-elevated)] mb-4">
        {icon}
      </div>
      <p className="text-[var(--text-secondary)] font-medium">{title}</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">{message}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Group Selector Component
// -----------------------------------------------------------------------------

type GroupSelectorProps = {
  groups: GroupWithMembership[];
  selectedGroupId: string | null;
  onSelect: (groupId: string) => void;
};

function GroupSelector({ groups, selectedGroupId, onSelect }: GroupSelectorProps) {
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onSelect(group.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all",
            selectedGroupId === group.id
              ? "bg-[var(--accent-primary)] text-white"
              : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
          )}
        >
          <Users size={14} />
          <span className="font-medium">{group.name}</span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-xs",
              selectedGroupId === group.id
                ? "bg-white/20"
                : "bg-[var(--bg-elevated)]"
            )}
          >
            {group.member_count}
          </span>
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function LeaderboardClient() {
  const { groups, sendFriendRequest, sentRequests } = useSocial();

  const [tab, setTab] = useState<LeaderboardTab>("global");
  const [metric, setMetric] = useState<LeaderboardMetric>("xp");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | undefined>();
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Use a ref to track the current offset to avoid stale closure issues in loadLeaderboard
  const offsetRef = useRef(0);
  // Use a ref for synchronous loading guard (React state batching can't bypass this)
  const loadingRef = useRef(false);
  // Track previous entry count to skip animation for already-visible items on "Load More"
  const prevEntryCountRef = useRef(0);
  // Ref for infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Note: SocialProvider handles groups fetching - no need to refresh on mount

  // Set default group when groups load
  useEffect(() => {
    if (tab === "groups" && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [tab, groups, selectedGroupId]);

  // Fetch leaderboard data
  // Note: We use offsetRef to avoid stale closure issues in the useCallback
  // We use loadingRef for synchronous guard to prevent race conditions from rapid clicks
  const loadLeaderboard = useCallback(async (loadMore = false) => {
    // Synchronous guard using ref (React state batching can't bypass this)
    if (loadMore && loadingRef.current) {
      return;
    }

    if (loadMore) {
      loadingRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
      offsetRef.current = 0;
    }
    setError(null);

    try {
      const currentOffset = loadMore ? offsetRef.current : 0;
      let url: string;

      if (tab === "global") {
        url = `/api/leaderboard/global?metric=${metric}&limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`;
      } else if (tab === "friends") {
        url = `/api/leaderboard/friends?metric=${metric}&limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`;
      } else if (tab === "groups" && selectedGroupId) {
        url = `/api/groups/${selectedGroupId}/leaderboard?metric=${metric}&limit=${ITEMS_PER_PAGE}&offset=${currentOffset}`;
      } else {
        setEntries([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const data = await fetchApi<LeaderboardResponse>(url);

      if (loadMore) {
        setEntries(prev => [...prev, ...data.entries]);
      } else {
        setEntries(data.entries);
      }

      setUserRank(data.my_rank ?? undefined);
      setTotalCount(data.total_participants);

      const newOffset = currentOffset + data.entries.length;
      const newHasMore = data.entries.length === ITEMS_PER_PAGE && newOffset < data.total_participants;
      setHasMore(newHasMore);
      offsetRef.current = newOffset;
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [tab, metric, selectedGroupId]);

  useEffect(() => {
    loadLeaderboard(false);
  }, [tab, metric, selectedGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update previous entry count ref after entries change (for "Load More" animation optimization)
  useEffect(() => {
    prevEntryCountRef.current = entries.length;
  }, [entries.length]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          loadLeaderboard(true);
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore, loadLeaderboard]);

  // Get user's value for current metric from entries
  const userEntry = entries.find((e) => e.is_current_user);
  const userValue = userEntry?.value ?? 0;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={tab === "global"}
          onClick={() => setTab("global")}
          icon={<Globe size={16} />}
          label="Global"
        />
        <TabButton
          active={tab === "friends"}
          onClick={() => setTab("friends")}
          icon={<Users size={16} />}
          label="Friends"
        />
        <TabButton
          active={tab === "groups"}
          onClick={() => setTab("groups")}
          icon={<Trophy size={16} />}
          label="Groups"
          count={groups.length}
        />
      </div>

      {/* Group selector for groups tab */}
      <AnimatePresence mode="wait">
        {tab === "groups" && groups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GroupSelector
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelect={setSelectedGroupId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metric filter */}
      <div className="flex items-center justify-between">
        <MetricFilter metric={metric} onChange={setMetric} />
      </div>

      {/* User rank card */}
      {!loading && userRank && totalCount > 0 && (
        <UserRankCard
          rank={userRank}
          totalCount={totalCount}
          metric={metric}
          value={userValue}
        />
      )}

      {/* Privacy notice for global tab */}
      {tab === "global" && <PrivacyNotice />}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Leaderboard table */}
      <GlowCard glowColor="none" className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-2">
            <span className="text-[var(--accent-highlight)]">●</span> Rankings
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            {loading ? "Loading..." : `${entries.length} of ${totalCount}`}
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <RankingRowSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && <EmptyState tab={tab} />}

        {/* Entries */}
        {!loading && entries.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-1"
          >
            {entries.map((entry, index) => {
              // Check if we have a pending request to this user
              const hasPendingRequest = sentRequests.some(
                (sr) => sr.user_id === entry.user_id
              );

              return (
                <motion.div
                  key={entry.user_id}
                  initial={index >= prevEntryCountRef.current ? "hidden" : false}
                  animate="visible"
                  variants={itemVariants}
                >
                  <RankingRow
                    entry={entry}
                    metric={metric}
                    index={index}
                    onAddFriend={tab === "global" ? sendFriendRequest : undefined}
                    hasPendingRequest={hasPendingRequest}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Infinite scroll sentinel and loading indicator */}
        {!loading && hasMore && (
          <div ref={loadMoreRef} className="mt-4 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        )}
      </GlowCard>
    </div>
  );
}
