"use client";

// =============================================================================
// GROUP DETAIL CLIENT COMPONENT
// Shows group details with tabs for leaderboard, activity, and members.
// =============================================================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Activity,
  Users,
  Copy,
  Check,
  Crown,
  Shield,
  LogOut,
  Trash2,
  Loader2,
  Settings,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { useSocial } from "@/app/components/SocialProvider";
import {
  RankingRow,
  RankingRowSkeleton,
  ActivityFeedItem,
  ActivityFeedSkeleton,
  NoActivityMessage,
} from "@/app/components/social";
import GlowCard from "@/app/components/ui/GlowCard";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  ActivityFeedItemWithUser,
  GroupMemberRole,
} from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GroupDetailTab = "leaderboard" | "activity" | "members";

type GroupDetail = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  max_members: number;
  is_public: boolean;
  member_count: number;
  total_xp: number;
  created_at: string;
  my_role: GroupMemberRole;
  my_weekly_xp: number;
};

type GroupMember = {
  user_id: string;
  display_name: string | null;
  level: number;
  current_streak: number;
  xp_total: number;
  role: GroupMemberRole;
  weekly_xp: number;
  joined_at: string;
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
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
};

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
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
    </motion.button>
  );
}

// -----------------------------------------------------------------------------
// Metric Filter Component
// -----------------------------------------------------------------------------

type MetricFilterProps = {
  metric: LeaderboardMetric | "weekly_xp";
  onChange: (metric: LeaderboardMetric | "weekly_xp") => void;
};

function MetricFilter({ metric, onChange }: MetricFilterProps) {
  const metrics = [
    { value: "weekly_xp" as const, label: "This Week" },
    { value: "xp" as const, label: "Total XP" },
    { value: "streak" as const, label: "Streak" },
    { value: "level" as const, label: "Level" },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
      {metrics.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            metric === m.value
              ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Member Row Component
// -----------------------------------------------------------------------------

type MemberRowProps = {
  member: GroupMember;
  isCurrentUser: boolean;
  isOwner: boolean;
};

function MemberRow({ member, isCurrentUser, isOwner }: MemberRowProps) {
  // Format relative time
  const formatJoinDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };

  const getRoleIcon = (role: GroupMemberRole) => {
    if (role === "owner") return <Crown size={14} className="text-amber-500" />;
    if (role === "admin") return <Shield size={14} className="text-[var(--accent-primary)]" />;
    return null;
  };

  return (
    <motion.div variants={itemVariants}>
      <div
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-xl",
          "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
          isCurrentUser && "ring-2 ring-[var(--accent-primary)]/30"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "p-2.5 rounded-full shrink-0",
            member.role === "owner"
              ? "bg-amber-500/10"
              : isCurrentUser
              ? "bg-[var(--accent-primary)]/10"
              : "bg-[var(--bg-elevated)]"
          )}
        >
          <Users
            size={18}
            className={
              member.role === "owner"
                ? "text-amber-500"
                : isCurrentUser
                ? "text-[var(--accent-primary)]"
                : "text-[var(--text-muted)]"
            }
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "font-medium truncate",
                isCurrentUser ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
              )}
            >
              {member.display_name || "Anonymous"}
              {isCurrentUser && (
                <span className="text-xs text-[var(--text-muted)] ml-1">(You)</span>
              )}
            </p>
            {getRoleIcon(member.role)}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Lv.{member.level}</span>
            {member.current_streak > 0 && (
              <span>{member.current_streak}d streak</span>
            )}
            <span>· Joined {formatJoinDate(member.joined_at)}</span>
          </div>
        </div>

        {/* Weekly XP */}
        <div className="text-right shrink-0">
          <p className="font-mono font-bold text-[var(--accent-primary)]">
            +{member.weekly_xp}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] uppercase">This Week</p>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

type GroupDetailClientProps = {
  groupId: string;
};

