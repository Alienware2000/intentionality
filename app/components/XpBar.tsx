"use client";

// =============================================================================
// XP BAR COMPONENT
// Displays XP progress with level indicator.
// anime.js inspired: red gradient fill on black track.
// =============================================================================

import { motion } from "framer-motion";
import { cn } from "@/app/lib/cn";
import { getLevelProgress } from "@/app/lib/gamification";

type Props = {
  totalXp: number;
  showLevel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
};

export default function XpBar({
  totalXp,
  showLevel = true,
  size = "md",
  className,
  animate = true,
}: Props) {
  const { currentLevel, currentLevelXp, nextLevelXp, progress } =
    getLevelProgress(totalXp);

  const isNearLevelUp = progress >= 80;

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLevel && (
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs font-mono text-[var(--text-secondary)]">
            LVL {currentLevel}
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {currentLevelXp} / {nextLevelXp} XP
          </span>
        </div>
      )}

      <div
        className={cn(
          "w-full rounded-full bg-[var(--bg-card)] overflow-hidden",
          sizeClasses[size]
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            "bg-gradient-to-r from-[var(--accent-primary)] to-red-400",
            isNearLevelUp && "animate-pulse-glow"
          )}
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
