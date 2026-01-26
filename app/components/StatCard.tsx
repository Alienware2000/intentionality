"use client";

// =============================================================================
// STAT CARD COMPONENT
// Premium stat display card with icon support and accent-aware styling.
// Features glass effect, hover animations, and dynamic accent colors.
// =============================================================================

import { cn } from "@/app/lib/cn";
import type { LucideIcon } from "lucide-react";

type Props = {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  accent?: boolean;
  accentColor?: "primary" | "success" | "streak" | "highlight";
  className?: string;
  /** Use premium glass variant */
  premium?: boolean;
};

// CSS variable based accent colors
const ACCENT_COLORS = {
  primary: "var(--accent-primary)",
  success: "var(--accent-success)",
  streak: "var(--accent-streak)",
  highlight: "var(--accent-highlight)",
};

// Background classes for icon containers - using CSS variable syntax for dynamic colors
const ICON_BG_CLASSES = {
  primary: "bg-[rgba(var(--accent-primary-rgb),0.12)]",
  success: "bg-[rgba(var(--accent-success-rgb),0.12)]",
  streak: "bg-[rgba(var(--accent-streak-rgb),0.12)]",
  highlight: "bg-[rgba(var(--accent-highlight-rgb),0.12)]",
};

export default function StatCard({
  value,
  label,
  icon: Icon,
  accent = false,
  accentColor = "primary",
  className,
  premium = false,
}: Props) {
  const color = ACCENT_COLORS[accentColor];

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl",
        "border border-[var(--border-subtle)]",
        premium ? "glass-card-premium" : "bg-[var(--bg-card)] glass-card",
        "transition-all duration-150",
        premium ? "hover-lift-glow" : "hover-lift",
        "hover:border-[var(--border-default)]",
        !premium && "hover:bg-[var(--bg-hover)]",
        className
      )}
    >
      {/* Optional accent line at top with gradient */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${color} 30%, transparent) 100%)`,
          }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">
            {label}
          </div>
        </div>
        {Icon && (
          <div
            className={cn(
              "p-2.5 rounded-lg transition-colors duration-200",
              ICON_BG_CLASSES[accentColor]
            )}
          >
            <Icon
              size={18}
              style={{ color }}
              className="transition-transform duration-200 group-hover:scale-110"
            />
          </div>
        )}
      </div>
    </div>
  );
}
