"use client";

// =============================================================================
// STAT CARD COMPONENT
// Enhanced stat display card with icon support.
// anime.js inspired: large monospace numbers, dramatic accents.
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
};

const ACCENT_COLORS = {
  primary: "var(--accent-primary)",
  success: "var(--accent-success)",
  streak: "var(--accent-streak)",
  highlight: "var(--accent-highlight)",
};

export default function StatCard({
  value,
  label,
  icon: Icon,
  accent = false,
  accentColor = "primary",
  className,
}: Props) {
  const color = ACCENT_COLORS[accentColor];

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl",
        "border border-[var(--border-subtle)]",
        "bg-[var(--bg-card)] glass-card",
        "transition-all duration-150 hover-lift",
        "hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]",
        className
      )}
    >
      {/* Optional accent line at top */}
      {accent && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg"
          style={{
            background: `linear-gradient(90deg, ${color} 0%, transparent 100%)`,
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
            className="p-2 rounded-lg opacity-60"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
        )}
      </div>
    </div>
  );
}
