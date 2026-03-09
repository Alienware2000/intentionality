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
      
      {/* Subtle Atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-px bg-gradient-to-r from-transparent via-[var(--border-default)] to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-4xl relative z-10"
      >
        <div className="relative p-12 sm:p-20 md:p-32 text-center bg-[var(--bg-card)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden">
          
          {/* Subtle Accent Gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--accent-primary-rgb),0.05),transparent_70%)]" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center p-3 mb-12 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] shadow-sm">
               <Zap size={28} strokeWidth={2} />
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-[var(--text-primary)] mb-8 tracking-tight leading-[1.1]">
              Ready to take control?
            </h2>
            
            <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-xl mx-auto mb-14 leading-relaxed font-sans">
              Stop pretending to work. Start actually finishing things.
              Intentionality is free for students. No trial periods, no strings attached.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth?mode=signup"
                className="group relative w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 bg-[var(--text-primary)] text-[var(--bg-base)] font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shadow-xl shadow-white/5"
              >
                Start for free
                <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <Link
                href="/auth"
                className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 text-[var(--text-primary)] font-bold rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-all text-sm"
              >
                Log in
              </Link>
            </div>
            
            <div className="mt-24 pt-12 border-t border-[var(--border-subtle)] flex items-center justify-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all">
               <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Platform</div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Student-First</div>
               </div>
               <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</div>
                  <div className="text-xs font-bold text-[var(--accent-success)]">Always Free</div>
               </div>
               <div className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Version</div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Public Beta</div>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
