"use client";

// =============================================================================
// AT-RISK MEMBERS PANEL
// Shows group members who haven't been productive recently.
// Allows sending encouragement nudges.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Heart, Loader2, Send, Clock } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi } from "@/app/lib/api";
import type { AtRiskMember } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type AtRiskMembersPanelProps = {
  groupId: string;
  members: AtRiskMember[];
  onNudgeSent?: () => void;
  className?: string;
};

// -----------------------------------------------------------------------------
// Helper: Format hours inactive
// -----------------------------------------------------------------------------

function formatInactiveTime(hours: number): string {
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    return `${days}d inactive`;
  }
  if (hours >= 24) {
    return "1d+ inactive";
  }
  return `${hours}h inactive`;
}

// -----------------------------------------------------------------------------
// Nudge Button Component
// -----------------------------------------------------------------------------

type NudgeButtonProps = {
  groupId: string;
  userId: string;
  canNudge: boolean;
  onNudgeSent?: () => void;
};

function NudgeButton({ groupId, userId, canNudge, onNudgeSent }: NudgeButtonProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleNudge = async () => {
    if (!canNudge || sending || sent) return;

    setSending(true);

    try {
      await fetchApi(`/api/groups/${groupId}/nudge`, {
        method: "POST",
        body: JSON.stringify({
          to_user_id: userId,
          message: "Keep going, you've got this! 💪",
        }),
      });
      setSent(true);
      onNudgeSent?.();
    } catch {
      // Error is shown by the API itself in toast
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--accent-success)]/10 text-[var(--accent-success)] text-xs"
      >
        <Heart size={12} fill="currentColor" />
        <span>Sent!</span>
      </motion.div>
    );
  }

  if (!canNudge) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs">
        <Clock size={12} />
        <span>Nudged today</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleNudge}
      disabled={sending}
      className={cn(
        "flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium",
        "min-h-[44px] sm:min-h-0", // Touch target compliance
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
        "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
        "hover:bg-[var(--accent-primary)]/20 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {sending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Send size={12} />
      )}
      <span>Nudge</span>
    </button>
  );
}

// -----------------------------------------------------------------------------
// At-Risk Member Row
// -----------------------------------------------------------------------------

type MemberRowProps = {
  member: AtRiskMember;
  groupId: string;
  onNudgeSent?: () => void;
};

function MemberRow({ member, groupId, onNudgeSent }: MemberRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
      )}
    >
      {/* Status indicator */}
      <div className="p-2 rounded-full bg-amber-500/10 shrink-0">
        <AlertTriangle size={14} className="text-amber-500" />
      </div>

      {/* Member info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {member.display_name || "Anonymous"}
        </p>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Lv.{member.level}</span>
          {member.current_streak > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-500">{member.current_streak}d streak at risk</span>
            </>
          )}
          <span>·</span>
          <span>{formatInactiveTime(member.hours_inactive)}</span>
        </div>
      </div>

      {/* Nudge button */}
      <NudgeButton
        groupId={groupId}
        userId={member.user_id}
        canNudge={member.can_nudge}
        onNudgeSent={onNudgeSent}
      />
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function AtRiskMembersPanel({
  groupId,
  members,
  onNudgeSent,
  className,
}: AtRiskMembersPanelProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "rounded-xl bg-[var(--bg-card)] border border-amber-500/30 p-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-amber-500/10">
          <AlertTriangle size={16} className="text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Streaks at Risk
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {members.length} member{members.length !== 1 ? "s" : ""} need encouragement
          </p>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <AnimatePresence>
          {members.map((member) => (
            <MemberRow
              key={member.user_id}
              member={member}
              groupId={groupId}
              onNudgeSent={onNudgeSent}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Loading Skeleton
// -----------------------------------------------------------------------------

export function AtRiskMembersPanelSkeleton() {
  return (
    <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--skeleton-bg)]" />
        <div className="space-y-1">
          <div className="h-4 w-24 rounded bg-[var(--skeleton-bg)]" />
          <div className="h-3 w-32 rounded bg-[var(--skeleton-bg)]" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="w-8 h-8 rounded-full bg-[var(--skeleton-bg)]" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-24 rounded bg-[var(--skeleton-bg)]" />
              <div className="h-3 w-32 rounded bg-[var(--skeleton-bg)]" />
            </div>
            <div className="h-6 w-16 rounded-lg bg-[var(--skeleton-bg)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
