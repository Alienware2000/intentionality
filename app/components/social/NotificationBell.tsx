"use client";

// =============================================================================
// NOTIFICATION BELL COMPONENT
// Bell icon button with unread count badge and animation.
// =============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/app/lib/cn";

type NotificationBellProps = {
  /** Number of unread notifications */
  unreadCount: number;
  /** Handler for clicking the bell */
  onClick: () => void;
  /** Whether the notification panel is open */
  isOpen?: boolean;
  /** Additional class names */
  className?: string;
};

/**
 * NotificationBell displays a bell icon with unread count badge.
 * Animates when new notifications arrive.
 */
export default function NotificationBell({
  unreadCount,
  onClick,
  isOpen = false,
  className,
}: NotificationBellProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prevCountRef = useRef(unreadCount);

  // Animate when unread count increases
  // Using useLayoutEffect + queueMicrotask to avoid cascading render warnings
  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (unreadCount > prevCountRef.current) {
      // Defer state update to avoid synchronous setState in effect warning
      queueMicrotask(() => {
        setShouldAnimate(true);
      });
      timer = setTimeout(() => setShouldAnimate(false), 500);
    }
    prevCountRef.current = unreadCount;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [unreadCount]);

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative p-2 rounded-lg transition-colors duration-150",
        "hover:bg-[var(--bg-elevated)]",
        isOpen && "bg-[var(--bg-elevated)]",
        className
      )}
      animate={shouldAnimate ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
      transition={{ duration: 0.5 }}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell
        size={20}
        className={cn(
          "transition-colors",
          unreadCount > 0 ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
        )}
      />

      {/* Unread count badge */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={cn(
              "absolute -top-0.5 -right-0.5",
              "min-w-[18px] h-[18px] px-1",
              "flex items-center justify-center",
              "bg-red-500 text-white",
              "text-[10px] font-bold rounded-full",
              "border-2 border-[var(--bg-card)]"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
