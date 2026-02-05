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
  Crown,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { getTitleForLevel } from "@/app/lib/gamification";
import { useProfile } from "./ProfileProvider";
import { useTheme } from "./ThemeProvider";
import { useBrainDump } from "./BrainDumpProvider";
import { useAI } from "./AIProvider";
import { useFreemium } from "./FreemiumProvider";
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
  const { openUpgradeModal } = useFreemium();
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

            {/* Bottom Sheet Menu */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setMenuOpen(false);
              }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className={cn(
                "fixed left-0 right-0 bottom-0 z-50 md:hidden",
                "glass-card-elevated border-t border-[var(--border-default)]",
                "rounded-t-2xl max-h-[85vh]",
                "flex flex-col"
              )}
            >
              {/* Drag Handle */}
              <div
                className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
                aria-hidden="true"
              >
                <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]/30" />
              </div>

              {/* Kofi AI Button - Full width prominent placement */}
              <div className="px-4 pb-3">
                <motion.button
                  onClick={() => {
                    setMenuOpen(false);
                    openChat();
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl",
                    "bg-[var(--accent-primary)]/10",
                    "border border-[var(--accent-primary)]/20",
                    "text-[var(--text-primary)]",
                    "transition-all duration-200",
                    "min-h-[44px]",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "active:bg-[var(--accent-primary)]/20 active:scale-[0.98]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                  )}
                >
                  <Sparkles size={20} className="text-[var(--accent-primary)]" />
                  <span className="font-medium">Ask Kofi</span>
                </motion.button>
              </div>

              {/* 2-Column Navigation Grid */}
              <motion.div
                className="grid grid-cols-2 gap-3 px-4 pb-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
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
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2",
                        "p-4 rounded-xl min-h-[80px]",
                        "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                        "transition-all duration-200",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "active:scale-[0.97] active:bg-[var(--bg-hover)]",
                        "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
                        pathname === item.href
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                          : "hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]"
                      )}
                    >
                      <item.icon
                        size={24}
                        className={cn(
                          pathname === item.href
                            ? "text-[var(--accent-primary)]"
                            : "text-[var(--text-secondary)]"
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm font-medium",
                          pathname === item.href
                            ? "text-[var(--accent-primary)]"
                            : "text-[var(--text-primary)]"
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* Compact Profile Footer */}
              <motion.div
                className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)] pb-safe"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* Profile Info */}
                <div className="flex items-center gap-3">
                  {loading ? (
                    <div className="h-6 w-20 animate-pulse bg-[var(--skeleton-bg)] rounded" />
                  ) : profile ? (
                    <>
                      <span className="text-lg font-mono font-bold text-[var(--text-primary)]">
                        LVL {profile.level}
                      </span>
                      <StreakBadge streak={profile.current_streak} size="sm" />
                    </>
                  ) : null}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  <motion.button
                    onClick={() => {
                      setMenuOpen(false);
                      openUpgradeModal("mobile_menu");
                    }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Upgrade to Pro"
                    className={cn(
                      "p-3 rounded-lg",
                      "text-[var(--accent-highlight)]",
                      "hover:bg-[var(--accent-highlight)]/10 transition-colors",
                      "min-h-[44px] min-w-[44px] flex items-center justify-center",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "active:scale-[0.95] active:bg-[var(--accent-highlight)]/10",
                      "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                    )}
                  >
                    <Crown size={20} />
                  </motion.button>
                  <motion.button
                    onClick={toggleTheme}
                    whileTap={{ scale: 0.9 }}
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    className={cn(
                      "p-3 rounded-lg",
                      "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                      "hover:bg-[var(--bg-hover)] transition-colors",
                      "min-h-[44px] min-w-[44px] flex items-center justify-center",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "active:scale-[0.95] active:bg-[var(--bg-hover)]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                    )}
                  >
                    <motion.div
                      animate={{ rotate: theme === "dark" ? 0 : 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    </motion.div>
                  </motion.button>
                  <motion.button
                    onClick={handleSignOut}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Sign out"
                    className={cn(
                      "p-3 rounded-lg",
                      "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                      "hover:bg-[var(--bg-hover)] transition-colors",
                      "min-h-[44px] min-w-[44px] flex items-center justify-center",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "active:scale-[0.95] active:bg-[var(--bg-hover)]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                    )}
                  >
                    <LogOut size={20} />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
