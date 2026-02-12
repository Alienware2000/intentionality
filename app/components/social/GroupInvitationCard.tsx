"use client";

// =============================================================================
// GROUP INVITATION CARD COMPONENT
// Displays a pending group invitation with accept/decline actions.
// =============================================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Check, X, Loader2, Clock } from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { GroupInvitationWithDetails } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GroupInvitationCardProps = {
  /** The invitation data */
  invitation: GroupInvitationWithDetails;
  /** Callback when invitation is accepted */
  onAccept: (invitationId: string) => Promise<boolean>;
  /** Callback when invitation is declined */
  onDecline: (invitationId: string) => Promise<boolean>;
  /** Animation index for staggered animations */
  index?: number;
};

// Animation variants
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.2,
      ease: "easeOut" as const,
    },
  }),
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.15 },
  },
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * GroupInvitationCard displays a pending group invitation.
 *
 * @example
 * <GroupInvitationCard
 *   invitation={invitation}
 *   onAccept={handleAccept}
 *   onDecline={handleDecline}
 * />
 */
export default function GroupInvitationCard({
  invitation,
  onAccept,
  onDecline,
  index = 0,
}: GroupInvitationCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  const handleAccept = async () => {
    setIsAccepting(true);
    const success = await onAccept(invitation.id);
    if (success) {
      setResponded("accepted");
    }
    setIsAccepting(false);
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    const success = await onDecline(invitation.id);
    if (success) {
      setResponded("declined");
    }
    setIsDeclining(false);
  };

  const isLoading = isAccepting || isDeclining;

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Already responded - show success state briefly before removal
  if (responded) {
    return (
      <motion.div
        variants={itemVariants}
        initial="visible"
        exit="exit"
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-4 rounded-xl",
          "bg-[var(--bg-card)] border",
          responded === "accepted"
            ? "border-[var(--accent-success)]/30 text-[var(--accent-success)]"
            : "border-[var(--border-subtle)] text-[var(--text-muted)]"
        )}
      >
        {responded === "accepted" ? (
          <>
            <Check size={16} />
            <span className="text-sm font-medium">
              Joined {invitation.group_name}
            </span>
          </>
        ) : (
          <>
            <X size={16} />
            <span className="text-sm font-medium">Declined</span>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      className={cn(
        "flex flex-col gap-4 px-4 py-4 rounded-xl",
        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
        "hover:border-[var(--accent-primary)]/30 transition-colors"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Group Icon */}
        <div className="p-2.5 rounded-full bg-[var(--accent-primary)]/10 shrink-0">
          <Users size={18} className="text-[var(--accent-primary)]" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[var(--text-primary)] truncate">
            {invitation.group_name}
          </p>
          {invitation.group_description && (
            <p className="text-sm text-[var(--text-muted)] line-clamp-2 mt-0.5">
              {invitation.group_description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {invitation.group_member_count} members
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatRelativeTime(invitation.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Inviter */}
      <div className="text-sm text-[var(--text-muted)]">
        Invited by{" "}
        <span className="font-medium text-[var(--text-secondary)]">
          {invitation.inviter_display_name || "Someone"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecline}
          disabled={isLoading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium",
            "min-h-[44px]",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
            "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] transition-colors",
            "disabled:opacity-50"
          )}
        >
          {isDeclining ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <X size={16} />
          )}
          Decline
        </button>
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium",
            "min-h-[44px]",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
            "bg-[var(--accent-primary)] text-white",
            "hover:opacity-90 transition-opacity",
            "disabled:opacity-50"
          )}
        >
          {isAccepting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          Accept
        </button>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Skeleton
// -----------------------------------------------------------------------------

export function GroupInvitationCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--skeleton-bg)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-[var(--skeleton-bg)]" />
          <div className="h-3 w-48 rounded bg-[var(--skeleton-bg)]" />
        </div>
      </div>
      <div className="h-3 w-24 rounded bg-[var(--skeleton-bg)]" />
      <div className="flex gap-2">
        <div className="flex-1 h-11 rounded-xl bg-[var(--skeleton-bg)]" />
        <div className="flex-1 h-11 rounded-xl bg-[var(--skeleton-bg)]" />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Empty State
// -----------------------------------------------------------------------------

export function NoInvitationsMessage() {
  return (
    <div className="text-center py-8 text-[var(--text-muted)]">
      <Users size={32} className="mx-auto mb-2 opacity-50" />
      <p className="text-sm">No pending invitations</p>
    </div>
  );
}
