"use client";

// =============================================================================
// CALENDAR DAY VIEW COMPONENT
// A time grid showing the day as a vertical timeline with schedule blocks.
// Inspired by Fantastical, Notion Calendar, and Linear timeline views.
//
// POSITIONING SYSTEM:
// - All block positions are calculated in pure pixels
// - Time label width: TIME_LABEL_WIDTH (56px)
// - Content area measured via ResizeObserver
// - Overlapping blocks share width equally within collision groups
// =============================================================================

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, MapPin, Clock, Trash2, Calendar } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { formatTime, getTodayISO, getDayOfWeek } from "@/app/lib/date-utils";
import type { ISODateString, ScheduleBlock, DayOfWeek } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants - All layout values in one place, no magic numbers
// -----------------------------------------------------------------------------

// Normal mode dimensions
const HOUR_HEIGHT_NORMAL = 64; // px per hour
const TIME_LABEL_WIDTH_NORMAL = 56; // px for time labels on left

// Compact mode dimensions (for sidebar)
const HOUR_HEIGHT_COMPACT = 40; // px per hour (smaller for sidebar)
const TIME_LABEL_WIDTH_COMPACT = 48; // px for time labels (narrower)

const BLOCK_GAP = 4; // px gap between overlapping blocks
const MIN_BLOCK_HEIGHT = 24; // px minimum height for blocks
const BLOCK_RADIUS = 8; // px border radius

// Helper to get dimensions based on compact mode
function getDimensions(compact: boolean) {
  return {
    hourHeight: compact ? HOUR_HEIGHT_COMPACT : HOUR_HEIGHT_NORMAL,
    timeLabelWidth: compact ? TIME_LABEL_WIDTH_COMPACT : TIME_LABEL_WIDTH_NORMAL,
  };
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CalendarDayViewProps = {
  date: ISODateString;
  blocks: Array<{ block: ScheduleBlock; completed: boolean }>;
  onToggleBlock: (blockId: string) => void;
  onAddBlock: (defaultValues: {
    start_time: string;
    end_time: string;
    days_of_week: DayOfWeek[];
  }) => void;
  onEditBlock?: (block: ScheduleBlock) => void;
  onDeleteBlock?: (blockId: string) => void;
  startHour?: number; // Default 6 (6am)
  endHour?: number; // Default 22 (10pm)
  compact?: boolean;
};

type ProcessedBlock = {
  block: ScheduleBlock;
  completed: boolean;
  top: number; // px from top of grid
  height: number; // px height
  columnIndex: number; // which column (0-indexed)
  totalColumns: number; // how many columns in this collision group
  startMinutes: number;
  endMinutes: number;
};

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

/**
 * Hook for live time updates (for current time indicator).
 */
function useCurrentTime(updateIntervalMs = 60000) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), updateIntervalMs);
    return () => clearInterval(interval);
  }, [updateIntervalMs]);

  return time;
}

/**
 * Hook to measure content width using ResizeObserver.
 */
function useContentWidth(containerRef: React.RefObject<HTMLDivElement | null>, timeLabelWidth: number) {
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Content width = container width - time label width
        const width = entry.contentRect.width - timeLabelWidth;
        setContentWidth(Math.max(0, width));
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, timeLabelWidth]);

  return contentWidth;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Parse time string (HH:MM) to total minutes from midnight.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes to time string (HH:MM).
 */
function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Format hour number to display string (e.g., 9 -> "9 AM", 14 -> "2 PM").
 */
