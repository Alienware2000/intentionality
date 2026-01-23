"use client";

// =============================================================================
// LANDING NAV
// Minimal navigation header for the landing page.
// Shows logo and sign-in link, fixed at top.
// =============================================================================

import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center font-bold text-white text-sm transition-transform group-hover:scale-105">
            I
          </div>
          <span className="font-semibold text-[var(--text-primary)] hidden sm:block">
            Intentionality
          </span>
        </Link>

        {/* Sign In */}
        <Link
          href="/auth"
          className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Sign in
        </Link>
      </div>
    </motion.nav>
  );
}
