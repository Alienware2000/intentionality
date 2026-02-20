"use client";

// =============================================================================
// SIDEBAR COMPONENT
// Navigation sidebar with user profile, XP bar, and stats.
// Enhanced with glassmorphism, animated navigation indicators, and micro-interactions.
// Supports collapsed state for desktop with icon-only rail (64px).
// =============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, LayoutDashboard, Calendar, Target, Inbox, Settings, BarChart3, Sun, Moon, HelpCircle, BookOpen, Sparkles, Trophy, Users, UsersRound, Palette, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import anime from "animejs";
import { cn } from "@/app/lib/cn";
import XpBar from "./XpBar";
import StreakBadge from "./StreakBadge";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { useProfile } from "./ProfileProvider";
import { useTheme, ACCENT_THEMES, ACCENT_THEME_ORDER, BASE_THEMES, BASE_THEME_ORDER } from "./ThemeProvider";
import { useAI } from "./AIProvider";
import { useSidebar } from "./SidebarProvider";
import { useFreemium } from "./FreemiumProvider";
import { getTitleForLevel } from "@/app/lib/gamification";
import { XpBarTooltip } from "./HelpTooltip";
import { fetchApi } from "@/app/lib/api";
import { prefersReducedMotion } from "@/app/lib/anime-utils";
import SidebarTooltip from "./SidebarTooltip";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Week", href: "/week", icon: Calendar },
  { label: "Quests", href: "/quests", icon: Target },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Review", href: "/review", icon: BookOpen },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  // Social features
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Groups", href: "/groups", icon: UsersRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * Sidebar provides main navigation and displays user profile stats.
 * Shows level, XP, and streak from ProfileProvider context.
 * Supports collapsed state (icon-only rail) on desktop.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useProfile();
  const { theme, accent, baseTheme, setTheme, setAccent, setBaseTheme } = useTheme();
  const { openChat } = useAI();
  const { isCollapsed, toggleSidebar, animationsEnabled } = useSidebar();
  const { openUpgradeModal } = useFreemium();
  const xpBarRef = useRef<HTMLDivElement>(null);
  const prevXpRef = useRef<number | null>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const [showAccentPicker, setShowAccentPicker] = useState(false);

  // Close theme picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themePickerRef.current && !themePickerRef.current.contains(event.target as Node)) {
        setShowAccentPicker(false);
      }
    }

    if (showAccentPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAccentPicker]);

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

  // Get XP progress for mini bar in collapsed state
  const getXpProgress = () => {
    if (!profile) return 0;
    // Simple calculation - would use getLevelProgressV2 in production
    const xpInLevel = profile.xp_total % 100;
    return xpInLevel;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex fixed inset-y-0 left-0 z-40",
        "border-r border-[var(--border-subtle)] bg-[var(--bg-base)] text-white flex-col glass-card",
        isCollapsed ? "w-16" : "w-64",
        animationsEnabled && "transition-[width] duration-200 ease-out"
      )}
    >
      {/* Header - fixed */}
      <div className={cn("flex-shrink-0 p-6 pb-4", isCollapsed && "p-4 pb-3")}>
        {isCollapsed ? (
          <SidebarTooltip label="Intentionality">
            <div className="flex items-center justify-center">
              {/* Collapsed logo: 40px circle with large "I" */}
              <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 flex items-center justify-center">
                <span className="text-xl font-bold text-[var(--accent-primary)]">I</span>
              </div>
            </div>
          </SidebarTooltip>
        ) : (
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
              Intentionality
            </h1>
            <motion.button
              type="button"
              onClick={() => openUpgradeModal("sidebar_header")}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-lg text-[var(--accent-highlight)] hover:bg-[var(--accent-highlight)]/10 transition-colors"
              title="Upgrade to Pro"
            >
              <Crown size={14} />
            </motion.button>
          </div>
        )}
      </div>

      {/* Kofi AI Button - prominent position with glow */}
      <div className={cn("flex-shrink-0 px-6 pb-4", isCollapsed && "px-3 pb-3")}>
        {isCollapsed ? (
          <SidebarTooltip label="Ask Kofi" shortcut="Ctrl+Shift+K">
            <motion.button
              type="button"
              onClick={openChat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl",
                "bg-[var(--accent-primary)]/10",
                "border border-[var(--accent-primary)]/20",
                "text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/20",
                "transition-all duration-200",
                "glow-primary-hover"
              )}
              aria-label="Ask Kofi AI"
            >
              <Sparkles size={18} className="text-[var(--accent-primary)]" />
            </motion.button>
          </SidebarTooltip>
        ) : (
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
        )}
      </div>

      {/* User Profile Section - fixed */}
      <div className={cn("flex-shrink-0 px-6 pb-4", isCollapsed && "px-3 pb-3")}>
        {loading ? (
          <div className={cn("animate-pulse bg-[var(--skeleton-bg)] rounded-lg", isCollapsed ? "h-10 w-10" : "h-16")} />
        ) : profile ? (
          isCollapsed ? (
            <SidebarTooltip label={`Level ${profile.level} · ${profile.xp_total.toLocaleString()} XP`}>
              <Link href="/analytics" className="block">
                <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 hover:bg-[var(--bg-hover)]">
                  <span
                    className="text-xs font-mono font-bold text-[var(--accent-primary)]"
                    style={{ textShadow: "0 0 8px rgba(var(--accent-primary-rgb), 0.3)" }}
                  >
                    L{profile.level}
                  </span>
                  {/* Mini XP progress bar - wider for better visibility */}
                  <div className="w-8 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent-primary)]"
                      style={{ width: `${getXpProgress()}%` }}
                    />
                  </div>
                </div>
              </Link>
            </SidebarTooltip>
          ) : (
            <Link href="/analytics" className="block group">
              <div
                ref={xpBarRef}
                className="level-component-container space-y-3 p-3 -mx-3 rounded-lg transition-all duration-200 group-hover:bg-[var(--bg-hover)] group-hover:shadow-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-1.5">
                      <motion.span
                        className="text-2xl font-mono font-bold text-[var(--accent-primary)]"
                        style={{ textShadow: "0 0 15px rgba(var(--accent-primary-rgb), 0.35)" }}
                        initial={false}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        LVL {profile.level}
                      </motion.span>
                      <XpBarTooltip />
                    </div>
                    <span
                      className="text-xs font-mono text-[var(--accent-highlight)]"
                      style={{ textShadow: "0 0 8px rgba(var(--accent-highlight-rgb), 0.2)" }}
                    >
                      {profile.xp_total.toLocaleString()} XP
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[var(--accent-highlight)] level-title-badge">
                    {getTitleForLevel(profile.level)}
                  </span>
                </div>
                <XpBar totalXp={profile.xp_total} showLevel={false} size="sm" />
              </div>
            </Link>
          )
        ) : null}
      </div>

      {/* Divider */}
      <div className={cn("flex-shrink-0 h-px bg-[var(--border-subtle)]", isCollapsed ? "mx-3" : "mx-6")} />

      {/* Navigation - scrollable */}
      <nav className={cn("flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1", isCollapsed ? "p-3" : "p-6")}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center rounded-lg",
                "transition-all duration-150",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2",
                isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
              aria-label={isCollapsed ? item.label : undefined}
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
              {!isCollapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );

          if (isCollapsed) {
            return (
              <SidebarTooltip key={item.href} label={item.label}>
                {linkContent}
              </SidebarTooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Compact Footer - fixed */}
      <div className={cn("flex-shrink-0 border-t border-[var(--border-subtle)]", isCollapsed ? "p-2" : "p-4")}>
        {isCollapsed ? (
          // Collapsed footer: crown and toggle button
          <div className="flex flex-col items-center gap-1">
            <SidebarTooltip label="Upgrade to Pro">
              <motion.button
                type="button"
                onClick={() => openUpgradeModal("sidebar")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg text-[var(--accent-highlight)] hover:bg-[var(--accent-highlight)]/10 transition-colors"
                aria-label="Upgrade to Pro"
              >
                <Crown size={16} />
              </motion.button>
            </SidebarTooltip>
            <SidebarTooltip label="Expand sidebar" shortcut="Ctrl+B">
              <motion.button
                type="button"
                onClick={toggleSidebar}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                aria-expanded={!isCollapsed}
                aria-label="Expand sidebar"
              >
                <ChevronRight size={16} />
              </motion.button>
            </SidebarTooltip>
          </div>
        ) : (
          // Expanded footer: full controls (removed StreakTooltip - duplicate help icon)
          <div className="flex items-center justify-between">
            {/* Streak badge on left */}
            <div className="flex items-center gap-2">
              {profile && (
                <motion.div whileHover={{ scale: 1.05 }}>
                  <StreakBadge streak={profile.current_streak} size="sm" />
                </motion.div>
              )}
            </div>
            {/* Actions on right - icon only with micro-interactions */}
            <div className="flex items-center gap-1">
              {/* Unified theme picker */}
              <div className="relative" ref={themePickerRef}>
                <motion.button
                  type="button"
                  onClick={() => setShowAccentPicker(!showAccentPicker)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                  title="Appearance"
                >
                  <Palette size={16} style={{ color: ACCENT_THEMES[accent].primary }} />
                </motion.button>

                {/* Theme picker popup */}
                <AnimatePresence>
                  {showAccentPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-lg z-50 min-w-[180px]"
                    >
                      {/* Accent colors */}
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Accent</div>
                      <div className="flex gap-1.5">
                        {ACCENT_THEME_ORDER.map((themeKey) => {
                          const themeData = ACCENT_THEMES[themeKey];
                          const isActive = accent === themeKey;
                          return (
                            <motion.button
                              key={themeKey}
                              type="button"
                              onClick={() => setAccent(themeKey)}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              className={cn(
                                "w-6 h-6 rounded-full transition-all duration-150",
                                isActive && "ring-2 ring-white/40 ring-offset-1 ring-offset-[var(--bg-card)]"
                              )}
                              style={{ backgroundColor: themeData.primary }}
                              title={`${themeData.name} - ${themeData.description}`}
                            />
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-[var(--border-subtle)] my-2.5" />

                      {/* Base theme - only in dark mode */}
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                        Background
                        {theme === "light" && <span className="text-[9px] normal-case">(dark only)</span>}
                      </div>
                      <div className={cn("flex gap-1.5", theme === "light" && "opacity-40 pointer-events-none")}>
                        {BASE_THEME_ORDER.map((base) => (
                          <button
                            key={base}
                            type="button"
                            onClick={() => setBaseTheme(base)}
                            disabled={theme === "light"}
                            className={cn(
                              "flex-1 px-2.5 py-1.5 text-xs rounded-md transition-all duration-150",
                              baseTheme === base && theme === "dark"
                                ? "bg-[var(--accent-primary)]/20 text-[var(--text-primary)] ring-1 ring-[var(--accent-primary)]/30"
                                : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                            )}
                          >
                            {BASE_THEMES[base].name}
                          </button>
                        ))}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-[var(--border-subtle)] my-2.5" />

                      {/* Theme mode toggle */}
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Mode</div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTheme("light")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-150",
                            theme === "light"
                              ? "bg-[var(--accent-primary)]/20 text-[var(--text-primary)] ring-1 ring-[var(--accent-primary)]/30"
                              : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                          )}
                        >
                          <Sun size={12} /> Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("dark")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-150",
                            theme === "dark"
                              ? "bg-[var(--accent-primary)]/20 text-[var(--text-primary)] ring-1 ring-[var(--accent-primary)]/30"
                              : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                          )}
                        >
                          <Moon size={12} /> Dark
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
              {/* Collapse sidebar button */}
              <motion.button
                type="button"
                onClick={toggleSidebar}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                title="Collapse sidebar (Ctrl+B)"
                aria-expanded={!isCollapsed}
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={16} />
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
        )}
      </div>
    </aside>
  );
}