function formatHourLabel(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12} ${ampm}`;
}

/**
 * Format time from Date object to 12h format.
 */
function formatTime12h(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Calculate smart time window based on current time and schedule blocks.
 * Shows a focused ~10 hour window instead of full 16 hours.
 */
function calculateSmartTimeWindow(
  blocks: Array<{ block: { start_time: string; end_time: string }; completed: boolean }>,
  isToday: boolean,
  currentHour: number
): { startHour: number; endHour: number } {
  const VISIBLE_HOURS = 10;
  const PADDING = 1;

  // No blocks: center around current time (today) or show 8am-6pm (other days)
  if (blocks.length === 0) {
    if (isToday) {
      const start = Math.max(5, currentHour - 2);
      return { startHour: start, endHour: Math.min(23, start + VISIBLE_HOURS) };
    }
    return { startHour: 8, endHour: 18 };
  }

  // Find block time bounds
  let earliest = 24, latest = 0;
  for (const { block } of blocks) {
    const startH = parseInt(block.start_time.split(":")[0], 10);
    const endH = parseInt(block.end_time.split(":")[0], 10) + 1;
    earliest = Math.min(earliest, startH);
    latest = Math.max(latest, endH);
  }

  // Add padding and ensure current time visible if today
  let startHour = Math.max(5, earliest - PADDING);
  let endHour = Math.min(23, latest + PADDING);

  if (isToday) {
    startHour = Math.min(startHour, currentHour - 1);
    endHour = Math.max(endHour, currentHour + 2);
  }

  // Ensure minimum window
  if (endHour - startHour < 8) {
    const center = Math.floor((startHour + endHour) / 2);
    startHour = Math.max(5, center - 4);
    endHour = Math.min(23, center + 4);
  }

  return { startHour, endHour };
}

/**
 * Check if two time ranges overlap.
 */
function doTimesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}

// -----------------------------------------------------------------------------
// Collision Detection Algorithm
// -----------------------------------------------------------------------------

/**
 * Groups overlapping blocks into collision groups where all blocks
 * that share any overlap (directly or transitively) are in the same group.
 * Then assigns column indices using a greedy left-to-right approach.
 */
function computeCollisionGroups(
  blocks: Array<{
    block: ScheduleBlock;
    completed: boolean;
    top: number;
    height: number;
    startMinutes: number;
    endMinutes: number;
  }>
): ProcessedBlock[] {
  if (blocks.length === 0) return [];

  // Sort by start time, then by end time
  const sorted = [...blocks].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return a.endMinutes - b.endMinutes;
  });

  // Build collision groups using union-find approach
  const parent = new Map<string, string>();

  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  };

  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootA, rootB);
    }
  };

  // Find all overlapping pairs and union them
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // Early exit: if j starts after i ends, no more overlaps for i
      if (sorted[j].startMinutes >= sorted[i].endMinutes) break;

      if (doTimesOverlap(
        sorted[i].startMinutes,
        sorted[i].endMinutes,
        sorted[j].startMinutes,
        sorted[j].endMinutes
      )) {
        union(sorted[i].block.id, sorted[j].block.id);
      }
    }
  }

  // Group blocks by their root
  const groups = new Map<string, typeof sorted>();
  for (const item of sorted) {
    const root = find(item.block.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(item);
  }

  // Process each group: assign column indices
  const result: ProcessedBlock[] = [];

  for (const groupBlocks of groups.values()) {
    // Sort group by start time
    groupBlocks.sort((a, b) => a.startMinutes - b.startMinutes);

    // Track column end times for greedy assignment
    const columnEnds: number[] = [];
    const blockColumns = new Map<string, number>();

    for (const item of groupBlocks) {
      // Find first column where this block fits
      let assignedColumn = -1;
      for (let col = 0; col < columnEnds.length; col++) {
        if (columnEnds[col] <= item.startMinutes) {
          assignedColumn = col;
          break;
        }
      }

      // If no column fits, create new one
      if (assignedColumn === -1) {
        assignedColumn = columnEnds.length;
        columnEnds.push(item.endMinutes);
      } else {
        columnEnds[assignedColumn] = item.endMinutes;
      }

      blockColumns.set(item.block.id, assignedColumn);
    }

    const totalColumns = columnEnds.length;

    // Add to result with column info
    for (const item of groupBlocks) {
      result.push({
        ...item,
        columnIndex: blockColumns.get(item.block.id)!,
        totalColumns,
      });
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

/**
 * Hour grid line with label.
 */
const HourLine = memo(function HourLine({
  hour,
  isLast,
  compact,
  timeLabelWidth,
}: {
  hour: number;
  isLast: boolean;
  compact: boolean;
  timeLabelWidth: number;
}) {
  const isNoon = hour === 12;

  return (
    <div className="absolute left-0 right-0 flex items-start" style={{ top: 0 }}>
      {/* Hour label - right aligned within label area */}
      <span
        className={cn(
          "font-mono select-none text-right pr-2 -translate-y-1/2",
          compact ? "text-[10px]" : "text-xs",
          isNoon ? "text-[var(--accent-primary)] font-medium" : "text-[var(--text-muted)]"
        )}
        style={{ width: timeLabelWidth }}
      >
        {formatHourLabel(hour)}
      </span>
      {/* Hour line */}
      <div
        className={cn(
          "flex-1 border-t",
          isLast
            ? "border-dashed border-[var(--border-subtle)]"
            : isNoon
            ? "border-[rgba(var(--accent-primary-rgb),0.25)]"
            : "border-[var(--border-subtle)]"
        )}
      />
    </div>
  );
});

/**
 * Current time "NOW" indicator line.
 */
const NowIndicator = memo(function NowIndicator({
  topPx,
  currentTime,
  timeLabelWidth,
  compact,
}: {
  topPx: number;
  currentTime: Date;
  timeLabelWidth: number;
  compact: boolean;
}) {
  const nowLineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to now line on mount
  useEffect(() => {
    if (nowLineRef.current) {
      nowLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  return (
    <motion.div
      ref={nowLineRef}
      className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
      style={{ top: topPx }}
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Subtle background glow strip */}
      <div
        className="absolute inset-0 -inset-y-1 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(var(--accent-primary-rgb), 0.06) 30%, rgba(var(--accent-primary-rgb), 0.06) 70%, transparent 100%)`
        }}
      />

      {/* Left circle marker */}
      <div
        className="flex justify-end pr-1 relative z-10"
        style={{ width: timeLabelWidth }}
      >
        <div className="relative">
          <div
            className={cn(
              "rounded-full bg-[var(--accent-primary)]",
              compact ? "w-2 h-2" : "w-3 h-3"
            )}
            style={{ boxShadow: "0 0 8px var(--accent-primary), 0 0 16px var(--accent-primary-glow)" }}
          />
          <div className={cn(
            "absolute inset-0 rounded-full bg-[var(--accent-primary)] animate-pulsing-dot",
            compact ? "w-2 h-2" : "w-3 h-3"
          )} />
        </div>
      </div>

      {/* Line with gradient glow effect */}
      <div
        className="flex-1 h-[2px] relative z-10"
        style={{
          background: `linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-primary) 70%, rgba(var(--accent-primary-rgb), 0.3) 100%)`,
          boxShadow: "0 0 6px var(--accent-primary-glow)"
        }}
      />

      {/* Time label - right aligned */}
      <span
        className={cn(
          "ml-2 px-2 py-0.5 rounded bg-[var(--accent-primary)] text-white font-mono font-medium whitespace-nowrap relative z-10",
          compact ? "text-[10px] px-1.5" : "text-xs"
        )}
        style={{ boxShadow: "0 2px 8px var(--accent-primary-glow)" }}
      >
        {formatTime12h(currentTime)}
      </span>
    </motion.div>
  );
});

