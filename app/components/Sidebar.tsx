"use client";

// =============================================================================
// SIDEBAR COMPONENT
// Navigation sidebar with user profile, XP bar, and stats.
// anime.js inspired: minimal design with line accents.
// =============================================================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, Calendar, Target, Inbox, Settings, BarChart3, Sun, Moon, HelpCircle, BookOpen, ClipboardList, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/cn";
import XpBar from "./XpBar";
import StreakBadge from "./StreakBadge";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { useProfile } from "./ProfileProvider";
import { useTheme } from "./ThemeProvider";
import { useAI } from "./AIProvider";
import { getTitleForLevel } from "@/app/lib/gamification";
import { XpBarTooltip, StreakTooltip } from "./HelpTooltip";
import { fetchApi } from "@/app/lib/api";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Week", href: "/week", icon: Calendar },
  { label: "Quests", href: "/quests", icon: Target },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Plan", href: "/plan", icon: ClipboardList },
  { label: "Review", href: "/review", icon: BookOpen },
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
  const { openChat } = useAI();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  async function handleResetOnboarding() {
    try {
      // Reset onboarding in database
      await fetchApi("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      // Also clear localStorage for backwards compatibility
      localStorage.removeItem("intentionality_onboarding_progress");
      localStorage.removeItem("intentionality_onboarding_collapsed");
      // Reload to show the guide
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Failed to reset onboarding:", error);
    }
  }

  return (
    <aside className="hidden md:flex h-screen w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] text-white flex-col">
      {/* Header - fixed */}
      <div className="flex-shrink-0 p-6 pb-4">
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Intentionality
        </h1>
        <div className="mt-2 h-[2px] bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
      </div>

      {/* Kofi AI Button - prominent position */}
      <div className="flex-shrink-0 px-6 pb-4">
        <button
          type="button"
          onClick={openChat}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-[var(--accent-primary)]/10",
            "border border-[var(--accent-primary)]/20",
            "text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/20",
            "transition-all duration-200"
          )}
        >
          <Sparkles size={20} />
          <span className="font-medium">Ask Kofi</span>
          <span className="ml-auto text-xs text-[var(--text-muted)]">
            Ctrl+Shift+K
          </span>
        </button>
      </div>

      {/* User Profile Section - fixed */}
      <div className="flex-shrink-0 px-6 pb-4">
        {loading ? (
          <div className="h-16 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
        ) : profile ? (
          <Link href="/analytics" className="block group">
            <div className="space-y-3 p-3 -mx-3 rounded-lg transition-colors group-hover:bg-[var(--bg-hover)]">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                    LVL {profile.level}
                  </span>
                  <span className="ml-1 text-xs text-[var(--accent-highlight)]">
                    {getTitleForLevel(profile.level)}
                  </span>
                  <XpBarTooltip />
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
      <div className="flex-shrink-0 mx-6 h-px bg-[var(--border-subtle)]" />

      {/* Navigation - scrollable */}
      <nav className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-1">
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

      {/* Compact Footer - fixed */}
      <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          {/* Streak badge on left */}
          <div className="flex items-center gap-2">
            {profile && (
              <>
                <StreakBadge streak={profile.current_streak} size="sm" />
                <StreakTooltip />
              </>
            )}
          </div>
          {/* Actions on right - icon only */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={handleResetOnboarding}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Help & Guide"
            >
              <HelpCircle size={16} />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
