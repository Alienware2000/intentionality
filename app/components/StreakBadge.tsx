"use client";

// =============================================================================
// STREAK BADGE COMPONENT
// Displays streak count with fire icon.
// anime.js inspired: orange glow effect.
// =============================================================================

import { Flame } from "lucide-react";
import { cn } from "@/app/lib/cn";

type Props = {
  streak: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export default function StreakBadge({
  streak,
  size = "md",
  showLabel = true,
  className,
}: Props) {
  const isActive = streak > 0;

  const sizeClasses = {
    sm: { icon: 14, text: "text-xs" },
    md: { icon: 18, text: "text-sm" },
    lg: { icon: 24, text: "text-base" },
  };

  const { icon: iconSize, text: textClass } = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        isActive && "glow-orange",
        "px-2 py-1 rounded-md",
        className
      )}
    >
      <Flame
        size={iconSize}
        className={cn(
          isActive ? "text-[var(--accent-streak)]" : "text-[var(--text-muted)]"
        )}
        fill={isActive ? "currentColor" : "none"}
      />
      <span
        className={cn(
          "font-mono font-bold",
          textClass,
          isActive ? "text-[var(--accent-streak)]" : "text-[var(--text-muted)]"
        )}
      >
        {streak}
      </span>
      {showLabel && (
        <span className={cn("text-[var(--text-muted)]", textClass)}>
          {streak === 1 ? "day" : "days"}
        </span>
      )}
    </div>
  );
}