/**
 * Schedule block rendered on the calendar.
 */
const CalendarBlock = memo(function CalendarBlock({
  block,
  completed,
  onToggle,
  onEdit,
  onDelete,
  top,
  height,
  left,
  width,
  compact,
}: {
  block: ScheduleBlock;
  completed: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  top: number;
  height: number;
  left: number;
  width: number;
  compact: boolean;
}) {
  const displayHeight = completed ? Math.min(height, MIN_BLOCK_HEIGHT) : height;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: completed ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "absolute overflow-hidden cursor-pointer group/block",
        "border-l-4 border border-[var(--border-subtle)]",
        "backdrop-blur-[2px]",
        "hover:border-[var(--border-default)]",
        "transition-all duration-150",
        completed && "grayscale",
        compact && "border-l-2"
      )}
      style={{
        top,
        left,
        width,
        height: displayHeight,
        borderRadius: compact ? 6 : BLOCK_RADIUS,
        backgroundColor: completed ? "transparent" : `${block.color}12`,
        borderLeftColor: block.color,
        boxShadow: completed
          ? "none"
          : `0 2px 8px ${block.color}20, 0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
      whileHover={{
        y: -2,
        boxShadow: `0 6px 16px ${block.color}30, 0 2px 4px rgba(0,0,0,0.08)`,
      }}
      onClick={onEdit}
    >
      {/* Delete button - shows on hover */}
      {onDelete && !completed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete block"
          className={cn(
            "absolute top-1 right-1 z-10",
            "p-1 rounded",
            "bg-[var(--bg-card)]/90 border border-[var(--border-subtle)]",
            "text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]",
            "opacity-0 group-hover/block:opacity-100",
            "transition-all duration-150",
            compact && "p-0.5 top-0.5 right-0.5"
          )}
        >
          <Trash2 size={compact ? 10 : 12} />
        </button>
      )}

      <div className={cn(
        "h-full flex flex-col",
        compact ? "p-1" : "p-2",
        displayHeight < 50 && "p-1"
      )}>
        <div className={cn("flex items-start", compact ? "gap-1" : "gap-2")}>
          {/* Completion checkbox */}
          {block.is_completable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              aria-label={completed ? "Mark incomplete" : "Mark complete"}
              className={cn(
                "flex-shrink-0 rounded-full border-2 flex items-center justify-center",
                "transition-colors duration-150",
                compact ? "w-4 h-4" : "w-5 h-5 mt-0.5",
                completed
                  ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                  : "border-[var(--text-muted)] hover:border-[var(--accent-success)]"
              )}
            >
              {completed && <Check size={compact ? 10 : 12} className="text-white" />}
            </button>
          )}

          {/* Title */}
          <span
            className={cn(
              "flex-1 font-medium truncate",
              compact ? "text-xs" : "text-sm",
              completed
                ? "line-through text-[var(--text-muted)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {block.title}
          </span>
        </div>

        {/* Details row (only for taller blocks, hidden in compact mode) */}
        {displayHeight >= 50 && !completed && !compact && (
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatTime(block.start_time)} - {formatTime(block.end_time)}
            </span>
            {block.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={10} />
                <span className="truncate max-w-[100px]">{block.location}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

/**
 * Ghost block preview for empty slot hover.
 */
const GhostBlock = memo(function GhostBlock({
  top,
  height,
  left,
  width,
  startTime,
  endTime,
  onClick,
  isEmpty,
}: {
  top: number;
  height: number;
  left: number;
  width: number;
  startTime: string;
  endTime: string;
  onClick: () => void;
  isEmpty?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "absolute",
        "border-2 border-dashed",
        isEmpty
          ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5"
          : "border-[var(--border-default)] bg-[var(--bg-hover)]/50",
        "flex flex-col items-center justify-center gap-1",
        "cursor-cell transition-colors duration-150",
        "hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10",
        isEmpty && "animate-pulse-subtle"
      )}
      style={{
        top,
        left,
        width,
        height,
        borderRadius: BLOCK_RADIUS,
      }}
      onClick={onClick}
    >
      <Plus size={18} className={cn(
        "transition-colors",
        isEmpty ? "text-[var(--accent-primary)]/70" : "text-[var(--text-muted)]"
      )} />
      <span className={cn(
        "text-xs font-medium",
        isEmpty ? "text-[var(--accent-primary)]/70" : "text-[var(--text-muted)]"
      )}>
        Click to add
      </span>
      <span className="text-[10px] text-[var(--text-muted)]">
        {formatTime(startTime)} - {formatTime(endTime)}
      </span>
    </motion.div>
  );
});

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function CalendarDayView({
  date,
  blocks,
  onToggleBlock,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  startHour = 6,
  endHour = 22,
  compact = false,
}: CalendarDayViewProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoverSlot, setHoverSlot] = useState<{
    startMinutes: number;
    endMinutes: number;
  } | null>(null);

  // Get dimensions based on compact mode
  const { hourHeight, timeLabelWidth } = getDimensions(compact);

  // Measure content width for block positioning
  const contentWidth = useContentWidth(gridRef, timeLabelWidth);

  // Current time for NOW indicator
  const currentTime = useCurrentTime();
  const isToday = date === getTodayISO();

  // Smart time window calculation - shows relevant hours instead of full 16 hours
  const { startHour: smartStart, endHour: smartEnd } = useMemo(() => {
    // Use provided values if explicitly overridden (not default 6-22)
    if (startHour !== 6 || endHour !== 22) {
      return { startHour, endHour };
    }
    return calculateSmartTimeWindow(blocks, isToday, currentTime.getHours());
  }, [blocks, isToday, currentTime, startHour, endHour]);

  // Calculate grid dimensions using smart time window
  const totalHours = smartEnd - smartStart;
  const totalHeight = totalHours * hourHeight;
  const startMinutesGrid = smartStart * 60;
  const endMinutesGrid = smartEnd * 60;

  // Calculate NOW line position in pixels
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const showNowLine =
    isToday &&
    currentMinutes >= startMinutesGrid &&
    currentMinutes <= endMinutesGrid;
  const nowTopPx =
    ((currentMinutes - startMinutesGrid) / 60) * hourHeight;

  // Generate hour markers using smart time window
  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = smartStart; i <= smartEnd; i++) {
      h.push(i);
    }
    return h;
  }, [smartStart, smartEnd]);

  // Process blocks: calculate positions and detect collisions
  const processedBlocks = useMemo(() => {
    // First pass: calculate basic positioning
    const basicBlocks = blocks
      .map(({ block, completed }) => {
        const start = parseTimeToMinutes(block.start_time);
        const end = parseTimeToMinutes(block.end_time);

        // Skip blocks outside visible range
        if (end <= startMinutesGrid || start >= endMinutesGrid) return null;

        // Clamp to visible range
        const visibleStart = Math.max(start, startMinutesGrid);
        const visibleEnd = Math.min(end, endMinutesGrid);

        const top = ((visibleStart - startMinutesGrid) / 60) * hourHeight;
        const duration = visibleEnd - visibleStart;
        const height = Math.max((duration / 60) * hourHeight, MIN_BLOCK_HEIGHT);

        return {
          block,
          completed,
          top,
          height,
          startMinutes: start,
          endMinutes: end,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    // Second pass: compute collision groups and column assignments
    return computeCollisionGroups(basicBlocks);
  }, [blocks, startMinutesGrid, endMinutesGrid, hourHeight]);

  // Calculate pixel positions for blocks
  const blockPositions = useMemo(() => {
    if (contentWidth <= 0) return [];

    return processedBlocks.map((item) => {
      const { totalColumns, columnIndex } = item;

      // Calculate width and left position in pixels
      const totalGaps = (totalColumns - 1) * BLOCK_GAP;
      const blockWidth = (contentWidth - totalGaps) / totalColumns;
      const blockLeft =
        timeLabelWidth + columnIndex * (blockWidth + BLOCK_GAP);

      return {
        ...item,
        left: blockLeft,
        width: blockWidth,
      };
    });
  }, [processedBlocks, contentWidth, timeLabelWidth]);

  // Handle mouse move for ghost block
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const scrollTop = gridRef.current.scrollTop;
      const y = e.clientY - rect.top + scrollTop;

      // Calculate minutes from position
      const minutes =
        startMinutesGrid +
        (y / totalHeight) * (endMinutesGrid - startMinutesGrid);

      // Snap to 30-minute intervals
      const snappedStart = Math.round(minutes / 30) * 30;
      const snappedEnd = snappedStart + 60; // Default 1-hour block

      // Check bounds
      if (snappedStart < startMinutesGrid || snappedEnd > endMinutesGrid) {
        setHoverSlot(null);
        return;
      }

      // Check if overlapping with existing block
      const overlapsBlock = blocks.some((b) => {
        const blockStart = parseTimeToMinutes(b.block.start_time);
        const blockEnd = parseTimeToMinutes(b.block.end_time);
        return doTimesOverlap(snappedStart, snappedEnd, blockStart, blockEnd);
      });

      if (overlapsBlock) {
        setHoverSlot(null);
      } else {
        setHoverSlot({ startMinutes: snappedStart, endMinutes: snappedEnd });
      }
    },
    [blocks, startMinutesGrid, endMinutesGrid, totalHeight]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverSlot(null);
  }, []);

  // Handle click on ghost block
  const handleAddBlockClick = useCallback(() => {
    if (!hoverSlot) return;

    const dayOfWeek = getDayOfWeek(date);
    onAddBlock({
      start_time: minutesToTimeString(hoverSlot.startMinutes),
      end_time: minutesToTimeString(hoverSlot.endMinutes),
      days_of_week: [dayOfWeek],
    });
    setHoverSlot(null);
  }, [hoverSlot, date, onAddBlock]);

  // Calculate ghost block position in pixels
  const ghostTop = hoverSlot
    ? ((hoverSlot.startMinutes - startMinutesGrid) / 60) * hourHeight
    : 0;
  const ghostHeight = hoverSlot
    ? ((hoverSlot.endMinutes - hoverSlot.startMinutes) / 60) * hourHeight
    : 0;

  return (
    <div
      ref={gridRef}
      className={cn(
        "relative overflow-y-auto overflow-x-hidden custom-scrollbar",
        compact ? "max-h-[400px]" : "max-h-[500px]"
      )}
      style={{ height: Math.min(totalHeight + 20, compact ? 400 : 500) }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Time grid background */}
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour lines */}
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="absolute left-0 right-0"
            style={{ top: (hour - smartStart) * hourHeight }}
          >
            <HourLine
              hour={hour}
              isLast={index === hours.length - 1}
              compact={compact}
              timeLabelWidth={timeLabelWidth}
            />
          </div>
        ))}

        {/* Schedule blocks */}
        <AnimatePresence>
          {blockPositions.map(({ block, completed, top, height, left, width }) => (
            <CalendarBlock
              key={block.id}
              block={block}
              completed={completed}
              onToggle={() => onToggleBlock(block.id)}
              onEdit={onEditBlock ? () => onEditBlock(block) : undefined}
              onDelete={onDeleteBlock ? () => onDeleteBlock(block.id) : undefined}
              top={top}
              height={height}
              left={left}
              width={width}
              compact={compact}
            />
          ))}
        </AnimatePresence>

        {/* Ghost block for hover */}
        <AnimatePresence>
          {hoverSlot && contentWidth > 0 && (
            <GhostBlock
              top={ghostTop}
              height={ghostHeight}
              left={timeLabelWidth}
              width={contentWidth}
              startTime={minutesToTimeString(hoverSlot.startMinutes)}
              endTime={minutesToTimeString(hoverSlot.endMinutes)}
              onClick={handleAddBlockClick}
              isEmpty={blocks.length === 0}
            />
          )}
        </AnimatePresence>

        {/* NOW indicator */}
        {showNowLine && (
          <NowIndicator
            topPx={nowTopPx}
            currentTime={currentTime}
            timeLabelWidth={timeLabelWidth}
            compact={compact}
          />
        )}
      </div>

      {/* Welcoming empty state */}
      {blocks.length === 0 && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="text-center p-6 max-w-[200px]">
            <div className={cn(
              "mx-auto mb-3 w-12 h-12 rounded-xl",
              "bg-[rgba(var(--accent-primary-rgb),0.1)]",
              "border border-[rgba(var(--accent-primary-rgb),0.15)]",
              "flex items-center justify-center"
            )}>
              <Calendar size={22} className="text-[var(--accent-primary)]" />
            </div>
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Plan Your Day
            </h4>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Add time blocks for classes, study, or breaks
            </p>
            <p className="text-[10px] mt-3 px-2 py-1 rounded-full inline-block bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
              Click anywhere to add
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