export default function GroupDetailClient({ groupId }: GroupDetailClientProps) {
  const router = useRouter();
  const { leaveGroup } = useSocial();

  const [tab, setTab] = useState<GroupDetailTab>("leaderboard");
  const [metric, setMetric] = useState<LeaderboardMetric | "weekly_xp">("weekly_xp");

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<ActivityFeedItemWithUser[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Load group data
  const loadGroup = useCallback(async () => {
    try {
      const data = await fetchApi<{
        group: GroupDetail;
        members: GroupMember[];
        my_membership: { user_id: string } | null;
      }>(`/api/groups/${groupId}`);
      setGroup(data.group);
      setMembers(data.members);
      if (data.my_membership) {
        setCurrentUserId(data.my_membership.user_id);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [groupId]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await fetchApi<{ entries: LeaderboardEntry[] }>(
        `/api/groups/${groupId}/leaderboard?metric=${metric}`
      );
      setLeaderboard(data.entries);
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
    }
  }, [groupId, metric]);

  // Load activity
  const loadActivity = useCallback(async () => {
    try {
      const data = await fetchApi<{ activities: ActivityFeedItemWithUser[] }>(
        `/api/groups/${groupId}/activity?limit=20`
      );
      setActivity(data.activities);
    } catch (e) {
      console.error("Failed to load activity:", e);
    }
  }, [groupId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadGroup();
      await Promise.all([loadLeaderboard(), loadActivity()]);
      setLoading(false);
    };
    load();
  }, [loadGroup, loadLeaderboard, loadActivity]);

  // Reload leaderboard when metric changes
  useEffect(() => {
    if (!loading) {
      loadLeaderboard();
    }
  }, [metric, loadLeaderboard, loading]);

  // Handle copy invite code
  const handleCopyInvite = () => {
    if (group?.invite_code) {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle leave group
  const handleLeave = async () => {
    if (!group) return;
    if (group.my_role === "owner") {
      alert("Owners must delete the group or transfer ownership first.");
      return;
    }

    const confirmed = confirm("Are you sure you want to leave this group?");
    if (!confirmed) return;

    setLeaving(true);
    const success = await leaveGroup(group.id);
    setLeaving(false);

    if (success) {
      router.push("/groups");
    }
  };

  if (error) {
    return (
      <GlowCard glowColor="none">
        <div className="text-center py-12">
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={() => router.push("/groups")}
            className="mt-4 text-sm text-[var(--accent-primary)] hover:underline"
          >
            Back to Groups
          </button>
        </div>
      </GlowCard>
    );
  }

  if (loading || !group) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-[var(--skeleton-bg)] animate-pulse" />
        <div className="h-32 rounded-xl bg-[var(--skeleton-bg)] animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <RankingRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const isOwnerOrAdmin = group.my_role === "owner" || group.my_role === "admin";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/groups")}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Groups</span>
      </button>

      {/* Group Header */}
      <GlowCard
        glowColor={group.my_role === "owner" ? "highlight" : "primary"}
        className="relative overflow-hidden"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Title & Description */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {group.name}
                </h1>
                {group.my_role === "owner" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                    <Crown size={10} />
                    Owner
                  </span>
                )}
                {group.my_role === "admin" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium">
                    <Shield size={10} />
                    Admin
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-sm text-[var(--text-muted)]">{group.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isOwnerOrAdmin && (
                <button
                  onClick={handleCopyInvite}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                    "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]",
                    "border border-[var(--border-subtle)]",
                    "transition-colors duration-150"
                  )}
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-[var(--accent-success)]" />
                      <span className="text-[var(--accent-success)]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} className="text-[var(--text-muted)]" />
                      <span className="font-mono text-[var(--text-secondary)]">
                        {group.invite_code}
                      </span>
                    </>
                  )}
                </button>
              )}

              {group.my_role !== "owner" && (
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                    "bg-red-500/10 text-red-500",
                    "hover:bg-red-500/20 transition-colors",
                    "disabled:opacity-50"
                  )}
                >
                  {leaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <LogOut size={14} />
                  )}
                  Leave
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                <Users size={16} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <p className="font-mono font-bold text-[var(--text-primary)]">
                  {group.member_count}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Members</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--accent-streak)]/10">
                <Trophy size={16} className="text-[var(--accent-streak)]" />
              </div>
              <div>
                <p className="font-mono font-bold text-[var(--text-primary)]">
                  {group.total_xp.toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Total XP</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[var(--accent-highlight)]/10">
                <Activity size={16} className="text-[var(--accent-highlight)]" />
              </div>
              <div>
                <p className="font-mono font-bold text-[var(--accent-primary)]">
                  +{group.my_weekly_xp}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">Your Week</p>
              </div>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={tab === "leaderboard"}
          onClick={() => setTab("leaderboard")}
          icon={<Trophy size={16} />}
          label="Leaderboard"
        />
        <TabButton
          active={tab === "activity"}
          onClick={() => setTab("activity")}
          icon={<Activity size={16} />}
          label="Activity"
        />
        <TabButton
          active={tab === "members"}
          onClick={() => setTab("members")}
          icon={<Users size={16} />}
          label="Members"
        />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Leaderboard Tab */}
        {tab === "leaderboard" && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <MetricFilter
              metric={metric}
              onChange={(m) => setMetric(m)}
            />

            <GlowCard glowColor="none" className="overflow-hidden">
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
                  <p className="text-[var(--text-secondary)]">No rankings yet</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1"
                >
                  {leaderboard.map((entry, index) => (
                    <motion.div key={entry.user_id} variants={itemVariants}>
                      <RankingRow entry={entry} metric={metric === "weekly_xp" ? "xp" : metric} index={index} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </GlowCard>
          </motion.div>
        )}

        {/* Activity Tab */}
        {tab === "activity" && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlowCard glowColor="none">
              {activity.length === 0 ? (
                <NoActivityMessage />
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {activity.map((item, index) => (
                    <ActivityFeedItem key={item.id} activity={item} index={index} showUser />
                  ))}
                </motion.div>
              )}
            </GlowCard>
          </motion.div>
        )}

        {/* Members Tab */}
        {tab === "members" && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {members.map((member) => (
                <MemberRow
                  key={member.user_id}
                  member={member}
                  isCurrentUser={member.user_id === currentUserId}
                  isOwner={group.my_role === "owner"}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
