"use client";

// =============================================================================
// SCHEDULE BLOCK CARD COMPONENT
// Displays a single schedule block with time, title, and optional location.
// =============================================================================

import { Clock, MapPin, Edit2, Trash2 } from "lucide-react";
import type { ScheduleBlock } from "@/app/lib/types";
import { formatTime } from "@/app/lib/date-utils";
import { cn } from "@/app/lib/cn";

type Props = {
  block: ScheduleBlock;
  compact?: boolean;
  onEdit?: (block: ScheduleBlock) => void;
  onDelete?: (blockId: string) => void;
};

export default function ScheduleBlockCard({
  block,
  compact = false,
  onEdit,
  onDelete,
}: Props) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
        style={{ backgroundColor: `${block.color}20`, borderLeft: `3px solid ${block.color}` }}
      >
        <span className="font-mono text-[var(--text-muted)]">
          {formatTime(block.start_time)}
        </span>
        <span className="font-medium text-[var(--text-primary)] truncate">
          {block.title}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg p-3 transition-all group",
        "border-l-4"
      )}
      style={{
        backgroundColor: `${block.color}15`,
        borderLeftColor: block.color,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-medium text-[var(--text-primary)] truncate">
            {block.title}
          </h3>

          {/* Time */}
          <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-muted)]">
            <Clock size={12} />
            <span className="font-mono">
              {formatTime(block.start_time)} - {formatTime(block.end_time)}
            </span>
          </div>

          {/* Location */}
          {block.location && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-muted)]">
              <MapPin size={12} />
              <span>{block.location}</span>
            </div>
          )}
        </div>

        {/* Actions - always visible on mobile, hover on desktop */}
        {(onEdit || onDelete) && (
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(block)}
                className={cn(
                  "p-2 sm:p-1.5 rounded",
                  "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  "hover:bg-[var(--bg-hover)] transition-colors"
                )}
              >
                <Edit2 size={16} className="sm:hidden" />
                <Edit2 size={14} className="hidden sm:block" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(block.id)}
                className={cn(
                  "p-2 sm:p-1.5 rounded",
                  "text-[var(--text-muted)] hover:text-[var(--accent-primary)]",
                  "hover:bg-[var(--bg-hover)] transition-colors"
                )}
              >
                <Trash2 size={16} className="sm:hidden" />
                <Trash2 size={14} className="hidden sm:block" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
