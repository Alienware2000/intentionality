"use client";

// =============================================================================
// GLOW CARD COMPONENT
// Glassmorphism card with configurable glow color and hover interactions.
// Provides consistent elevated card styling across the app.
// =============================================================================

import { ReactNode, forwardRef } from "react";
import { motion, HTMLMotionProps, useReducedMotion } from "framer-motion";
import { cn } from "@/app/lib/cn";

// Glow color presets matching the design system
type GlowColor = "primary" | "success" | "streak" | "highlight" | "none";

type GlowCardProps = {
  children: ReactNode;
  /** Glow color on hover/active */
  glowColor?: GlowColor;
  /** Enable glassmorphism backdrop blur */
  glass?: boolean;
  /** Enable gradient border */
  gradientBorder?: boolean;
  /** Enable hover scale micro-interaction */
  hoverScale?: boolean;
  /** Enable hover lift with shadow */
  hoverLift?: boolean;
  /** Custom className */
  className?: string;
  /** Make card interactive (shows pointer cursor) */
  interactive?: boolean;
  /** Always show glow (not just on hover) */
  glowAlways?: boolean;
  /** Glow intensity (0-1) */
  glowIntensity?: number;
  /** Click handler */
  onClick?: () => void;
} & Omit<HTMLMotionProps<"div">, "children" | "className" | "onClick">;

// Border colors for semantic meaning
const borderColors: Record<GlowColor, string> = {
  primary: "border-[var(--accent-primary)]/20",
  success: "border-[var(--accent-success)]/20",
  streak: "border-[var(--accent-streak)]/20",
  highlight: "border-[var(--accent-highlight)]/20",
  none: "border-[var(--border-subtle)]",
};

/**
 * GlowCard is a styled card component with glassmorphism and glow effects.
 * Supports hover interactions and can be used as a button when onClick is provided.
 *
 * @example
 * // Basic usage
 * <GlowCard glowColor="primary">
 *   <StatContent />
 * </GlowCard>
 *
 * @example
 * // Interactive card with glass effect
 * <GlowCard
 *   glowColor="success"
 *   glass
 *   hoverScale
 *   onClick={handleClick}
 * >
 *   <CardContent />
 * </GlowCard>
 */
const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(
  (
    {
      children,
      glowColor = "none",
      glass = false,
      gradientBorder = false,
      hoverScale = false,
      hoverLift = false,
      className,
      interactive = false,
      glowAlways = false,
      glowIntensity = 1,
      onClick,
      ...motionProps
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const isInteractive = interactive || !!onClick;

    // Determine if we should use motion effects
    const shouldAnimate = !prefersReducedMotion && (hoverScale || hoverLift);

    return (
      <motion.div
        ref={ref}
        onClick={onClick}
        whileHover={
          shouldAnimate
            ? {
                scale: hoverScale ? 1.02 : 1,
                y: hoverLift ? -2 : 0,
              }
            : undefined
        }
        whileTap={
          shouldAnimate && isInteractive
            ? {
                scale: 0.98,
              }
            : undefined
        }
        transition={{
          duration: 0.2,
          ease: "easeOut",
        }}
        className={cn(
          // Base card styles
          "relative rounded-xl p-4",
          "bg-[var(--bg-card)]",
          "border",
          borderColors[glowColor],

          // Glassmorphism
          glass && "backdrop-blur-md bg-[var(--bg-card)]/80",

          // Gradient border effect
          gradientBorder && glowColor !== "none" && "border-gradient",

          // Hover background
          "hover:bg-[var(--bg-hover)]",

          // Transitions
          "transition-all duration-200",

          // Interactive cursor
          isInteractive && "cursor-pointer",

          className
        )}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
);

GlowCard.displayName = "GlowCard";

export default GlowCard;

/**
 * GlowCardHeader provides consistent header styling for GlowCard.
 */
export function GlowCardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between mb-3", className)}>
      {children}
    </div>
  );
}

/**
 * GlowCardIcon provides an icon container with background matching the glow color.
 */
export function GlowCardIcon({
  children,
  color = "primary",
  className,
}: {
  children: ReactNode;
  color?: GlowColor;
  className?: string;
}) {
  const bgColors: Record<GlowColor, string> = {
    primary: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
    success: "bg-[var(--accent-success)]/10 text-[var(--accent-success)]",
    streak: "bg-[var(--accent-streak)]/10 text-[var(--accent-streak)]",
    highlight: "bg-[var(--accent-highlight)]/10 text-[var(--accent-highlight)]",
    none: "bg-[var(--bg-elevated)] text-[var(--text-muted)]",
  };

  return (
    <div className={cn("p-2.5 rounded-lg", bgColors[color], className)}>
      {children}
    </div>
  );
}

/**
 * GlowCardValue provides styled value display with monospace font.
 */
export function GlowCardValue({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-mono text-2xl font-bold text-[var(--text-primary)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * GlowCardLabel provides styled label for card values.
 */
export function GlowCardLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide",
        className
      )}
    >
      {children}
    </div>
  );
}
