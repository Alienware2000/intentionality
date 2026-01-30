"use client";

// =============================================================================
// NOTIFICATION CENTER COMPONENT
// Dropdown panel showing all notifications with mark-all-read functionality.
// =============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, X } from "lucide-react";
import { useRef, useEffect } from "react";
import { cn } from "@/app/lib/cn";
import NotificationItem from "./NotificationItem";
import type { NotificationWithSender } from "@/app/lib/types";

type NotificationCenterProps = {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Handler to close the panel */
  onClose: () => void;
  /** List of notifications to display */
  notifications: NotificationWithSender[];
  /** Handler for marking a notification as read */
  onMarkRead: (notificationId: string) => Promise<boolean>;
  /** Handler for marking all notifications as read */
  onMarkAllRead: () => Promise<boolean>;
  /** Handler for accepting friend request */
  onAcceptFriend: (friendshipId: string) => Promise<boolean>;
  /** Handler for rejecting friend request */
  onRejectFriend: (friendshipId: string) => Promise<boolean>;
  /** Handler for removing a notification from the list (used after friend request actions) */
  onRemoveNotification: (notificationId: string) => void;
  /** Position anchor (for positioning relative to bell icon) */
  anchorPosition?: "left" | "right";
};

/**
 * NotificationCenter displays a dropdown panel with all notifications.
 * Includes header with mark-all-read, scrollable list, and empty state.
 */
export default function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onAcceptFriend,
  onRejectFriend,
  onRemoveNotification,
  anchorPosition = "right",
}: NotificationCenterProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleMarkAllRead = async () => {
    await onMarkAllRead();
  };

  // Limit to 20 notifications in the dropdown
  const displayedNotifications = notifications.slice(0, 20);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "z-50 max-h-[480px] flex flex-col",
            "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
            "rounded-xl shadow-xl overflow-hidden",
            // Mobile: fixed position, centered with margins
            "fixed inset-x-4 top-16 w-auto",
            // Desktop: absolute position, anchored to bell
            "sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-80",
            anchorPosition === "right" ? "sm:right-0" : "sm:left-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="font-semibold text-[var(--text-primary)]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                    "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-elevated)] transition-colors"
                  )}
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className={cn(
                  "p-1 rounded-md",
                  "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  "hover:bg-[var(--bg-elevated)] transition-colors"
                )}
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {displayedNotifications.length > 0 ? (
              <div className="p-2">
                <AnimatePresence mode="popLayout">
                  {displayedNotifications.map((notification, index) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={onMarkRead}
                      onAcceptFriend={onAcceptFriend}
                      onRejectFriend={onRejectFriend}
                      onRemoveNotification={onRemoveNotification}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Footer - show if there are more notifications */}
          {notifications.length > 20 && (
            <div className="px-4 py-2 border-t border-[var(--border-subtle)] text-center">
              <a
                href="/friends"
                className={cn(
                  "text-xs text-[var(--accent-primary)]",
                  "hover:text-[var(--accent-primary-hover)] transition-colors"
                )}
              >
                View all {notifications.length} notifications
              </a>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Empty state for no notifications.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 rounded-full bg-[var(--bg-elevated)] mb-3">
        <Bell size={24} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)] font-medium">No notifications yet</p>
      <p className="text-xs text-[var(--text-muted)] mt-1 text-center">
        When friends interact with you, notifications will appear here
      </p>
    </div>
  );
}
