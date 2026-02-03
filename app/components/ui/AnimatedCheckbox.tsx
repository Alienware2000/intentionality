"use client";

// =============================================================================
// ANIMATED CHECKBOX COMPONENT
// Premium checkbox with anime.js-style SVG checkmark draw and ripple effect.
// Used in TaskCard and HabitCard for completion animations.
// =============================================================================

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import anime from "animejs";
import { cn } from "@/app/lib/cn";

type Props = {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
};

export default function AnimatedCheckbox({
  checked,
  disabled = false,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: Props) {
  const checkRef = useRef<SVGPathElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotionHook = useReducedMotion();
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCheckedRef = useRef(checked);

  // Size classes
  const sizeClasses = {
    sm: "w-6 h-6 rounded",
    md: "w-11 h-11 sm:w-6 sm:h-6 rounded-lg sm:rounded",
  };

  const iconSizes = {
    sm: { mobile: 14, desktop: 14 },
    md: { mobile: 18, desktop: 14 },
  };

  // Animate checkmark draw on completion
  useEffect(() => {
    if (prefersReducedMotionHook) return;

    // Only animate when transitioning from unchecked to checked
    if (checked && !prevCheckedRef.current) {
      queueMicrotask(() => setIsAnimating(true));

      // Checkmark SVG draw animation
      if (checkRef.current) {
        const path = checkRef.current;
        const length = path.getTotalLength ? path.getTotalLength() : 24;

        // Set up the starting state
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;

        anime({
          targets: path,
          strokeDashoffset: [length, 0],
          easing: "easeOutQuad",
          duration: 300,
          delay: 50,
        });
      }

      // Ripple effect
      if (rippleRef.current) {
        anime({
          targets: rippleRef.current,
          scale: [0, 2.5],
          opacity: [0.5, 0],
          easing: "easeOutExpo",
          duration: 500,
        });
      }

      // Card bounce effect
      if (containerRef.current?.parentElement) {
        anime({
          targets: containerRef.current.parentElement.parentElement,
          scale: [1, 1.02, 1],
          easing: "easeOutBack",
          duration: 300,
          delay: 100,
        });
      }

      setTimeout(() => setIsAnimating(false), 500);
    }

    prevCheckedRef.current = checked;
  }, [checked, prefersReducedMotionHook]);

  return (
    <motion.button
      ref={containerRef}
      type="button"
      onClick={() => !disabled && onChange?.()}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.1 } : {}}
      whileTap={!disabled ? { scale: 0.9 } : {}}
      aria-label={ariaLabel}
      className={cn(
        "relative flex-shrink-0 overflow-hidden",
        sizeClasses[size],
        "border-2 flex items-center justify-center",
        "transition-all duration-200",
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
        "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2",
        disabled
          ? "border-[var(--border-subtle)] bg-[var(--bg-elevated)] cursor-not-allowed"
          : checked
          ? "bg-[var(--accent-success)] border-[var(--accent-success)] cursor-pointer"
          : "border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 cursor-pointer",
        className
      )}
    >
      {/* Ripple effect layer */}
      <div
        ref={rippleRef}
        className="absolute inset-0 rounded-full bg-[var(--accent-success)]"
        style={{ opacity: 0, transform: "scale(0)" }}
      />

      {/* Checkmark with SVG draw animation */}
      <AnimatePresence mode="wait">
        {checked && !disabled && (
          <motion.div
            initial={prefersReducedMotionHook ? { opacity: 1 } : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            {/* Mobile icon */}
            <svg
              className="text-white sm:hidden"
              width={iconSizes[size].mobile}
              height={iconSizes[size].mobile}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                ref={checkRef}
                d="M5 12l5 5L19 7"
                className={cn(
                  !prefersReducedMotionHook && isAnimating && "animate-checkmark-draw"
                )}
              />
            </svg>
            {/* Desktop icon */}
            <svg
              className="text-white hidden sm:block"
              width={iconSizes[size].desktop}
              height={iconSizes[size].desktop}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M5 12l5 5L19 7"
                className={cn(
                  !prefersReducedMotionHook && isAnimating && "animate-checkmark-draw"
                )}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
