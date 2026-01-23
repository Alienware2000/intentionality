"use client";

// =============================================================================
// HERO SECTION
// Main landing page hero with animated headline and dashboard preview.
// Uses anime.js for text reveal and framer-motion for layout animations.
// =============================================================================

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import anime from "animejs";
import { ArrowRight, Zap, Flame, Target } from "lucide-react";
import { prefersReducedMotion } from "@/app/lib/anime-utils";

export default function HeroSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || prefersReducedMotion()) return;
    hasAnimated.current = true;

    // Animate headline words
    if (headlineRef.current) {
      const words = headlineRef.current.querySelectorAll(".hero-word");
      anime({
        targets: words,
        opacity: [0, 1],
        translateY: [30, 0],
        delay: anime.stagger(80, { start: 300 }),
        duration: 800,
        easing: "easeOutExpo",
      });
    }
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 pb-12">
      <div className="mx-auto max-w-5xl w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="text-center lg:text-left">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-medium uppercase tracking-widest text-[var(--accent-primary)] mb-4"
            >
              For students who mean it
            </motion.p>

            <h1
              ref={headlineRef}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-[var(--text-primary)]"
            >
              <span className="hero-word inline-block opacity-0">If</span>{" "}
              <span className="hero-word inline-block opacity-0">you&apos;re</span>{" "}
              <span className="hero-word inline-block opacity-0">not</span>{" "}
              <span className="hero-word inline-block opacity-0">ready</span>{" "}
              <span className="hero-word inline-block opacity-0">to</span>{" "}
              <span className="hero-word inline-block opacity-0">be</span>{" "}
              <span className="hero-word inline-block opacity-0 text-[var(--accent-primary)]">
                intentional,
              </span>{" "}
              <span className="hero-word inline-block opacity-0">this</span>{" "}
              <span className="hero-word inline-block opacity-0">is</span>{" "}
              <span className="hero-word inline-block opacity-0">not</span>{" "}
              <span className="hero-word inline-block opacity-0">for</span>{" "}
              <span className="hero-word inline-block opacity-0">you.</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mt-6 text-lg text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0"
            >
              No app will make you productive. That takes effort. Intentionality
              is built for students who are ready to put in the work—it just makes
              the work clearer.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/auth"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-white font-semibold rounded-lg hover:bg-[var(--accent-primary)]/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                I&apos;m Ready
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[var(--border-default)] text-[var(--text-primary)] font-medium rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                See how it works
              </Link>
            </motion.div>
          </div>

          {/* Right: Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
            className="relative perspective-1000"
          >
            <div className="relative rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 shadow-2xl shadow-[var(--accent-primary)]/10">
              {/* Mini dashboard preview */}
              <div className="space-y-4">
                {/* Header bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-[var(--accent-primary)]">
                        12
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Level</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        1,280 XP
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-streak)]/20">
                    <Flame size={14} className="text-[var(--accent-streak)]" />
                    <span className="text-sm font-bold text-[var(--accent-streak)]">
                      14
                    </span>
                  </div>
                </div>

                {/* XP Bar */}
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "65%" }}
                      transition={{ delay: 1.5, duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-[var(--accent-primary)] rounded-full"
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    720 / 1,200 XP to Level 13
                  </p>
                </div>

                {/* Task list preview */}
                <div className="space-y-2 pt-2">
                  <DemoTask
                    title="Finish CS assignment"
                    priority="high"
                    done
                    delay={2}
                  />
                  <DemoTask
                    title="Review lecture notes"
                    priority="medium"
                    delay={2.2}
                  />
                  <DemoTask
                    title="Start research paper"
                    priority="high"
                    delay={2.4}
                  />
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <QuickStat
                    icon={<Target size={14} />}
                    label="Focus"
                    value="2h 15m"
                    delay={2.6}
                  />
                  <QuickStat
                    icon={<Zap size={14} />}
                    label="Today"
                    value="+85 XP"
                    delay={2.8}
                  />
                  <QuickStat
                    icon={<Flame size={14} />}
                    label="Streak"
                    value="14 days"
                    delay={3}
                  />
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 via-transparent to-transparent blur-xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function DemoTask({
  title,
  priority,
  done,
  delay,
}: {
  title: string;
  priority: "high" | "medium" | "low";
  done?: boolean;
  delay: number;
}) {
  const priorityColors = {
    high: "bg-[var(--priority-high)]",
    medium: "bg-[var(--priority-medium)]",
    low: "bg-[var(--priority-low)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-hover)] ${
        done ? "opacity-60" : ""
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          done
            ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
            : "border-[var(--text-muted)]"
        }`}
      >
        {done && (
          <svg
            width="8"
            height="8"
            viewBox="0 0 12 12"
            fill="none"
            className="text-white"
          >
            <path
              d="M2.5 6L5 8.5L9.5 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <span
        className={`flex-1 text-sm ${
          done
            ? "line-through text-[var(--text-muted)]"
            : "text-[var(--text-primary)]"
        }`}
      >
        {title}
      </span>
      <div className={`w-2 h-2 rounded-full ${priorityColors[priority]}`} />
    </motion.div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="text-center p-2 rounded-lg bg-[var(--bg-hover)]"
    >
      <div className="flex justify-center text-[var(--text-muted)] mb-1">
        {icon}
      </div>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </motion.div>
  );
}
