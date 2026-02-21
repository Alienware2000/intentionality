"use client";

// =============================================================================
// TASK RESCHEDULE POPOVER
// Popover with preset date options and custom date picker for rescheduling tasks.
// Uses Floating UI for collision-aware positioning and portal rendering.
// =============================================================================

import { useState, cloneElement, isValidElement } from "react";
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/app/lib/cn";
import {
  getTodayISO,
  getTomorrowISO,
  getNextMondayISO,
  getThisSaturdayISO,
  formatDayLabel,
} from "@/app/lib/date-utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type TaskReschedulePopoverProps = {
  onReschedule: (newDate: string) => void;
  /** Hide the "Today" preset (e.g. for tasks already due today) */
  hideToday?: boolean;
  /** Trigger element — receives ref and interaction props */
  children: React.ReactElement;
};

// -----------------------------------------------------------------------------
// Popover Component (self-contained with Floating UI)
// -----------------------------------------------------------------------------

export default function TaskReschedulePopover({
  onReschedule,
  hideToday = false,
  children,
}: TaskReschedulePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    strategy: "fixed",
    transform: false,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  function handleSelect(date: string) {
    onReschedule(date);
    setIsOpen(false);
  }

  // Determine animation direction based on actual placement
  const animateY = context.placement?.startsWith("top") ? 4 : -4;

  return (
    <>
      {/* Trigger — clone child to attach ref + interaction props */}
      {isValidElement(children) &&
        cloneElement(children as React.ReactElement<Record<string, unknown>>, {
          ref: refs.setReference,
          ...getReferenceProps(children.props as Record<string, unknown>),
        })}

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <motion.div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                initial={{ opacity: 0, scale: 0.95, y: animateY }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: animateY }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "z-50 rounded-lg",
                  "w-[min(14rem,calc(100vw-1rem))]",
                  "bg-[var(--bg-card)] border border-[var(--border-default)]",
                  "shadow-lg"
                )}
              >
                <TaskReschedulePopoverContent
                  onSelect={handleSelect}
                  hideToday={hideToday}
                />
              </motion.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}

// -----------------------------------------------------------------------------
// Popover Content (stateless positioning, just the UI)
// -----------------------------------------------------------------------------

function TaskReschedulePopoverContent({
  onSelect,
  hideToday,
}: {
  onSelect: (date: string) => void;
  hideToday?: boolean;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const today = getTodayISO();
  const tomorrow = getTomorrowISO();
  const saturday = getThisSaturdayISO();
  const monday = getNextMondayISO();

  function handleCustomGo() {
    if (customDate) {
      onSelect(customDate);
    }
  }

  // Build preset list
  const presets: { label: string; sublabel?: string; date: string }[] = [];
  if (!hideToday) {
    presets.push({ label: "Today", date: today });
  }
  presets.push({ label: "Tomorrow", sublabel: formatDayLabel(tomorrow), date: tomorrow });
  presets.push({ label: "This Weekend", sublabel: formatDayLabel(saturday), date: saturday });
  presets.push({ label: "Next Monday", sublabel: formatDayLabel(monday), date: monday });

  // Deduplicate by date (first occurrence wins) to avoid duplicate keys
  // e.g. on Friday, "Tomorrow" and "This Weekend" both resolve to Saturday
  const seen = new Set<string>();
  const uniquePresets = presets.filter((p) => {
    if (seen.has(p.date)) return false;
    seen.add(p.date);
    return true;
  });

  return (
    <div className="p-2">
      <div className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] px-2 pt-1 pb-2">
        Reschedule
      </div>

      {/* Preset date buttons */}
      <div className="space-y-0.5">
        {uniquePresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onSelect(preset.date)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left",
              "text-sm text-[var(--text-primary)]",
              "hover:bg-[var(--bg-hover)] transition-colors",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
            )}
          >
            <span className="font-medium">{preset.label}</span>
            {preset.sublabel && (
              <span className="text-xs text-[var(--text-muted)] truncate">
                {preset.sublabel}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="my-1.5 border-t border-[var(--border-subtle)]" />

      {/* Custom date section */}
      {!showDatePicker ? (
        <button
          onClick={() => setShowDatePicker(true)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-2 rounded-md text-left",
            "text-sm text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] transition-colors",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
          )}
        >
          <Calendar size={14} className="text-[var(--text-muted)]" />
          <span>Pick a date...</span>
          <ChevronRight size={12} className="ml-auto text-[var(--text-muted)]" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-1">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            min={today}
            autoFocus
            className={cn(
              "flex-1 min-w-0 px-2 py-1.5 text-sm rounded",
              "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
              "text-[var(--text-primary)]",
              "focus:outline-none focus:border-[var(--accent-primary)]",
              "theme-color-scheme"
            )}
          />
          <button
            onClick={handleCustomGo}
            disabled={!customDate}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded",
              "bg-[var(--accent-primary)] text-white",
              "hover:bg-[var(--accent-primary)]/80 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Go
          </button>
        </div>
      )}
    </div>
  );
}
