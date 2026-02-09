"use client";

// =============================================================================
// FRIEND REQUEST CARD COMPONENT
// Displays a pending friend request with accept/reject actions.
// =============================================================================

import { motion } from "framer-motion";
import { User, Check, X, Flame, Zap, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/app/lib/cn";
import { useToast } from "@/app/components/Toast";
import GlowCard from "@/app/components/ui/GlowCard";
import type { FriendRequest } from "@/app/lib/types";

type FriendRequestCardProps = {
  /** The friend request data */
  request: FriendRequest;
  /** Handler for accepting the request */
  onAccept: (requestId: string) => Promise<boolean>;
  /** Handler for rejecting the request */
  onReject: (requestId: string) => Promise<boolean>;
  /** Animation index for staggering */
  index?: number;
};

/**
 * FriendRequestCard displays a pending friend request.
 * Shows sender info and accept/reject buttons with loading states.
 *
 * @example
 * <FriendRequestCard
 *   request={request}
 *   onAccept={acceptFriendRequest}
 *   onReject={rejectFriendRequest}
 * />
 */
export default function FriendRequestCard({
  request,
  onAccept,
  onReject,
  index = 0,
}: FriendRequestCardProps) {
  const { showToast } = useToast();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    const success = await onAccept(request.id);
    setIsAccepting(false);
    if (success) {
      setIsDone(true);
      showToast({ message: "Friend request accepted!", type: "success" });
    } else {
      showToast({ message: "Failed to accept request", type: "error" });
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    const success = await onReject(request.id);
    setIsRejecting(false);
    if (success) {
      setIsDone(true);
    } else {
      showToast({ message: "Failed to decline request", type: "error" });
    }
  };

  const isLoading = isAccepting || isRejecting;

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isDone) {
    return null; // Will be removed from list by parent
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.05,
        ease: "easeOut",
      }}
    >
      <GlowCard glowColor="primary" className="relative overflow-hidden">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="p-2.5 rounded-full bg-[var(--accent-primary)]/10 shrink-0">
            <User size={20} className="text-[var(--accent-primary)]" />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">
              {request.from_display_name || "Anonymous"}
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Zap size={10} className="text-[var(--accent-primary)]" />
                Lv.{request.from_level}
              </span>
              {request.from_current_streak > 0 && (
                <span className="flex items-center gap-1">
                  <Flame size={10} className="text-[var(--accent-streak)]" />
                  {request.from_current_streak}d
                </span>
              )}
              <span className="text-[var(--text-muted)]">
                · {formatRelativeTime(request.requested_at)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className={cn(
                "p-2 rounded-lg transition-all duration-150",
                "bg-[var(--accent-success)]/10 text-[var(--accent-success)]",
                "hover:bg-[var(--accent-success)]/20",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label="Accept friend request"
            >
              <Check size={18} />
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className={cn(
                "p-2 rounded-lg transition-all duration-150",
                "bg-red-500/10 text-red-500",
                "hover:bg-red-500/20",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label="Reject friend request"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

/**
 * Empty state for no pending requests.
 */
export function NoRequestsMessage() {
  return (
    <div className="text-center py-8">
      <div className="inline-flex p-4 rounded-full bg-[var(--bg-elevated)] mb-3">
        <User size={24} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)]">No pending friend requests</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        When someone sends you a friend request, it will appear here
      </p>
    </div>
  );
}
