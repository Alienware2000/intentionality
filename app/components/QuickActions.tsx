"use client";

// =============================================================================
// QUICK ACTIONS COMPONENT
// Quick access buttons for Brain Dump, Analytics, and other features.
// =============================================================================

import { Brain, BarChart3, Inbox } from "lucide-react";
import Link from "next/link";
import { useBrainDump } from "./BrainDumpProvider";
import { cn } from "@/app/lib/cn";

export default function QuickActions() {
  const { openBrainDump } = useBrainDump();

  return (
    <div className="flex flex-wrap gap-2">
      {/* Brain Dump - opens modal */}
      <button
        onClick={openBrainDump}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
          "text-sm text-[var(--text-secondary)]",
          "hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]",
          "transition-all duration-200"
        )}
      >
        <Brain size={16} />
        <span className="hidden sm:inline">Brain Dump</span>
        {/* Keyboard shortcut - only show on desktop */}
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[10px] font-mono text-[var(--text-muted)]">
          {typeof window !== "undefined" && navigator.platform.includes("Mac")
            ? "⌘"
            : "Ctrl"}
          K
        </kbd>
      </button>

      {/* Inbox Link */}
      <Link
        href="/inbox"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
          "text-sm text-[var(--text-secondary)]",
          "hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
          "transition-all duration-200"
        )}
      >
        <Inbox size={16} />
        <span className="hidden sm:inline">Inbox</span>
      </Link>

      {/* Analytics Link */}
      <Link
        href="/analytics"
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
          "text-sm text-[var(--text-secondary)]",
          "hover:border-[var(--border-default)] hover:text-[var(--text-primary)]",
          "transition-all duration-200"
        )}
      >
        <BarChart3 size={16} />
        <span className="hidden sm:inline">Analytics</span>
      </Link>
    </div>
  );
}
