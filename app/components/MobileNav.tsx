"use client";

// =============================================================================
// MOBILE NAVIGATION COMPONENT
// Bottom navigation bar for mobile devices with hamburger menu.
// Fixed to bottom on mobile, hidden on desktop (md+).
// Enhanced with glass effect, animated indicators, and micro-interactions.
// =============================================================================

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Target,
  Calendar,
  BarChart3,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Brain,
  BookOpen,
  Inbox,
  Settings,
  Sparkles,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { getTitleForLevel } from "@/app/lib/gamification";
import { useProfile } from "./ProfileProvider";
import { useTheme } from "./ThemeProvider";
import { useBrainDump } from "./BrainDumpProvider";
import { useAI } from "./AIProvider";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import XpBar from "./XpBar";
import StreakBadge from "./StreakBadge";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const navItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Quests", href: "/quests", icon: Target },
  { label: "Week", href: "/week", icon: Calendar },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const { openBrainDump } = useBrainDump();
  const { openChat } = useAI();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/auth");
  }

  return (
    <>
      {/* Floating Action Button - Brain Dump (mobile only) */}
      <motion.button
        onClick={openBrainDump}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "fixed right-4 bottom-20 z-40 md:hidden",
          "w-12 h-12 rounded-full",
          "bg-[var(--accent-primary)] text-white",
          "flex items-center justify-center",
          "shadow-lg glow-primary",
          "transition-all duration-200",
          "active:scale-95"
        )}
        aria-label="Quick capture"
      >
        <Brain size={22} />
      </motion.button>

      {/* Bottom Navigation Bar - Glass effect */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass-card-elevated border-t border-[var(--border-default)] pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 h-full",
                  "transition-colors min-w-[64px] min-h-[44px]",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "active:bg-[var(--bg-hover)] active:scale-[0.97]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2",
                  isActive
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                >
                  <Icon size={22} />
                </motion.div>
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {/* Animated indicator - bubble style */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute -top-0.5 w-1 h-1 rounded-full bg-[var(--accent-primary)]"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </AnimatePresence>
              </Link>
            );
          })}

          {/* Menu Button */}
          <motion.button
            onClick={() => setMenuOpen(true)}
            whileTap={{ scale: 0.9 }}
            aria-label="Open menu"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full",
              "text-[var(--text-muted)] min-w-[64px] min-h-[44px]",
              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
              "active:bg-[var(--bg-hover)] active:scale-[0.97]",
              "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)] focus-visible:outline-offset-2"
            )}
          >
            <Menu size={22} />
            <span className="text-xs mt-1 font-medium">More</span>
          </motion.button>
        </div>
      </nav>

      {/* Hamburger Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 modal-backdrop-heavy z-50 md:hidden backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />

            {/* Menu Panel - Glass effect */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "fixed top-0 right-0 bottom-0 w-full max-w-xs z-50 md:hidden",
                "glass-card-elevated border-l border-[var(--border-default)]",
                "flex flex-col pb-20"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                  Menu
                </h2>
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => setMenuOpen(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Close menu"
                    className={cn(
                      "p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors",
                      "min-h-[44px] min-w-[44px] flex items-center justify-center",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                    )}
                  >
                    <X size={20} className="text-[var(--text-muted)]" />
                  </motion.button>
                </div>
              </div>

              {/* Kofi AI Button - Prominent placement in mobile menu */}
              <div className="p-4 border-b border-[var(--border-default)]">
                <motion.button
                  onClick={() => {
                    setMenuOpen(false);
                    openChat();
                  }}
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
                </motion.button>
              </div>

              {/* Profile Section */}
              <div className="p-4 border-b border-[var(--border-default)]">
                {loading ? (
                  <div className="h-20 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
                ) : profile ? (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-mono font-bold text-[var(--text-primary)]">
                          LVL {profile.level}
                        </span>
                        <span className="text-sm font-mono text-[var(--text-muted)]">
                          {profile.xp_total.toLocaleString()} XP
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[var(--accent-highlight)]">
                        {getTitleForLevel(profile.level)}
                      </span>
                    </div>
                    <XpBar totalXp={profile.xp_total} showLevel={false} size="sm" />
                    <div className="pt-2">
                      <StreakBadge streak={profile.current_streak} size="sm" />
                    </div>
                  </motion.div>
                ) : null}
              </div>

              {/* Menu Items with stagger animation */}
              <motion.div
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-1"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05, delayChildren: 0.15 },
                  },
                }}
              >
                {[
                  { href: "/inbox", icon: Inbox, label: "Inbox" },
                  { href: "/review", icon: BookOpen, label: "Review" },
                  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
                  { href: "/friends", icon: Users, label: "Friends" },
                  { href: "/groups", icon: UsersRound, label: "Groups" },
                  { href: "/settings", icon: Settings, label: "Settings" },
                ].map((item) => (
                  <motion.div
                    key={item.href}
                    variants={{
                      hidden: { opacity: 0, x: 20 },
                      visible: { opacity: 1, x: 0 },
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg min-h-[44px]",
                        "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        "hover:bg-[var(--bg-hover)] transition-colors",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "active:scale-[0.98] active:bg-[var(--bg-hover)]",
                        "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
                        pathname === item.href && "bg-[var(--bg-card)] text-[var(--text-primary)]"
                      )}
                    >
                      <item.icon size={20} />
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* Bottom Actions */}
              <motion.div
                className="p-4 border-t border-[var(--border-default)] space-y-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  onClick={toggleTheme}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  <motion.div
                    animate={{ rotate: theme === "dark" ? 0 : 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                  </motion.div>
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </motion.button>
                <motion.button
                  onClick={handleSignOut}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  <LogOut size={20} />
                  <span>Sign out</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
