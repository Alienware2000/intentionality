// =============================================================================
// PROGRESS RING COMPONENT
// Circular SVG progress indicator with animated fill.
// Used in daily review summary and other progress displays.
// =============================================================================

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/app/lib/cn";

type ProgressRingProps = {
  /** Current value */
  value: number;
  /** Maximum value (for calculating percentage) */
  max: number;
  /** Diameter of the ring in pixels */
  size?: number;
  /** Width of the stroke */
  strokeWidth?: number;
  /** Label displayed in center (e.g., "4/8") */
  label?: string;
  /** Sublabel displayed below the main label */
  sublabel?: string;
  /** Color of the progress stroke (CSS variable or color value) */
  color?: string;
  /** Background stroke color */
  bgColor?: string;
  /** Additional class names */
  className?: string;
};

export default function ProgressRing({
  value,
  max,
  size = 88,
  strokeWidth = 6,
  label,
  sublabel,
  color = "var(--accent-primary)",
  bgColor = "var(--bg-elevated)",
  className,
}: ProgressRingProps) {
  const prefersReducedMotion = useReducedMotion();

  // Calculate dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  // Center point for the circle
  const center = size / 2;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 80, damping: 12, delay: 0.15 }
          }
        />
      </svg>

      {/* Center content */}
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && (
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-xs text-[var(--text-muted)]">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
