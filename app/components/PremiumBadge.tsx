"use client";

// =============================================================================
// PREMIUM BADGE COMPONENT
// Displays a "Pro" badge to indicate premium features.
// Follows the StreakBadge pattern with gold/highlight color theme.
// =============================================================================

import { Crown } from "lucide-react";
import { cn } from "@/app/lib/cn";

type Props = {
  /** Display variant: inline (text), chip (pill badge), icon-only */
  variant?: "inline" | "chip" | "icon-only";
  /** Size: sm for compact, md for standard */
  size?: "sm" | "md";
  /** Additional CSS classes */
  className?: string;
  /** Click handler (e.g., to open upgrade modal) */
  onClick?: () => void;
};

export default function PremiumBadge({
  variant = "chip",
  size = "md",
  className,
  onClick,
}: Props) {
  const sizeClasses = {
    sm: { icon: 12, text: "text-[10px]", padding: "px-1.5 py-0.5" },
    md: { icon: 14, text: "text-xs", padding: "px-2 py-1" },
  };

  const { icon: iconSize, text: textClass, padding } = sizeClasses[size];

  // Base interactive styles
  const interactiveClasses = onClick
    ? cn(
        "cursor-pointer",
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
        "active:scale-[0.97] transition-all duration-100",
        "focus-visible:outline-2 focus-visible:outline-[var(--accent-highlight)]"
      )
    : "";

  // Icon-only variant
  if (variant === "icon-only") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label="Premium feature"
        className={cn(
          "flex items-center justify-center rounded-md",
          onClick ? "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" : "",
          "p-1.5 bg-[var(--accent-highlight)]/10",
          interactiveClasses,
          className
        )}
      >
        <Crown
          size={iconSize}
          className="text-[var(--accent-highlight)]"
          fill="currentColor"
        />
      </button>
    );
  }

  // Inline variant (text-style)
  if (variant === "inline") {
    return (
      <span
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
        className={cn(
          "inline-flex items-center gap-1",
          "font-medium",
          textClass,
          "text-[var(--accent-highlight)]",
          interactiveClasses,
          className
        )}
      >
        <Crown size={iconSize} fill="currentColor" />
        <span>Pro</span>
      </span>
    );
  }

  // Chip variant (default) - pill badge
  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full",
        padding,
        "bg-[var(--accent-highlight)]/10 border border-[var(--accent-highlight)]/20",
        "font-medium",
        textClass,
        "text-[var(--accent-highlight)]",
        interactiveClasses,
        className
      )}
    >
      <Crown size={iconSize} fill="currentColor" />
      <span>Pro</span>
    </span>
  );
}
