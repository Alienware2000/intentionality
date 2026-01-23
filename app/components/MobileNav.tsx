"use client";

// =============================================================================
// MOBILE NAVIGATION COMPONENT
// Bottom navigation bar for mobile devices with hamburger menu.
// Fixed to bottom on mobile, hidden on desktop (md+).
// Includes floating action button for Brain Dump quick capture.
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
  ClipboardList,
  BookOpen,
  Inbox,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
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
      <button
        onClick={openBrainDump}
        className={cn(
          "fixed right-4 bottom-20 z-40 md:hidden",
          "w-12 h-12 rounded-full",
          "bg-[var(--accent-primary)] text-white",
          "flex items-center justify-center",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-200",
          "active:scale-95"
        )}
        aria-label="Quick capture"
      >
        <Brain size={22} />
      </button>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--bg-card)] border-t border-[var(--border-default)] pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full",
                  "transition-colors min-w-[64px]",
                  isActive
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                <Icon size={22} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute top-0 h-0.5 w-12 bg-[var(--accent-primary)]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full",
              "text-[var(--text-muted)] min-w-[64px]"
            )}
          >
            <Menu size={22} />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Hamburger Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 modal-backdrop z-50 md:hidden"
              onClick={() => setMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "fixed top-0 right-0 bottom-0 w-full max-w-xs z-50 md:hidden",
                "bg-[var(--bg-base)] border-l border-[var(--border-default)]",
                "flex flex-col pb-20"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                  Menu
                </h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Kofi AI Button - Prominent placement in mobile menu */}
              <div className="p-4 border-b border-[var(--border-default)]">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    openChat();
                  }}
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
                </button>
              </div>

              {/* Profile Section */}
              <div className="p-4 border-b border-[var(--border-default)]">
                {loading ? (
                  <div className="h-20 animate-pulse bg-[var(--skeleton-bg)] rounded-lg" />
                ) : profile ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-mono font-bold text-[var(--text-primary)]">
                        LVL {profile.level}
                      </span>
                      <span className="text-sm font-mono text-[var(--text-muted)]">
                        {profile.xp_total} XP
                      </span>
                    </div>
                    <XpBar totalXp={profile.xp_total} showLevel={false} size="sm" />
                    <div className="pt-2">
                      <StreakBadge streak={profile.current_streak} size="sm" />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Menu Items */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-1">
                <Link
                  href="/inbox"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors",
                    pathname === "/inbox" && "bg-[var(--bg-card)] text-[var(--text-primary)]"
                  )}
                >
                  <Inbox size={20} />
                  Inbox
                </Link>
                <Link
                  href="/plan"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors",
                    pathname === "/plan" && "bg-[var(--bg-card)] text-[var(--text-primary)]"
                  )}
                >
                  <ClipboardList size={20} />
                  Plan
                </Link>
                <Link
                  href="/review"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors",
                    pathname === "/review" && "bg-[var(--bg-card)] text-[var(--text-primary)]"
                  )}
                >
                  <BookOpen size={20} />
                  Review
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors",
                    pathname === "/settings" && "bg-[var(--bg-card)] text-[var(--text-primary)]"
                  )}
                >
                  <Settings size={20} />
                  Settings
                </Link>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-[var(--border-default)] space-y-1">
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg",
                    "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    "hover:bg-[var(--bg-hover)] transition-colors"
                  )}
                >
                  <LogOut size={20} />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
