"use client";

// =============================================================================
// HELP TOOLTIP COMPONENT
// Reusable contextual help tooltips for UI elements.
// Shows helpful information on hover with a consistent style.
// =============================================================================

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { cn } from "@/app/lib/cn";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type TooltipPosition = "top" | "bottom" | "left" | "right";

type Props = {
  /** The content to show in the tooltip */
  content: ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Custom trigger element (defaults to help icon) */
  children?: ReactNode;
  /** Additional classes for the trigger wrapper */
  className?: string;
  /** Whether to show the help icon (when children not provided) */
  showIcon?: boolean;
  /** Icon size */
  iconSize?: number;
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Max width of tooltip */
  maxWidth?: number;
};

// -----------------------------------------------------------------------------
// Position calculations
// -----------------------------------------------------------------------------

const TOOLTIP_OFFSET = 8;

function getPositionStyles(position: TooltipPosition) {
  switch (position) {
    case "top":
      return {
        bottom: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginBottom: TOOLTIP_OFFSET,
      };
    case "bottom":
      return {
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        marginTop: TOOLTIP_OFFSET,
      };
    case "left":
      return {
        right: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        marginRight: TOOLTIP_OFFSET,
      };
    case "right":
      return {
        left: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        marginLeft: TOOLTIP_OFFSET,
      };
  }
}

function getAnimationVariants(position: TooltipPosition) {
  const offset = 4;
  switch (position) {
    case "top":
      return { initial: { y: offset }, animate: { y: 0 } };
    case "bottom":
      return { initial: { y: -offset }, animate: { y: 0 } };
    case "left":
      return { initial: { x: offset }, animate: { x: 0 } };
    case "right":
      return { initial: { x: -offset }, animate: { x: 0 } };
  }
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * HelpTooltip displays contextual help on hover.
 * Use for explaining features, XP values, or other key concepts.
 */
export default function HelpTooltip({
  content,
  position = "top",
  children,
  className,
  showIcon = true,
  iconSize = 14,
  delay = 200,
  maxWidth = 240,
}: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positionStyles = getPositionStyles(position);
  const animationVariants = getAnimationVariants(position);

  return (
    <div
      ref={triggerRef}
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {/* Trigger */}
      {children ?? (
        showIcon && (
          <button
            type="button"
            className="p-0.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            aria-label="Help"
          >
            <HelpCircle size={iconSize} />
          </button>
        )
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, ...animationVariants.initial }}
            animate={{ opacity: 1, ...animationVariants.animate }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 pointer-events-none"
            style={positionStyles}
          >
            <div
              className={cn(
                "px-3 py-2 rounded-lg shadow-lg",
                "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                "text-xs text-[var(--text-secondary)] leading-relaxed"
              )}
              style={{ maxWidth }}
            >
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Preset Tooltips
// -----------------------------------------------------------------------------

/**
 * Preset tooltip for explaining XP values by priority.
 */
export function XpTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      className={className}
      position="top"
      content={
        <div className="space-y-1">
          <p className="font-medium text-[var(--text-primary)]">Task XP</p>
          <p>All tasks earn <span className="text-[var(--accent-highlight)] font-medium">15 XP</span> when completed.</p>
          <p className="text-[var(--text-muted)] text-xs">Priority helps you organize, but doesn&apos;t affect XP.</p>
        </div>
      }
    />
  );
}

/**
 * Preset tooltip for explaining quests.
 */
export function QuestTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      className={className}
      position="top"
      content="Quests are your big goals. Each quest contains related tasks, helping you organize work by project or objective."
    />
  );
}

/**
 * Preset tooltip for explaining streaks.
 */
export function StreakTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      className={className}
      position="top"
      content={
        <div className="space-y-1">
          <p className="font-medium text-[var(--text-primary)]">Streak Bonus</p>
          <p>Complete at least one task daily to build your streak. Longer streaks earn XP multipliers!</p>
          <div className="mt-1.5 space-y-0.5 text-[10px]">
            <p>3+ days: +5% XP</p>
            <p>7+ days: +10% XP</p>
            <p>14+ days: +15% XP</p>
          </div>
        </div>
      }
    />
  );
}

/**
 * Preset tooltip for explaining brain dump.
 */
export function BrainDumpTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      className={className}
      position="top"
      content={
        <div className="space-y-1">
          <p className="font-medium text-[var(--text-primary)]">Brain Dump</p>
          <p>Quickly capture thoughts without breaking your flow. Press <kbd className="px-1 py-0.5 rounded bg-[var(--bg-card)] font-mono text-[10px]">Ctrl+K</kbd> anytime.</p>
          <p className="text-[var(--text-muted)]">Process them later in your Inbox.</p>
        </div>
      }
    />
  );
}

/**
 * Preset tooltip for explaining the XP bar.
 */
export function XpBarTooltip({ className }: { className?: string }) {
  return (
    <HelpTooltip
      className={className}
      position="right"
      content={
        <div className="space-y-1">
          <p className="font-medium text-[var(--text-primary)]">Level Up!</p>
          <p>Earn XP by completing tasks, habits, and focus sessions. Each level unlocks new titles and features.</p>
        </div>
      }
    />
  );
}
