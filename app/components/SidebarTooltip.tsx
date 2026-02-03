"use client";

// =============================================================================
// SIDEBAR TOOLTIP
// Simple tooltip component for collapsed sidebar navigation items.
// Appears on hover to the right of the icon.
// =============================================================================

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/app/lib/cn";

type Props = {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Additional content like keyboard shortcuts */
  shortcut?: string;
};

export default function SidebarTooltip({ label, children, className, shortcut }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotionHook = useReducedMotion();

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleMouseEnter() {
    // Small delay before showing tooltip to prevent flicker
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 100);
  }

  function handleMouseLeave() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={prefersReducedMotionHook ? { opacity: 1 } : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotionHook ? { opacity: 0 } : { opacity: 0, x: -4 }}
            transition={{ duration: prefersReducedMotionHook ? 0 : 0.15, ease: "easeOut" }}
            className={cn(
              "absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50",
              "px-2.5 py-1.5 rounded-md",
              "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
              "shadow-lg",
              "whitespace-nowrap",
              "pointer-events-none"
            )}
          >
            <span className="text-sm text-[var(--text-primary)]">{label}</span>
            {shortcut && (
              <span className="ml-2 text-xs text-[var(--text-muted)]">{shortcut}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
