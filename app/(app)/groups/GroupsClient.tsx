"use client";

// =============================================================================
// GROUPS CLIENT COMPONENT
// Interactive groups management with create and join functionality.
// Features smooth animations and responsive design.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Key,
  Trophy,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useSocial } from "@/app/components/SocialProvider";
import {
  GroupCard,
  GroupCardSkeleton,
  GroupInvitationCard,
  GroupInvitationCardSkeleton,
} from "@/app/components/social";
import GlowCard from "@/app/components/ui/GlowCard";
import { useToast } from "@/app/components/Toast";

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

// -----------------------------------------------------------------------------
// Create Group Modal Component
// -----------------------------------------------------------------------------

type CreateGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => Promise<boolean>;
};

function CreateGroupModal({ isOpen, onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    setError(null);

    const success = await onCreate(name.trim(), description.trim() || undefined);

    setIsCreating(false);
    if (success) {
      setName("");
      setDescription("");
      onClose();
    } else {
      setError("Failed to create group. Please try again.");
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Create Group
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X size={18} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Study Buddies"
                    autoFocus
                    maxLength={50}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Description <span className="text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this group about?"
                    rows={3}
                    maxLength={200}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl resize-none",
                      "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                    )}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={!name.trim() || isCreating}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                    "bg-[var(--accent-primary)] text-white font-medium",
                    "hover:opacity-90 transition-opacity",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isCreating ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  {isCreating ? "Creating..." : "Create Group"}
                </button>
              </form>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <p className="text-xs text-[var(--text-muted)] text-center">
                  You&apos;ll be the owner of this group and can invite others.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// -----------------------------------------------------------------------------
// Join Group Modal Component
// -----------------------------------------------------------------------------

type JoinGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<boolean>;
};

function JoinGroupModal({ isOpen, onClose, onJoin }: JoinGroupModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsJoining(true);
    setError(null);

    const result = await onJoin(inviteCode.trim().toUpperCase());

    setIsJoining(false);
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        setInviteCode("");
        setSuccess(false);
        onClose();
      }, 1000);
    } else {
      setError("Invalid invite code or group is full.");
    }
  };

  const handleClose = () => {
    setInviteCode("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Join Group
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X size={18} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character code"
                    autoFocus
                    maxLength={8}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl text-center font-mono text-lg tracking-widest",
                      "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30",
                      "uppercase"
                    )}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2 text-[var(--accent-success)]"
                  >
                    <Check size={18} />
                    <span className="font-medium">Joined successfully!</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={inviteCode.length < 8 || isJoining || success}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                    "bg-[var(--accent-primary)] text-white font-medium",
                    "hover:opacity-90 transition-opacity",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isJoining ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Key size={18} />
                  )}
                  {isJoining ? "Joining..." : "Join Group"}
                </button>
              </form>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <p className="text-xs text-[var(--text-muted)] text-center">
                  Ask a group owner or admin for their invite code.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// -----------------------------------------------------------------------------
// Empty State Component
// -----------------------------------------------------------------------------

function NoGroupsMessage() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex p-4 rounded-full bg-[var(--bg-elevated)] mb-4">
        <Users size={32} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)] font-medium">No groups yet</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Create a group or join one with an invite code.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Stats Card Component
// -----------------------------------------------------------------------------

function GroupsStatsCard({
  groupCount,
  totalMembers,
  totalXp,
}: {
  groupCount: number;
  totalMembers: number;
  totalXp: number;
}) {
  return (
    <GlowCard glowColor="primary" className="relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--accent-streak)] rounded-full blur-2xl" />
      </div>

      <div className="relative flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10">
            <Users size={24} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
              {groupCount}
            </p>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Groups
            </p>
          </div>
        </div>

        {totalMembers > 0 && (
          <div className="flex items-center gap-3 pl-6 border-l border-[var(--border-subtle)]">
            <div className="p-3 rounded-xl bg-[var(--accent-highlight)]/10">
              <Users size={24} className="text-[var(--accent-highlight)]" />
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {totalMembers}
              </p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Total Members
              </p>
            </div>
          </div>
        )}

        {totalXp > 0 && (
          <div className="flex items-center gap-3 pl-6 border-l border-[var(--border-subtle)]">
            <div className="p-3 rounded-xl bg-[var(--accent-streak)]/10">
              <Trophy size={24} className="text-[var(--accent-streak)]" />
            </div>
            <div>
              <p className="text-2xl font-mono font-bold text-[var(--accent-streak)]">
                {totalXp.toLocaleString()}
              </p>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Combined XP
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

export default function GroupsClient() {
  const router = useRouter();
  const {
    groups,
    groupInvitations,
    groupInvitationsLoading,
    createGroup,
    joinGroup,
    groupsLoading,
    respondToGroupInvitation,
  } = useSocial();
  const { showToast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Note: SocialProvider handles initial data fetching - no need to refresh on mount

  // Calculate stats
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);
  const totalXp = groups.reduce((sum, g) => sum + g.total_xp, 0);

  // Handle create
  const handleCreate = async (name: string, description?: string) => {
    const group = await createGroup(name, description);
    return group !== null;
  };

  // Handle join
  const handleJoin = async (inviteCode: string) => {
    return await joinGroup(inviteCode);
  };

  // Navigate to group detail
  const handleGroupClick = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  // Handle accept invitation
  const handleAcceptInvitation = async (invitationId: string) => {
    const success = await respondToGroupInvitation(invitationId, true);
    if (success) {
      showToast({ message: "Joined group!", type: "success" });
    } else {
      showToast({ message: "Failed to join group", type: "error" });
    }
    return success;
  };

  // Handle decline invitation
  const handleDeclineInvitation = async (invitationId: string) => {
    const success = await respondToGroupInvitation(invitationId, false);
    if (success) {
      showToast({ message: "Invitation declined", type: "success" });
    } else {
      showToast({ message: "Failed to decline invitation", type: "error" });
    }
    return success;
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <GroupsStatsCard
        groupCount={groups.length}
        totalMembers={totalMembers}
        totalXp={totalXp}
      />

      {/* Pending Invitations Section */}
      {(groupInvitationsLoading || groupInvitations.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Pending Invitations
          </h2>
          <AnimatePresence mode="popLayout">
            {groupInvitationsLoading ? (
              <motion.div
                key="invitations-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <GroupInvitationCardSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="invitations-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {groupInvitations.map((invitation, index) => (
                  <GroupInvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onAccept={handleAcceptInvitation}
                    onDecline={handleDeclineInvitation}
                    index={index}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Header with Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
          My Groups
        </h2>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsJoinModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-[var(--bg-card)] text-[var(--text-secondary)]",
              "border border-[var(--border-subtle)]",
              "hover:bg-[var(--bg-hover)] transition-colors"
            )}
          >
            <Key size={16} />
            <span className="hidden sm:inline font-medium">Join</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCreateModalOpen(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-[var(--accent-primary)] text-white",
              "shadow-lg shadow-[var(--accent-primary)]/20",
              "hover:opacity-90 transition-opacity"
            )}
          >
            <Plus size={16} />
            <span className="hidden sm:inline font-medium">Create</span>
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {groupsLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3].map((i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </motion.div>
        ) : groups.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlowCard glowColor="none">
              <NoGroupsMessage />
            </GlowCard>
          </motion.div>
        ) : (
          <motion.div
            key="groups"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {groups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={() => handleGroupClick(group.id)}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
      />
      <JoinGroupModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={handleJoin}
      />
    </div>
  );
}
