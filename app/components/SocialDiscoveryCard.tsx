"use client";

// =============================================================================
// SOCIAL DISCOVERY CARD COMPONENT
// Contextual card that introduces social features to engaged users.
// Shows after user reaches level 2 OR completes 5+ tasks.
// Dismissible with localStorage persistence.
// =============================================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, X } from "lucide-react";
import { useProfile } from "./ProfileProvider";
import { cn } from "@/app/lib/cn";
import type { UserProfileV2 } from "@/app/lib/types";

const STORAGE_KEY = "intentionality_social_discovery_dismissed";

/**
 * SocialDiscoveryCard introduces social features (Friends, Groups, Leaderboard)
 * to users who have demonstrated engagement.
 *
 * Trigger conditions (OR):
 * - User reaches level 2+
 * - User has completed 5+ lifetime tasks
 *
 * The card is dismissible and stays dismissed (localStorage).
 */
export default function SocialDiscoveryCard() {
  const { profile } = useProfile();
  const [dismissed, setDismissed] = useState(true); // Start hidden

  // Check if should show
  useEffect(() => {
    if (typeof window === "undefined") return;

    const wasDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    if (wasDismissed) return;

    // Show after level 2 OR 5+ completed tasks
    // Cast to UserProfileV2 to access lifetime_tasks_completed
    const extendedProfile = profile as UserProfileV2 | null;
    const shouldShow = (profile?.level ?? 0) >= 2 ||
                       (extendedProfile?.lifetime_tasks_completed ?? 0) >= 5;

    if (shouldShow) {
      setDismissed(false);
    }
  }, [profile]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "relative p-4 rounded-xl",
          "bg-gradient-to-r from-[var(--accent-primary)]/10 via-[var(--bg-card)] to-[var(--accent-highlight)]/10",
          "border border-[var(--accent-primary)]/20"
        )}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-[var(--accent-primary)]/10">
            <Users size={20} className="text-[var(--accent-primary)]" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-medium text-[var(--text-primary)]">
              Productivity is better together!
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Add friends, join accountability groups, and climb the leaderboard.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href="/friends"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors"
                )}
              >
                Find Friends
              </Link>
              <Link
                href="/leaderboard"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium",
                  "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
                  "hover:bg-[var(--bg-hover)] transition-colors",
                  "flex items-center gap-1.5"
                )}
              >
                <Trophy size={12} />
                Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
