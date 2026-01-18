"use client";

// =============================================================================
// SIDEBAR COMPONENT
// Navigation sidebar with user profile, XP bar, and stats.
// anime.js inspired: minimal design with line accents.
// =============================================================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Calendar, Target, Inbox, Settings, BarChart3, Sun, Moon } from "lucide-react";
import { cn } from "@/app/lib/cn";
import XpBar from "./XpBar";
import StreakBadge from "./StreakBadge";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { useProfile } from "./ProfileProvider";
import { useTheme } from "./ThemeProvider";
import { getTitleForLevel } from "@/app/lib/gamification";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Week", href: "/week", icon: Calendar },
  { label: "Quests", href: "/quests", icon: Target },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
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
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <aside className="hidden md:flex h-screen w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] text-white flex-col">
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
          <Link href="/analytics" className="block group">
            <div className="space-y-3 p-3 -mx-3 rounded-lg transition-colors group-hover:bg-[var(--bg-hover)]">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                    LVL {profile.level}
                  </span>
                  <span className="ml-2 text-xs text-[var(--accent-highlight)]">
                    {getTitleForLevel(profile.level)}
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {profile.xp_total.toLocaleString()} XP
                </span>
              </div>
              <XpBar totalXp={profile.xp_total} showLevel={false} size="sm" />
            </div>
          </Link>
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

      {/* Theme Toggle & Sign Out */}
      <div className="p-6 pt-0 space-y-1">
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] transition-colors duration-150"
          )}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span className="text-sm">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
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
