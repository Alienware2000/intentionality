"use client";

// =============================================================================
// ANIMATED CONTAINER COMPONENT
// Reusable scroll-triggered reveal component using Framer Motion's useInView.
// Provides consistent entrance animations across the app.
// =============================================================================

import { useRef, ReactNode } from "react";
import { motion, useInView, useReducedMotion, Variants } from "framer-motion";
import { cn } from "@/app/lib/cn";

// Animation direction presets
type AnimationDirection = "up" | "down" | "left" | "right" | "none";

type Props = {
  children: ReactNode;
  /** Animation direction for entrance */
  direction?: AnimationDirection;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Animation duration (in seconds) */
  duration?: number;
  /** Additional className */
  className?: string;
  /** Whether to animate only once */
  once?: boolean;
  /** Viewport margin for trigger */
  margin?: string;
  /** Custom variants override */
  variants?: Variants;
  /** Stagger children animations */
  stagger?: number;
  /** Whether this is a stagger container */
  staggerContainer?: boolean;
  /** Enable scale animation */
  scale?: boolean;
};

// Direction-based translate values (snappy - 8-12px)
const directionOffset: Record<AnimationDirection, { x: number; y: number }> = {
  up: { x: 0, y: 10 },
  down: { x: 0, y: -10 },
  left: { x: 10, y: 0 },
  right: { x: -10, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * AnimatedContainer provides scroll-triggered entrance animations.
 * Respects prefers-reduced-motion automatically.
 *
 * @example
 * // Basic usage
 * <AnimatedContainer direction="up">
 *   <Card />
 * </AnimatedContainer>
 *
 * @example
 * // Staggered list
 * <AnimatedContainer staggerContainer stagger={0.06}>
 *   {items.map(item => (
 *     <AnimatedContainer key={item.id} direction="up">
 *       <ListItem item={item} />
 *     </AnimatedContainer>
 *   ))}
 * </AnimatedContainer>
 */
export default function AnimatedContainer({
  children,
  direction = "up",
  delay = 0,
  duration = 0.25,
  className,
  once = true,
  margin = "-50px",
  variants: customVariants,
  stagger = 0.04,
  staggerContainer = false,
  scale = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isInView = useInView(ref, { once, margin: margin as any });
  const prefersReducedMotion = useReducedMotion();

  // Default variants based on direction and scale
  const offset = directionOffset[direction];
  const defaultVariants: Variants = {
    hidden: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : offset.x,
      y: prefersReducedMotion ? 0 : offset.y,
      scale: prefersReducedMotion ? 1 : scale ? 0.98 : 1,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1], // easeOutCubic
      },
    },
  };

  // Container variants for staggered children
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : stagger,
        delayChildren: prefersReducedMotion ? 0 : delay,
      },
    },
  };

  const variants = customVariants || (staggerContainer ? containerVariants : defaultVariants);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedItem is a lightweight variant for use inside stagger containers.
 * Should be used as a direct child of AnimatedContainer with staggerContainer.
 */
export function AnimatedItem({
  children,
  className,
  direction = "up",
  scale = false,
}: {
  children: ReactNode;
  className?: string;
  direction?: AnimationDirection;
  scale?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const offset = directionOffset[direction];

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : offset.x,
      y: prefersReducedMotion ? 0 : offset.y,
      scale: prefersReducedMotion ? 1 : scale ? 0.98 : 1,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.22,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={cn(className)}>
      {children}
    </motion.div>
  );
}
