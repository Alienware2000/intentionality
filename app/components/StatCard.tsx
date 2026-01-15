"use client";

// =============================================================================
// STAT CARD COMPONENT
// Minimal stat display card with thin borders.
// anime.js inspired: large monospace numbers, subtle accents.
// =============================================================================

import { cn } from "@/app/lib/cn";

type Props = {
  value: string | number;
  label: string;
  accent?: boolean;
  className?: string;
};

export default function StatCard({ value, label, accent = false, className }: Props) {
  return (
    <div
      className={cn(
        "relative p-4 rounded-lg",
        "border border-[var(--border-subtle)]",
        "bg-[var(--bg-card)]",
        className
      )}
    >
      {/* Optional red accent line at top */}
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent-primary)] to-transparent rounded-t-lg" />
      )}

      <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </div>
      <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
