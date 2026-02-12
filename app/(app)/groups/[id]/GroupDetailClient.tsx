"use client";

// =============================================================================
// GROUP DETAIL CLIENT COMPONENT
// Shows group details with tabs for leaderboard, activity, and members.
// =============================================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Activity,
  Users,
  Crown,
  Shield,
  LogOut,
  Loader2,
  Settings,
  UserPlus,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { useSocial } from "@/app/components/SocialProvider";
import {
  RankingRow,
  RankingRowSkeleton,
  ActivityFeedItem,
  NoActivityMessage,
  WeeklyAwardsDisplay,
  GroupChallengeCard,
  GroupChallengeCardSkeleton,
  AtRiskMembersPanel,
  CurrentActivityCompact,
  GroupSettingsModal,
  InviteMembersModal,
  TransferOwnershipModal,
} from "@/app/components/social";
import GlowCard from "@/app/components/ui/GlowCard";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  ActivityFeedItemWithUser,
  GroupMemberRole,
  WeeklyAwards,
  GroupChallenge,
  AtRiskMember,
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
  current_activity?: string | null;
  current_activity_updated_at?: string | null;
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
        "min-h-[44px] sm:min-h-0", // Touch target compliance
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
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
            "min-h-[44px] sm:min-h-0", // Touch target compliance
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
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
};

