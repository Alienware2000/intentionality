"use client";

// =============================================================================
// LANDING NAV
// Clean, professional navigation inspired by Linear and Notion.
// Uses Geist Sans for a high-end, approachable look.
// =============================================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  const navBackground = useTransform(
    scrollY,
    [0, 50],
    ["rgba(24, 24, 27, 0)", "rgba(24, 24, 27, 0.8)"]
  );

  const navBorder = useTransform(
    scrollY,
    [0, 50],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.1)"]
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <motion.header
      style={{
        backgroundColor: mobileMenuOpen ? "rgba(24, 24, 27, 0.95)" : navBackground,
        borderColor: navBorder,
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-200 md:backdrop-blur-lg"
    >
      <div className="mx-auto max-w-7xl h-16 px-6 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-[var(--accent-primary)] flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="font-bold text-white text-[13px]">I</span>
            </div>
            <span className="font-bold text-[var(--text-primary)] tracking-tight text-lg">
              Intentionality
            </span>
          </Link>

          {/* Nav Links - Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Workflow
            </Link>
          </nav>
        </div>

        {/* Right: Actions - Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/auth"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] flex items-center [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
          >
            Log in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center px-5 py-2 bg-[var(--text-primary)] text-[var(--bg-base)] font-bold rounded-lg hover:opacity-90 transition-all active:scale-[0.98] text-sm shadow-lg shadow-white/5 min-h-[44px] [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
          >
            Get Started
          </Link>
        </div>

        {/* Hamburger Button - Mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] text-[var(--text-primary)]"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-[var(--border-subtle)] bg-[rgba(24,24,27,0.95)]"
          >
            <nav className="flex flex-col px-6 py-4 gap-1">
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
              >
                Workflow
              </Link>
              <div className="h-px bg-[var(--border-subtle)] my-2" />
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors [touch-action:manipulation] [-webkit-tap-highlight-color:transparent]"
              >
                Log in
              </Link>
              <Link
                href="/auth?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center justify-center mt-2 px-5 py-2.5 bg-[var(--text-primary)] text-[var(--bg-base)] font-bold rounded-lg text-sm [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] active:scale-[0.97]"
              >
                Get Started
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
