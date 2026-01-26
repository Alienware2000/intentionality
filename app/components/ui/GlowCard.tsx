"use client";

// =============================================================================
// GLOW CARD COMPONENT
// Premium glassmorphism card with 3D tilt effect and accent-aware glow colors.
// Iron Man HUD-inspired design with configurable interactions.
// =============================================================================

import { ReactNode, forwardRef, useRef, useCallback } from "react";
import { motion, HTMLMotionProps, useReducedMotion } from "framer-motion";
import { cn } from "@/app/lib/cn";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

// Glow color presets matching the design system
type GlowColor = "primary" | "success" | "streak" | "highlight" | "none";

// Card variants for different visual styles
type CardVariant = "default" | "elevated" | "premium";

type GlowCardProps = {
  children: ReactNode;
  /** Glow color on hover/active */
  glowColor?: GlowColor;
  /** Card visual variant */
  variant?: CardVariant;
  /** Enable glassmorphism backdrop blur (default for elevated/premium) */
  glass?: boolean;
  /** Enable gradient border */
  gradientBorder?: boolean;
  /** Enable hover scale micro-interaction */
  hoverScale?: boolean;
  /** Enable hover lift with shadow */
  hoverLift?: boolean;
  /** Enable 3D tilt effect on hover */
  tilt3d?: boolean;
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

// -----------------------------------------------------------------------------
// Style Maps
// -----------------------------------------------------------------------------

// Border colors for semantic meaning - accent aware
const borderColors: Record<GlowColor, string> = {
  primary: "border-[rgba(var(--accent-primary-rgb),0.2)]",
  success: "border-[rgba(var(--accent-success-rgb),0.2)]",
  streak: "border-[rgba(var(--accent-streak-rgb),0.2)]",
  highlight: "border-[rgba(var(--accent-highlight-rgb),0.2)]",
  none: "border-[var(--border-subtle)]",
};

// Hover border colors
const hoverBorderColors: Record<GlowColor, string> = {
  primary: "hover:border-[rgba(var(--accent-primary-rgb),0.35)]",
  success: "hover:border-[rgba(var(--accent-success-rgb),0.35)]",
  streak: "hover:border-[rgba(var(--accent-streak-rgb),0.35)]",
  highlight: "hover:border-[rgba(var(--accent-highlight-rgb),0.35)]",
  none: "hover:border-[var(--border-default)]",
};

// Variant styles
const variantStyles: Record<CardVariant, string> = {
  default: "bg-[var(--bg-card)]",
  elevated: "glass-card-elevated",
  premium: "glass-card-premium",
};

// -----------------------------------------------------------------------------
// 3D Tilt Constants
// -----------------------------------------------------------------------------

const TILT_STYLE: React.CSSProperties = {
  transformStyle: "preserve-3d",
  transform:
    "perspective(1000px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
  transition: "transform 0.15s ease-out",
};

const MAX_TILT = 6;

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

/**
 * GlowCard is a premium styled card component with glassmorphism, glow effects,
 * and optional 3D tilt interaction. Supports hover interactions and can be
 * used as a button when onClick is provided.
 *
 * @example
 * // Basic usage
 * <GlowCard glowColor="primary">
 *   <StatContent />
 * </GlowCard>
 *
 * @example
 * // Premium card with 3D effect
 * <GlowCard
 *   variant="premium"
 *   glowColor="primary"
 *   tilt3d
 *   hoverLift
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
      variant = "default",
      glass,
      gradientBorder = false,
      hoverScale = false,
      hoverLift = false,
      tilt3d = false,
      className,
      interactive = false,
      glowAlways = false,
      onClick,
      ...motionProps
    },
    forwardedRef
  ) => {
    const prefersReducedMotion = useReducedMotion();
    const isInteractive = interactive || !!onClick;
    const shouldAnimate = !prefersReducedMotion && (hoverScale || hoverLift);
    const enableTilt = tilt3d && !prefersReducedMotion;

    // Internal ref for 3D tilt
    const internalRef = useRef<HTMLDivElement | null>(null);

    // Merge refs callback
    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    // 3D tilt mouse move handler
    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!enableTilt || !internalRef.current) return;

        const rect = internalRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        const tiltX = (mouseY / (rect.height / 2)) * -MAX_TILT;
        const tiltY = (mouseX / (rect.width / 2)) * MAX_TILT;

        internalRef.current.style.setProperty("--tilt-x", `${tiltX}deg`);
        internalRef.current.style.setProperty("--tilt-y", `${tiltY}deg`);
      },
      [enableTilt]
    );

    // 3D tilt mouse leave handler
    const handleMouseLeave = useCallback(() => {
      if (!internalRef.current) return;
      internalRef.current.style.setProperty("--tilt-x", "0deg");
      internalRef.current.style.setProperty("--tilt-y", "0deg");
    }, []);

    // Determine glass mode - auto-enable for elevated/premium variants
    const shouldUseGlass =
      glass ?? (variant === "elevated" || variant === "premium");

    return (
      <motion.div
        ref={mergedRef}
        onClick={onClick}
        onMouseMove={enableTilt ? handleMouseMove : undefined}
        onMouseLeave={enableTilt ? handleMouseLeave : undefined}
        style={enableTilt ? TILT_STYLE : undefined}
        whileHover={
          shouldAnimate
            ? {
                scale: hoverScale ? 1.02 : 1,
                y: hoverLift ? -3 : 0,
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
          duration: 0.15,
          ease: "easeOut",
        }}
        className={cn(
          // Base card styles
          "relative rounded-xl p-4",
          "border",

          // Variant styles
          variantStyles[variant],

          // Border colors
          borderColors[glowColor],
          hoverBorderColors[glowColor],

          // Glass effect (only if not using premium variant which has it built in)
          shouldUseGlass &&
            variant !== "premium" &&
            "backdrop-blur-md bg-[var(--bg-card)]/80",

          // Gradient border effect
          gradientBorder &&
            glowColor !== "none" &&
            "border-gradient card-light-reflection",

          // Hover background (for default variant)
          variant === "default" && "hover:bg-[var(--bg-hover)]",

          // Premium hover lift effect
          hoverLift && "hover-lift-glow",

          // Always show glow
          glowAlways && glowColor !== "none" && "glow-primary",

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

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

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
    primary: "bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--accent-primary)]",
    success: "bg-[rgba(var(--accent-success-rgb),0.1)] text-[var(--accent-success)]",
    streak: "bg-[rgba(var(--accent-streak-rgb),0.1)] text-[var(--accent-streak)]",
    highlight:
      "bg-[rgba(var(--accent-highlight-rgb),0.1)] text-[var(--accent-highlight)]",
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
