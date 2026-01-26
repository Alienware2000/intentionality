"use client";

// =============================================================================
// GROUP CARD COMPONENT
// Displays a group preview with members count, XP, and invite code.
// =============================================================================

import { motion } from "framer-motion";
import { Users, Trophy, Copy, Check, Crown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/app/lib/cn";
import GlowCard from "@/app/components/ui/GlowCard";
import type { GroupWithMembership, GroupMemberRole } from "@/app/lib/types";

type GroupCardProps = {
  /** The group data */
  group: GroupWithMembership;
  /** Click handler to view group details */
  onClick?: () => void;
  /** Animation index for staggering */
  index?: number;
  /** Custom className */
  className?: string;
};

/** Get role badge config */
function getRoleBadge(role: GroupMemberRole) {
  switch (role) {
    case "owner":
      return { label: "Owner", icon: Crown, color: "text-amber-500" };
    case "admin":
      return { label: "Admin", icon: null, color: "text-[var(--accent-primary)]" };
    default:
      return null;
  }
}

/**
 * GroupCard displays a group preview.
 * Shows member count, total XP, user's role, and invite code.
 *
 * @example
 * <GroupCard
 *   group={group}
 *   onClick={() => router.push(`/groups/${group.id}`)}
 *   index={0}
 * />
 */
export default function GroupCard({
  group,
  onClick,
  index = 0,
  className,
}: GroupCardProps) {
  const [copied, setCopied] = useState(false);
  const roleBadge = getRoleBadge(group.my_role);

  const handleCopyInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.06,
        ease: "easeOut",
      }}
    >
      <GlowCard
        hoverLift
        hoverScale
        interactive={!!onClick}
        onClick={onClick}
        glowColor={group.my_role === "owner" ? "highlight" : "none"}
        className={className}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--text-primary)] truncate">
                {group.name}
              </h3>
              {roleBadge && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                    "bg-[var(--bg-elevated)]",
                    roleBadge.color
                  )}
                >
                  {roleBadge.icon && <roleBadge.icon size={10} />}
                  {roleBadge.label}
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                {group.description}
              </p>
            )}
          </div>

          {onClick && (
            <ExternalLink
              size={16}
              className="text-[var(--text-muted)] shrink-0 ml-2"
            />
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mt-4">
          {/* Members */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <Users size={16} className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="font-mono font-bold text-[var(--text-primary)]">
                {group.member_count}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                Members
              </p>
            </div>
          </div>

          {/* Total XP */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--accent-streak)]/10">
              <Trophy size={16} className="text-[var(--accent-streak)]" />
            </div>
            <div>
              <p className="font-mono font-bold text-[var(--text-primary)]">
                {group.total_xp.toLocaleString()}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
                Total XP
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Invite Code (for owner/admin) */}
          {(group.my_role === "owner" || group.my_role === "admin") && (
            <button
              onClick={handleCopyInvite}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]",
                "border border-[var(--border-subtle)]",
                "transition-colors duration-150"
              )}
            >
              {copied ? (
                <>
                  <Check size={12} className="text-[var(--accent-success)]" />
                  <span className="text-[var(--accent-success)]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} className="text-[var(--text-muted)]" />
                  <span className="font-mono text-[var(--text-secondary)]">
                    {group.invite_code}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Weekly contribution */}
        {group.my_weekly_xp > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-muted)]">
              Your contribution this week:{" "}
              <span className="font-mono text-[var(--accent-primary)]">
                +{group.my_weekly_xp} XP
              </span>
            </p>
          </div>
        )}
      </GlowCard>
    </motion.div>
  );
}

/**
 * GroupCardSkeleton for loading states.
 */
export function GroupCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-[var(--skeleton-bg)] animate-pulse" />
        <div className="h-4 w-64 rounded bg-[var(--skeleton-bg)] animate-pulse" />
        <div className="flex gap-4 mt-4">
          <div className="h-12 w-20 rounded bg-[var(--skeleton-bg)] animate-pulse" />
          <div className="h-12 w-24 rounded bg-[var(--skeleton-bg)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact group badge for displaying in lists.
 */
export function GroupBadge({
  name,
  memberCount,
  onClick,
}: {
  name: string;
  memberCount: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
        "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]",
        "border border-[var(--border-subtle)]",
        "transition-colors duration-150"
      )}
    >
      <Users size={14} className="text-[var(--accent-primary)]" />
      <span className="font-medium text-[var(--text-primary)]">{name}</span>
      <span className="text-xs text-[var(--text-muted)]">{memberCount}</span>
    </button>
  );
}
