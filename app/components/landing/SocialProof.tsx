"use client";

// =============================================================================
// SOCIAL PROOF SECTION
// Fetches real stats from /api/stats and displays them with counter animations.
// =============================================================================

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle, Clock, Flame, Users } from "lucide-react";

interface Stats {
  tasksCompleted: number;
  focusHours: number;
  longestStreak: number;
  totalUsers: number;
}

const STAT_CONFIG = [
  {
    key: "tasksCompleted" as const,
    icon: CheckCircle,
    suffix: "+",
    label: "Tasks Completed",
    color: "text-[var(--accent-success)]",
  },
  {
    key: "focusHours" as const,
    icon: Clock,
    suffix: "h",
    label: "Focus Hours",
    color: "text-[var(--accent-primary)]",
  },
  {
    key: "longestStreak" as const,
    icon: Flame,
    suffix: " days",
    label: "Longest Streak",
    color: "text-[var(--accent-streak)]",
  },
  {
    key: "totalUsers" as const,
    icon: Users,
    suffix: "+",
    label: "Students",
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
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => {});
  }, []);

  return (
    <section className="py-24 px-6" ref={containerRef}>
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            The numbers so far
          </h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            From actual students using this right now
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STAT_CONFIG.map((stat, index) => {
            const Icon = stat.icon;
            const value = stats ? stats[stat.key] : 0;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={
                  isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
                }
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                className="glass-card hover-lift-glow text-center p-6 rounded-xl border border-[var(--border-subtle)]"
              >
                <div
                  className={`inline-flex p-3 rounded-full ${stat.color}/10 mb-4`}
                >
                  <Icon size={24} className={stat.color} />
                </div>
                <p className={`text-3xl sm:text-4xl font-bold ${stat.color}`}>
                  {stats ? (
                    <AnimatedCounter
                      value={value}
                      suffix={stat.suffix}
                      inView={isInView}
                    />
                  ) : (
                    <span className="opacity-30">&mdash;</span>
                  )}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-2">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
