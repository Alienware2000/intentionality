"use client";

// =============================================================================
// COLLAPSIBLE SECTION COMPONENT
// Reusable expandable/collapsible card section for settings and other UIs.
// Supports both controlled (via isExpanded/onToggle) and uncontrolled modes.
// =============================================================================

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/app/lib/cn";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type CollapsibleSectionProps = {
  /** Card title */
  title: string;
  /** Optional description shown below title */
  description?: string;
  /** Icon to display (lucide-react icon element) */
  icon?: ReactNode;
  /** Background color class for icon container */
  iconBgClass?: string;
  /** Whether section starts expanded (uncontrolled mode) */
  defaultExpanded?: boolean;
  /** Controlled: current expanded state */
  isExpanded?: boolean;
  /** Controlled: callback when toggle is clicked */
  onToggle?: () => void;
  /** Content to show when expanded */
  children: ReactNode;
  /** Additional classes for the outer container */
  className?: string;
  /** Optional right-side content in header (e.g., status indicators) */
  headerRight?: ReactNode;
  /** Whether to show loading skeleton */
  loading?: boolean;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function CollapsibleSection({
  title,
  description,
  icon,
  iconBgClass = "bg-[var(--accent-primary)]/10",
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggle,
  children,
  className,
  headerRight,
  loading = false,
}: CollapsibleSectionProps) {
  // Internal state for uncontrolled mode
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Determine if we're in controlled mode
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else if (!isControlled) {
      setInternalExpanded(!internalExpanded);
    }
  };

  if (loading) {
    return (
      <div className={cn(
        "rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4",
        className
      )}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--skeleton-bg)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-[var(--skeleton-bg)] rounded" />
              <div className="h-3 w-48 bg-[var(--skeleton-bg)] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl bg-[var(--bg-card)] glass-card border border-[var(--border-subtle)] overflow-hidden",
      className
    )}>
      {/* Header - Always visible, clickable to expand/collapse */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "text-left hover:bg-[var(--bg-hover)]/50 transition-colors",
          // Mobile touch-friendly
          "min-h-[44px]",
          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
          "active:scale-[0.99] transition-all duration-100",
          "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
        )}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn("p-2 rounded-lg", iconBgClass)}>
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {headerRight}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          </motion.div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border-subtle)]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
