"use client";

// =============================================================================
// PHILOSOPHY SECTION
// Core belief explanation - the heart of the landing page.
// Written in first person, authentic voice. Minimal animations.
// =============================================================================

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const beliefs = [
  {
    text: "I don't believe you can offload the effort it takes to be organized onto any tool.",
  },
  {
    text: "Regardless of what you use, it takes time and proactive planning to actually get things done.",
  },
  {
    text: "Most productivity tools become another thing to manage. They overwhelm you when you're already overwhelmed.",
  },
  {
    text: "Intentionality is different. It's built to support your discipline, not replace it. Simple, focused, no endless customization rabbit holes.",
  },
];

export default function PhilosophySection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-3xl" ref={containerRef}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            Why I Built This
          </h2>
          <div className="mt-4 h-1 w-16 mx-auto bg-gradient-to-r from-[var(--accent-primary)] to-transparent rounded-full" />
        </motion.div>

        <div className="space-y-8">
          {beliefs.map((belief, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.2 + index * 0.15, duration: 0.6 }}
              className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed"
            >
              {index === beliefs.length - 1 ? (
                <>
                  <span className="text-[var(--text-primary)] font-medium">
                    Intentionality is different.
                  </span>{" "}
                  It&apos;s built to support your discipline, not replace it.
                  Simple, focused, no endless customization rabbit holes.
                </>
              ) : (
                belief.text
              )}
            </motion.p>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-12 p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]"
        >
          <p className="text-[var(--text-secondary)] text-center italic">
            &ldquo;The tool should get out of your way. Your job is to do the
            work—the app just helps you see what needs doing.&rdquo;
          </p>
        </motion.div>
      </div>
    </section>
  );
}
