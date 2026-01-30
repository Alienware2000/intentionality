"use client";

// =============================================================================
// NOTIFICATION ITEM COMPONENT
// Displays a single notification with icon, sender info, timestamp, and actions.
// =============================================================================

import { motion } from "framer-motion";
import {
  UserPlus,
  UserCheck,
  Users,
  Sparkles,
  Bell,
  Trophy,
  Flame,
  Zap,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/app/lib/cn";
import type { NotificationWithSender, SocialNotificationType } from "@/app/lib/types";

type NotificationItemProps = {
  /** The notification data */
  notification: NotificationWithSender;
  /** Handler for accepting friend request (for friend_request type) */
  onAcceptFriend?: (friendshipId: string) => Promise<boolean>;
  /** Handler for rejecting friend request (for friend_request type) */
  onRejectFriend?: (friendshipId: string) => Promise<boolean>;
  /** Handler for marking notification as read */
  onMarkRead: (notificationId: string) => Promise<boolean>;
  /** Handler for removing notification from the list (used after friend request actions) */
  onRemoveNotification?: (notificationId: string) => void;
  /** Animation index for staggering */
  index?: number;
};

/** Icon configuration for each notification type */
const NOTIFICATION_ICONS: Record<SocialNotificationType, React.ElementType> = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  group_invite: Users,
  group_joined: Users,
  nudge: Sparkles,
  achievement_shared: Trophy,
  streak_milestone_friend: Flame,
  level_up_friend: Zap,
};

/** Color configuration for each notification type */
const NOTIFICATION_COLORS: Record<SocialNotificationType, string> = {
  friend_request: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
  friend_accepted: "text-[var(--accent-success)] bg-[var(--accent-success)]/10",
  group_invite: "text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10",
  group_joined: "text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10",
  nudge: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
  achievement_shared: "text-amber-500 bg-amber-500/10",
  streak_milestone_friend: "text-[var(--accent-streak)] bg-[var(--accent-streak)]/10",
  level_up_friend: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10",
};

/**
 * Format relative time (e.g., "2 min ago", "1h ago", "3d ago")
 */
function formatRelativeTime(dateStr: string): string {
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
}

/**
 * NotificationItem displays a single notification.
 * Shows icon, sender info, message, timestamp, and action buttons for friend requests.
 */
export default function NotificationItem({
  notification,
  onAcceptFriend,
  onRejectFriend,
  onMarkRead,
  onRemoveNotification,
  index = 0,
}: NotificationItemProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
  const colorClass = NOTIFICATION_COLORS[notification.type] || "text-[var(--text-muted)] bg-[var(--bg-elevated)]";
  const isUnread = !notification.read_at;
  const isLoading = isAccepting || isRejecting;
  const isFriendRequest = notification.type === "friend_request";

  const handleClick = async () => {
    if (isUnread && !isFriendRequest) {
      await onMarkRead(notification.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAcceptFriend || !onRemoveNotification) return;

    // Get friendship_id from metadata
    const friendshipId = notification.metadata?.friendship_id as string | undefined;
    if (!friendshipId) {
      console.warn('Missing friendship_id in notification metadata');
      return;
    }

    setIsAccepting(true);
    await onAcceptFriend(friendshipId);
    setIsAccepting(false);

    // Remove notification regardless of API result
    // If API returns 400, the friendship was already handled elsewhere - still remove the stale notification
    await onMarkRead(notification.id);
    onRemoveNotification(notification.id);
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRejectFriend || !onRemoveNotification) return;

    // Get friendship_id from metadata
    const friendshipId = notification.metadata?.friendship_id as string | undefined;
    if (!friendshipId) {
      console.warn('Missing friendship_id in notification metadata');
      return;
    }

    setIsRejecting(true);
    await onRejectFriend(friendshipId);
    setIsRejecting(false);

    // Remove notification regardless of API result
    // If API returns 400, the friendship was already handled elsewhere - still remove the stale notification
    await onMarkRead(notification.id);
    onRemoveNotification(notification.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        duration: 0.15,
        delay: index * 0.03,
        ease: "easeOut",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-disabled={isLoading}
        className={cn(
          "w-full text-left p-3 rounded-lg transition-colors duration-150 cursor-pointer",
          "hover:bg-[var(--bg-elevated)]",
          isUnread && "bg-[var(--accent-primary)]/5",
          isLoading && "pointer-events-none"
        )}
      >
        <div className="flex items-start gap-3 relative">
          {/* Loading overlay for friend request actions */}
          {isLoading && (
            <div className="absolute inset-0 bg-[var(--bg-card)]/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
              <Loader2 size={20} className="animate-spin text-[var(--accent-primary)]" />
            </div>
          )}

          {/* Icon */}
          <div className={cn("p-2 rounded-full shrink-0", colorClass)}>
            <Icon size={16} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={cn(
                  "text-sm truncate",
                  isUnread ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"
                )}>
                  {notification.title}
                </p>
                {notification.body && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>
                )}
              </div>

              {/* Unread indicator */}
              {isUnread && !isFriendRequest && (
                <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shrink-0 mt-1.5" />
              )}
            </div>

            {/* Sender info and timestamp */}
            <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
              {notification.from_display_name && (
                <span className="flex items-center gap-1">
                  <Zap size={10} className="text-[var(--accent-primary)]" />
                  {notification.from_display_name}
                  {notification.from_level && ` · Lv.${notification.from_level}`}
                </span>
              )}
              <span>· {formatRelativeTime(notification.created_at)}</span>
            </div>

            {/* Friend request action buttons */}
            {isFriendRequest && onAcceptFriend && onRejectFriend && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-[var(--accent-success)]/10 text-[var(--accent-success)]",
                    "hover:bg-[var(--accent-success)]/20 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Check size={14} />
                  Accept
                </button>
                <button
                  onClick={handleReject}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-red-500/10 text-red-500",
                    "hover:bg-red-500/20 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <X size={14} />
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
