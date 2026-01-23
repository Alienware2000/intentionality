"use client";

// =============================================================================
// CTA SECTION
// Final call-to-action with sign-up prompt.
// Direct, honest messaging that matches the philosophy.
// =============================================================================

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-6" ref={containerRef}>
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)]">
            This won&apos;t work unless you do.
          </h2>
          <p className="mt-6 text-lg text-[var(--text-secondary)] max-w-xl mx-auto">
            If you&apos;re ready to put in the effort, Intentionality will help
            you stay clear, focused, and accountable.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10"
        >
          <Link
            href="/auth"
            className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-[var(--accent-primary)] text-white font-semibold text-lg rounded-xl hover:bg-[var(--accent-primary)]/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[var(--accent-primary)]/20"
          >
            Get Started
            <ArrowRight
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Free to use. No credit card required.
          </p>
        </motion.div>

        {/* Subtle divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={
            isInView ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }
          }
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent"
        />

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 text-sm text-[var(--text-muted)]"
        >
          Built with intention. Designed for focus.
        </motion.p>
      </div>
    </section>
  );
}
