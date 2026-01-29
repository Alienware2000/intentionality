"use client";

// =============================================================================
// USE SCROLL REVEAL HOOK
// Custom hook for scroll-triggered animations using Framer Motion's useInView.
// Respects prefers-reduced-motion preference.
// =============================================================================

import { useRef, useMemo, useEffect } from "react";
import { useInView, useReducedMotion, Variants, useAnimation } from "framer-motion";

type UseScrollRevealOptions = {
  /** Only trigger animation once */
  once?: boolean;
  /** Viewport margin for trigger */
  margin?: string;
  /** Delay before animation (in seconds) */
  delay?: number;
  /** Animation duration (in seconds) */
  duration?: number;
  /** Animation direction */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Include scale in animation */
  scale?: boolean;
  /** Threshold for visibility (0-1) */
  threshold?: number;
};

type UseScrollRevealReturn = {
  /** Ref to attach to the element */
  ref: React.RefObject<HTMLDivElement | null>;
  /** Whether element is in view */
  isInView: boolean;
  /** Animation controls */
  controls: ReturnType<typeof useAnimation>;
  /** Variants for motion component */
  variants: Variants;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Current animation state */
  animate: "visible" | "hidden";
};

// Direction-based translate values (subtle animations)
const directionOffset = {
  up: { x: 0, y: 16 },
  down: { x: 0, y: -16 },
  left: { x: 16, y: 0 },
  right: { x: -16, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * useScrollReveal provides scroll-triggered animation utilities.
 * Automatically respects prefers-reduced-motion.
 *
 * @example
 * function MyComponent() {
 *   const { ref, variants, animate } = useScrollReveal({
 *     direction: "up",
 *     delay: 0.1,
 *   });
 *
 *   return (
 *     <motion.div
 *       ref={ref}
 *       initial="hidden"
 *       animate={animate}
 *       variants={variants}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 */
export function useScrollReveal(
  options: UseScrollRevealOptions = {}
): UseScrollRevealReturn {
  const {
    once = true,
    margin = "-50px",
    delay = 0,
    duration = 0.4,
    direction = "up",
    scale = false,
    threshold = 0,
  } = options;

  const ref = useRef<HTMLDivElement>(null);

  const isInView = useInView(ref, {
    once,
    margin: margin as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    amount: threshold,
  });
  const controls = useAnimation();
  const prefersReducedMotion = useReducedMotion() ?? false;

  // Trigger animation when in view
  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    } else if (!once) {
      controls.start("hidden");
    }
  }, [isInView, controls, once]);

  // Build variants based on options
  const variants = useMemo<Variants>(() => {
    const offset = directionOffset[direction];

    return {
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
  }, [direction, scale, duration, delay, prefersReducedMotion]);

  return {
    ref,
    isInView,
    controls,
    variants,
    prefersReducedMotion,
    animate: isInView ? "visible" : "hidden",
  };
}

/**
 * useStaggerReveal provides utilities for staggered list animations.
 *
 * @example
 * function MyList() {
 *   const { containerRef, containerVariants, itemVariants, animate } = useStaggerReveal({
 *     stagger: 0.06,
 *   });
 *
 *   return (
 *     <motion.ul
 *       ref={containerRef}
 *       initial="hidden"
 *       animate={animate}
 *       variants={containerVariants}
 *     >
 *       {items.map(item => (
 *         <motion.li key={item.id} variants={itemVariants}>
 *           {item.content}
 *         </motion.li>
 *       ))}
 *     </motion.ul>
 *   );
 * }
 */
export function useStaggerReveal(
  options: {
    once?: boolean;
    margin?: string;
    stagger?: number;
    delay?: number;
    direction?: "up" | "down" | "left" | "right" | "none";
  } = {}
) {
  const {
    once = true,
    margin = "-50px",
    stagger = 0.06,
    delay = 0,
    direction = "up",
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isInView = useInView(containerRef, { once, margin: margin as any });
  const prefersReducedMotion = useReducedMotion() ?? false;

  const offset = directionOffset[direction];

  const containerVariants = useMemo<Variants>(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: prefersReducedMotion ? 0 : stagger,
          delayChildren: prefersReducedMotion ? 0 : delay,
        },
      },
    }),
    [stagger, delay, prefersReducedMotion]
  );

  const itemVariants = useMemo<Variants>(
    () => ({
      hidden: {
        opacity: 0,
        x: prefersReducedMotion ? 0 : offset.x,
        y: prefersReducedMotion ? 0 : offset.y,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration: prefersReducedMotion ? 0 : 0.35,
          ease: [0.25, 0.1, 0.25, 1],
        },
      },
    }),
    [offset, prefersReducedMotion]
  );

  return {
    containerRef,
    isInView,
    containerVariants,
    itemVariants,
    animate: isInView ? "visible" : "hidden",
    prefersReducedMotion,
  };
}

export default useScrollReveal;