function MemberRow({ member, isCurrentUser }: MemberRowProps) {
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
          {/* Current activity status */}
          {member.current_activity && (
            <CurrentActivityCompact activity={member.current_activity} className="mt-1" />
          )}
        </div>

        {/* Weekly XP */}
        <div className="text-right shrink-0">
          <p className="font-mono font-bold text-[var(--accent-primary)]">
            +{member.weekly_xp}
          </p>
          <p className="text-xs text-[var(--text-muted)] uppercase">This Week</p>
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

  // Social enhancements state
  const [awards, setAwards] = useState<WeeklyAwards | null>(null);
  const [challenge, setChallenge] = useState<GroupChallenge | null>(null);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [atRiskMembers, setAtRiskMembers] = useState<AtRiskMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Modal states for owner/admin features
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);

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

  // Load weekly awards
  const loadAwards = useCallback(async () => {
    try {
      const data = await fetchApi<{ awards: WeeklyAwards | null }>(
        `/api/groups/${groupId}/awards`
      );
      setAwards(data.awards);
    } catch (e) {
      console.error("Failed to load awards:", e);
    }
  }, [groupId]);

  // Load current challenge
  const loadChallenge = useCallback(async () => {
    setChallengeLoading(true);
    try {
      const data = await fetchApi<{ challenge: GroupChallenge | null; progress_percentage: number }>(
        `/api/groups/${groupId}/challenge`
      );
      setChallenge(data.challenge);
      setChallengeProgress(data.progress_percentage);
    } catch (e) {
      console.error("Failed to load challenge:", e);
    } finally {
      setChallengeLoading(false);
    }
  }, [groupId]);

  // Load at-risk members
  const loadAtRisk = useCallback(async () => {
    try {
      const data = await fetchApi<{ at_risk_members: AtRiskMember[] }>(
        `/api/groups/${groupId}/at-risk`
      );
      setAtRiskMembers(data.at_risk_members);
    } catch (e) {
      console.error("Failed to load at-risk members:", e);
    }
  }, [groupId]);

  // Initial load with cleanup to prevent memory leaks
  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      setLoading(true);
      await loadGroup();
      if (!mountedRef.current) return;
      await Promise.all([
        loadLeaderboard(),
        loadActivity(),
        loadAwards(),
        loadChallenge(),
        loadAtRisk(),
      ]);
      if (!mountedRef.current) return;
      setLoading(false);
    };
    load();

    return () => {
      mountedRef.current = false;
    };
  }, [loadGroup, loadLeaderboard, loadActivity, loadAwards, loadChallenge, loadAtRisk]);

  // Poll at-risk members every 60 seconds to show updated accountability data
  // Issue #7: At-risk data was stale after initial load
  useEffect(() => {
    if (loading) return;

    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        void loadAtRisk();
      }
    }, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, [loading, loadAtRisk]);

  // Reload leaderboard when metric changes
  useEffect(() => {
    if (!loading) {
      void (async () => {
        await loadLeaderboard();
      })();
    }
  }, [metric, loadLeaderboard, loading]);

  // Handle leave group
  const handleLeaveClick = () => {
    if (!group) return;
    if (group.my_role === "owner") {
      alert("Owners must delete the group or transfer ownership first.");
      return;
    }
    setShowLeaveModal(true);
  };

  const handleLeaveConfirm = async () => {
    if (!group) return;

    setLeaving(true);
    const success = await leaveGroup(group.id);
    setLeaving(false);
    setShowLeaveModal(false);

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
              {/* Invite button - visible to owners and admins */}
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                    "min-h-[44px] sm:min-h-0", // Touch target compliance
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:opacity-90 transition-opacity"
                  )}
                >
                  <UserPlus size={14} />
                  <span>Invite</span>
                </button>
              )}

              {/* Settings button - visible only to owner */}
              {group.my_role === "owner" && (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-lg",
                    "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-2",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]",
                    "border border-[var(--border-subtle)]",
                    "transition-colors duration-150"
                  )}
                  aria-label="Group settings"
                >
                  <Settings size={16} className="text-[var(--text-muted)]" />
                </button>
              )}

              {/* Leave button - visible to non-owners */}
              {group.my_role !== "owner" && (
                <button
                  onClick={handleLeaveClick}
                  disabled={leaving}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm",
                    "min-h-[44px] sm:min-h-0", // Touch target compliance
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
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
                <p className="text-xs text-[var(--text-muted)] uppercase">Members</p>
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
                <p className="text-xs text-[var(--text-muted)] uppercase">Total XP</p>
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
                <p className="text-xs text-[var(--text-muted)] uppercase">Your Week</p>
              </div>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Weekly Awards Display */}
      {awards && (
        <WeeklyAwardsDisplay
          awards={awards}
          currentUserId={currentUserId ?? undefined}
        />
      )}

      {/* Current Challenge */}
      {challengeLoading ? (
        <GroupChallengeCardSkeleton />
      ) : (
        <GroupChallengeCard
          challenge={challenge}
          progressPercentage={challengeProgress}
        />
      )}

      {/* At-Risk Members (Accountability) */}
      {atRiskMembers.length > 0 && (
        <AtRiskMembersPanel
          groupId={groupId}
          members={atRiskMembers}
          onNudgeSent={loadAtRisk}
        />
      )}

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
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Group Confirmation Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLeaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full max-w-sm p-6 rounded-2xl",
                "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                "shadow-xl"
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-full bg-red-500/10">
                  <LogOut size={20} className="text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Leave Group?
                </h3>
              </div>

              <p className="text-sm text-[var(--text-muted)] mb-6">
                Are you sure you want to leave <strong className="text-[var(--text-secondary)]">{group?.name}</strong>?
                You&apos;ll need a new invite to rejoin.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  disabled={leaving}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium",
                    "min-h-[44px] sm:min-h-0", // Touch target compliance
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors",
                    "disabled:opacity-50"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveConfirm}
                  disabled={leaving}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium",
                    "min-h-[44px] sm:min-h-0", // Touch target compliance
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "bg-red-500 text-white",
                    "hover:bg-red-600 transition-colors",
                    "disabled:opacity-50"
                  )}
                >
                  {leaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    "Leave Group"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Settings Modal - Owner only */}
      {group && (
        <GroupSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          group={{
            id: group.id,
            name: group.name,
            description: group.description,
          }}
          onDeleted={() => router.push("/groups")}
          onTransferOwnership={() => {
            setShowSettingsModal(false);
            setShowTransferModal(true);
          }}
        />
      )}

      {/* Invite Members Modal - Owner/Admin */}
      {group && (
        <InviteMembersModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          group={{
            id: group.id,
            name: group.name,
            invite_code: group.invite_code,
          }}
          memberUserIds={members.map((m) => m.user_id)}
        />
      )}

      {/* Transfer Ownership Modal - Owner only */}
      {group && currentUserId && (
        <TransferOwnershipModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          group={{
            id: group.id,
            name: group.name,
          }}
          members={members.map((m) => ({
            user_id: m.user_id,
            display_name: m.display_name,
            level: m.level,
            role: m.role,
          }))}
          currentUserId={currentUserId}
          onTransferred={() => {
            // Reload group data after transfer
            loadGroup();
          }}
        />
      )}
    </div>
  );
}
