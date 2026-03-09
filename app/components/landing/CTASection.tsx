"use client";

// =============================================================================
// CTA SECTION
// Refined for a "Sleek OS" terminal feel.
// Clean linear borders, matte depth, and locked messaging.
// =============================================================================

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

export default function CTASection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-48 px-6 relative flex justify-center overflow-hidden" ref={containerRef}>
      
      {/* Subtle Atmosphere Lines */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full max-h-screen w-px bg-gradient-to-b from-transparent via-[var(--border-default)] to-transparent opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="relative p-12 md:p-24 text-center bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden glass-surface">
          
          {/* Subtle Accent Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--accent-primary-rgb),0.03),transparent_70%)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center p-3 mb-8 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] shadow-sm">
               <Zap size={24} strokeWidth={2} />
            </div>

            <div className="text-label text-[var(--accent-primary)] mb-4">Get Started</div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-8 tracking-tight leading-none">
              Ready to take control?
            </h2>
            
            <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-12 leading-relaxed">
              Stop pretending to work. Start actually finishing things.
              Intentionality is free for students. No trial periods, no strings attached.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth?mode=signup"
                className="group relative w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 bg-[var(--accent-primary)] text-white font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-sm shadow-xl shadow-red-500/20"
              >
                Launch Dashboard
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <Link
                href="/auth"
                className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/50 hover:bg-[var(--bg-hover)] transition-all text-sm"
              >
                Access Account
              </Link>
            </div>
            
            <div className="mt-20 pt-12 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-8 opacity-50">
               <div className="space-y-1">
                  <div className="text-label text-[9px]">Identity</div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Student-First</div>
               </div>
               <div className="space-y-1">
                  <div className="text-label text-[9px]">Status</div>
                  <div className="text-xs font-bold text-[var(--accent-success)]">Always Free</div>
               </div>
               <div className="space-y-1">
                  <div className="text-label text-[9px]">Build</div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Public Beta</div>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
