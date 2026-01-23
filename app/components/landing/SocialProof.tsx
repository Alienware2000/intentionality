"use client";

// =============================================================================
// SOCIAL PROOF SECTION
// Displays stats and credibility indicators.
// Uses counter animations for engagement.
// =============================================================================

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle, Clock, Flame, Zap } from "lucide-react";

const STATS = [
  {
    icon: CheckCircle,
    value: 12847,
    suffix: "+",
    label: "Tasks Completed",
    color: "text-[var(--accent-success)]",
  },
  {
    icon: Clock,
    value: 2156,
    suffix: "h",
    label: "Focus Time Logged",
    color: "text-[var(--accent-primary)]",
  },
  {
    icon: Flame,
    value: 186,
    suffix: "",
    label: "Longest Streak",
    color: "text-[var(--accent-streak)]",
  },
  {
    icon: Zap,
    value: 458920,
    suffix: "",
    label: "Total XP Earned",
    color: "text-[var(--accent-highlight)]",
  },
];

function AnimatedCounter({
  value,
  suffix,
  inView,
}: {
  value: number;
  suffix: string;
  inView: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let startTime: number | null = null;
    const duration = 2000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function (ease out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [inView, value]);

  return (
    <span className="font-mono">
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function SocialProof() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-6 bg-[var(--bg-elevated)]" ref={containerRef}>
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Built for Students Who Mean It
          </h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            Real progress from real users
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                }
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                className="text-center p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
              >
                <div
                  className={`inline-flex p-3 rounded-full ${stat.color}/10 mb-4`}
                >
                  <Icon size={24} className={stat.color} />
                </div>
                <p className={`text-3xl sm:text-4xl font-bold ${stat.color}`}>
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    inView={isInView}
                  />
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Testimonial / Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 p-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
        >
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-lg text-[var(--text-secondary)] italic">
              &ldquo;The XP system isn&apos;t a gimmick—it gives me a reason to
              check things off instead of just moving them to tomorrow. Again.
              The streak kept me accountable during finals.&rdquo;
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                <span className="text-sm font-bold text-[var(--accent-primary)]">
                  J
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Jordan
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Computer Science, Junior
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
