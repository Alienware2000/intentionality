"use client";

// =============================================================================
// XP BAR COMPONENT
// Displays XP progress with level indicator.
// Premium accent-aware design with spring fill animation and shimmer effects.
// =============================================================================

import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import anime from "animejs";
import { cn } from "@/app/lib/cn";
import { getLevelProgressV2 as getLevelProgress } from "@/app/lib/gamification";

type Props = {
  totalXp: number;
  showLevel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
  /** Show glow effect when near level up */
  glowOnNearLevelUp?: boolean;
};

export default function XpBar({
  totalXp,
  showLevel = true,
  size = "md",
  className,
  animate = true,
  glowOnNearLevelUp = true,
}: Props) {
  const { currentLevel, currentLevelXp, nextLevelXp, progress } =
    getLevelProgress(totalXp);

  const prefersReducedMotionHook = useReducedMotion();
  const levelRef = useRef<HTMLSpanElement>(null);
  const prevLevelRef = useRef(currentLevel);
  const [showShimmer, setShowShimmer] = useState(false);

  const isNearLevelUp = progress >= 80;

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  // Level number pop animation when level changes
  useEffect(() => {
    if (currentLevel !== prevLevelRef.current && levelRef.current && !prefersReducedMotionHook) {
      anime({
        targets: levelRef.current,
        scale: [1, 1.3, 1],
        color: [
          "var(--text-secondary)",
          "var(--accent-primary)",
          "var(--text-secondary)",
        ],
        easing: "easeOutBack",
        duration: 500,
      });
    }
    prevLevelRef.current = currentLevel;
  }, [currentLevel, prefersReducedMotionHook]);

  // Show shimmer sweep when near level up
  useEffect(() => {
    if (isNearLevelUp && !showShimmer) {
      queueMicrotask(() => setShowShimmer(true));
    }
  }, [isNearLevelUp, showShimmer]);

  // Spring animation with overshoot for the fill
  const springTransition = {
    type: "spring" as const,
    stiffness: 60,
    damping: 12,
    mass: 0.8,
  };

  return (
    <div className={cn("w-full", className)}>
      {showLevel && (
        <div className="flex items-baseline justify-between mb-1">
          <span
            ref={levelRef}
            className="text-xs font-mono text-[var(--text-secondary)]"
          >
            LVL {currentLevel}
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {currentLevelXp} / {nextLevelXp} XP
          </span>
        </div>
      )}

      <div
        className={cn(
          "w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden relative",
          sizeClasses[size],
          // Add subtle glow when near level up
          isNearLevelUp && glowOnNearLevelUp && "animate-pulse-accent"
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full relative overflow-hidden",
            "bg-gradient-to-r from-[var(--accent-primary)] to-[color-mix(in_srgb,var(--accent-primary)_80%,var(--accent-highlight))]"
          )}
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${progress}%` }}
          transition={prefersReducedMotionHook ? { duration: 0.3 } : springTransition}
        >
          {/* Shimmer sweep effect for near level-up */}
          {isNearLevelUp && !prefersReducedMotionHook && (
            <div className="xp-bar-shimmer" />
          )}
        </motion.div>
      </div>
    </div>
  );
}
