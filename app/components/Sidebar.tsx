"use client";

// =============================================================================
// SIDEBAR COMPONENT
// Navigation sidebar with user profile, XP bar, and stats.
// anime.js inspired: minimal design with line accents.
// =============================================================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Calendar, Target } from "lucide-react";
import { cn } from "@/app/lib/cn";
import XpBar from "./XpBar";
import StreakBadge from "./StreakBadge";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { useProfile } from "./ProfileProvider";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "This Week", href: "/week", icon: Calendar },
  { label: "Quests", href: "/quests", icon: Target },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * Sidebar provides main navigation and displays user profile stats.
 * Shows level, XP, and streak from ProfileProvider context.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useProfile();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <aside className="h-screen w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] text-white flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4">
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Intentionality
        </h1>
        <div className="mt-2 h-[2px] bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
      </div>

      {/* User Profile Section */}
      <div className="px-6 pb-4">
        {loading ? (
          <div className="h-16 animate-pulse bg-[var(--bg-card)] rounded-lg" />
        ) : profile ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                LVL {profile.level}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {profile.xp_total} XP
              </span>
            </div>
            <XpBar totalXp={profile.xp_total} showLevel={false} size="sm" />
          </div>
        ) : null}
      </div>

      {/* Divider */}
      <div className="mx-6 h-px bg-[var(--border-subtle)]" />

      {/* Navigation */}
      <nav className="flex-1 p-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "transition-colors duration-150",
                isActive
                  ? "bg-[var(--bg-card)] border-l-2 border-l-[var(--accent-primary)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              <Icon size={18} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-6 h-px bg-[var(--border-subtle)]" />

      {/* Stats Section */}
      <div className="p-6 space-y-3">
        {profile && (
          <>
            <StreakBadge streak={profile.current_streak} size="sm" />
          </>
        )}
      </div>

      {/* Sign Out */}
      <div className="p-6 pt-0">
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] transition-colors duration-150"
          )}
        >
          <LogOut size={18} />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
