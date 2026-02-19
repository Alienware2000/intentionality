// =============================================================================
// HABIT STATS SECTION
// Command center: hero consistency % with data-driven glow, instrument readout,
// colored pill metrics, and HUD scan line. Visual intensity reflects actual data.
// =============================================================================

"use client";

import { useEffect, useRef, useMemo } from "react";
import { Flame, Crown, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import anime from "animejs";
import { cn } from "@/app/lib/cn";
import { prefersReducedMotion } from "@/app/lib/anime-utils";
import ProgressRing from "@/app/components/ui/ProgressRing";
import type { HabitMonthlyStats } from "@/app/lib/types";

type Props = {
  stats: HabitMonthlyStats;
  currentStreak: number;
  weekDelta: number | null;
  bestDay: { day: string; rate: number } | null;
  worstDay: { day: string; rate: number } | null;
};

export default function HabitStats({ stats, currentStreak, weekDelta, bestDay, worstDay }: Props) {
  const heroRef = useRef<HTMLSpanElement>(null);

  // Data-driven glow computation
  const glowStyle = useMemo(() => {
    const rate = stats.consistencyRate;
    if (rate >= 80) {
      return {
        card: `0 0 25px rgba(var(--accent-success-rgb), 0.2), inset 0 0 25px rgba(var(--accent-success-rgb), 0.05)`,
        readout: `0 0 20px rgba(var(--accent-success-rgb), 0.25), inset 0 0 20px rgba(var(--accent-success-rgb), 0.08)`,
      };
    }
    if (rate >= 50) {
      return {
        card: `0 0 15px rgba(var(--accent-success-rgb), 0.12)`,
        readout: `0 0 15px rgba(var(--accent-success-rgb), 0.15), inset 0 0 15px rgba(var(--accent-success-rgb), 0.05)`,
      };
    }
    return {
      card: `0 0 12px rgba(var(--accent-streak-rgb), 0.1)`,
      readout: `0 0 12px rgba(var(--accent-streak-rgb), 0.12), inset 0 0 12px rgba(var(--accent-streak-rgb), 0.04)`,
    };
  }, [stats.consistencyRate]);

  // Animate hero % value on mount
  useEffect(() => {
    if (prefersReducedMotion() || !heroRef.current) return;

    const el = heroRef.current;
    anime({
      targets: { val: 0 },
      val: stats.consistencyRate,
      round: 1,
      duration: 900,
      delay: 200,
      easing: "spring(1, 80, 12, 0)",
      update: (anim) => {
        const currentVal = Math.round(
          (anim.animations[0] as unknown as { currentValue: number }).currentValue
        );
        el.textContent = `${currentVal}%`;
      },
    });
  }, [stats.consistencyRate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 12 }}
      className={cn(
        "rounded-xl glass-card-premium",
        "relative overflow-hidden",
        "p-5 sm:p-6"
      )}
      style={{ boxShadow: glowStyle.card }}
    >
      {/* HUD scan line overlay — runs once on mount */}
      <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden rounded-xl">
        <div
          className="hud-scan-line"
          style={{ animation: prefersReducedMotion() ? "none" : "hud-scan 2s linear 0.5s 1 forwards" }}
        />
      </div>

      {/* Section label */}
      <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 relative z-10">
        <span className="text-[var(--accent-primary)]">&#9679;</span> Performance
      </h3>

      {/* Hero area */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 relative z-10">
        {/* Left: Hero metric + delta + best/worst */}
        <div>
          <div className="flex items-baseline gap-3">
            {/* Instrument readout container */}
            <div
              className="rounded-lg bg-[var(--bg-base)]/80 border border-[var(--accent-success)]/20 px-4 py-2"
              style={{ boxShadow: glowStyle.readout }}
            >
              <span
                ref={heroRef}
                className="text-4xl sm:text-5xl font-mono font-bold text-[var(--accent-success)]"
                style={{
                  textShadow: "0 0 20px rgba(var(--accent-success-rgb), 0.4), 0 0 50px rgba(var(--accent-success-rgb), 0.15)",
                }}
              >
                {stats.consistencyRate}%
              </span>
            </div>

            {/* Week delta badge */}
            {weekDelta !== null && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-sm font-mono font-semibold",
                  weekDelta >= 0
                    ? "text-[var(--accent-success)]"
                    : "text-[var(--accent-streak)]"
                )}
              >
                {weekDelta >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {weekDelta >= 0 ? "+" : ""}{weekDelta}% vs last week
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            monthly consistency
          </p>

          {/* Best / Worst day */}
          {(bestDay || worstDay) && (
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {bestDay && (
                <span>
                  Best: <span className="font-mono font-semibold text-[var(--accent-success)]">{bestDay.day} {bestDay.rate}%</span>
                </span>
              )}
              {bestDay && worstDay && (
                <span className="mx-2 text-[var(--text-muted)]">&middot;</span>
              )}
              {worstDay && (
                <span>
                  Worst: <span className="font-mono font-semibold text-[var(--accent-streak)]">{worstDay.day} {worstDay.rate}%</span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border-subtle)] my-4 relative z-10" />

      {/* Supporting metrics — colored pills */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-[var(--text-secondary)] relative z-10">
        {/* Streak — orange pill */}
        <div className="flex items-center gap-2 rounded-lg bg-[var(--accent-streak)]/8 border border-[var(--accent-streak)]/12 px-3 py-1.5">
          <Flame size={14} className="text-[var(--accent-streak)] flex-shrink-0" />
          <span>
            <span className="font-mono font-semibold text-[var(--accent-streak)]">
              {currentStreak}
            </span>{" "}
            streak
          </span>
        </div>

        {/* Perfect days — gold pill */}
        <div className="flex items-center gap-2 rounded-lg bg-[var(--accent-highlight)]/8 border border-[var(--accent-highlight)]/12 px-3 py-1.5">
          <Crown size={14} className="text-[var(--accent-highlight)] flex-shrink-0" />
          <span>
            <span className="font-mono font-semibold text-[var(--accent-highlight)]">
              {stats.perfectDays}
            </span>{" "}
            perfect
          </span>
        </div>

        {/* Today progress — green pill */}
        <div className="flex items-center gap-2 rounded-lg bg-[var(--accent-success)]/8 border border-[var(--accent-success)]/12 px-3 py-1.5">
          <ProgressRing
            value={stats.todayDone}
            max={stats.todayTotal || 1}
            size={20}
            strokeWidth={2.5}
            color="var(--accent-success)"
          />
          <span>
            <span className="font-mono font-semibold text-[var(--text-primary)]">
              {stats.todayDone}/{stats.todayTotal}
            </span>{" "}
            today
          </span>
        </div>
      </div>
    </motion.div>
  );
}
