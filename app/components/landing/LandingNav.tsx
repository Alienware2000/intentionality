"use client";

// =============================================================================
// LANDING NAV
// Clean, professional navigation inspired by Linear and Notion.
// Uses Geist Sans for a high-end, approachable look.
// =============================================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
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

  return (
    <motion.header
      style={{
        backgroundColor: navBackground,
        borderColor: navBorder,
      }}
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b transition-colors duration-200 backdrop-blur-lg"
    >
      <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
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

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Workflow
            </Link>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-6">
          <Link
            href="/auth"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center px-5 py-2 bg-[var(--text-primary)] text-[var(--bg-base)] font-bold rounded-lg hover:opacity-90 transition-all active:scale-[0.98] text-sm shadow-lg shadow-white/5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
