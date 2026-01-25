"use client";

// =============================================================================
// SIDEBAR COMPONENT
// Navigation sidebar with user profile, XP bar, and stats.
// Enhanced with glassmorphism, animated navigation indicators, and micro-interactions.
// =============================================================================

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, LayoutDashboard, Calendar, Target, Inbox, Settings, BarChart3, Sun, Moon, HelpCircle, BookOpen, ClipboardList, Sparkles } from "lucide-react";
import anime from "animejs";
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
import { prefersReducedMotion } from "@/app/lib/anime-utils";

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
  const xpBarRef = useRef<HTMLDivElement>(null);
  const prevXpRef = useRef<number | null>(null);

  // Animate XP bar on load and changes
  useEffect(() => {
    if (profile && xpBarRef.current && !prefersReducedMotion()) {
      // Only animate if XP changed
      if (prevXpRef.current !== null && prevXpRef.current !== profile.xp_total) {
        anime({
          targets: xpBarRef.current,
          scale: [1, 1.02, 1],
          duration: 300,
          easing: "easeOutQuad",
        });
      }
      prevXpRef.current = profile.xp_total;
    }
  }, [profile?.xp_total, profile]);

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
    <aside className="hidden md:flex h-screen w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-base)] text-white flex-col glass-card">
      {/* Header - fixed */}
      <div className="flex-shrink-0 p-6 pb-4">
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Intentionality
        </h1>
      </div>

      {/* Kofi AI Button - prominent position with glow */}
      <div className="flex-shrink-0 px-6 pb-4">
        <motion.button
          type="button"
          onClick={openChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-[var(--accent-primary)]/10",
            "border border-[var(--accent-primary)]/20",
            "text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/20",
            "transition-all duration-200",
            "glow-primary-hover"
          )}
        >
          <Sparkles size={20} className="text-[var(--accent-primary)]" />
          <span className="font-medium">Ask Kofi</span>
          <span className="ml-auto text-xs text-[var(--text-muted)]">
            Ctrl+Shift+K
          </span>
        </motion.button>
      </div>

      {/* User Profile Section - fixed */}
      <div className="flex-shrink-0 px-6 pb-4">
        {loading ? (
          <div className="h-16 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
        ) : profile ? (
          <Link href="/analytics" className="block group">
            <div
              ref={xpBarRef}
              className="space-y-3 p-3 -mx-3 rounded-lg transition-all duration-200 group-hover:bg-[var(--bg-hover)] group-hover:shadow-lg"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1">
                  <motion.span
                    className="text-2xl font-mono font-bold text-[var(--text-primary)]"
                    initial={false}
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    LVL {profile.level}
                  </motion.span>
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
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg",
                "transition-all duration-150",
                isActive
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              {/* Animated active indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent-primary)]"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
              </AnimatePresence>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <Icon size={18} />
              </motion.div>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Compact Footer - fixed */}
      <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          {/* Streak badge on left with subtle glow */}
          <div className="flex items-center gap-2">
            {profile && (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    profile.current_streak > 0 && "glow-streak"
                  )}
                >
                  <StreakBadge streak={profile.current_streak} size="sm" />
                </motion.div>
                <StreakTooltip />
              </>
            )}
          </div>
          {/* Actions on right - icon only with micro-interactions */}
          <div className="flex items-center gap-1">
            <motion.button
              type="button"
              onClick={toggleTheme}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              <motion.div
                initial={false}
                animate={{ rotate: theme === "dark" ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </motion.div>
            </motion.button>
            <motion.button
              type="button"
              onClick={handleResetOnboarding}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Help & Guide"
            >
              <HelpCircle size={16} />
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSignOut}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </motion.button>
          </div>
        </div>
      </div>
    </aside>
  );
}
