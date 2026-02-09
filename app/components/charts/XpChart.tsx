"use client";

// =============================================================================
// XP CHART COMPONENT
// Line chart showing XP earned over time.
// Uses recharts for rendering. Theme-aware for dark/light modes.
// Enhanced with anime.js-style area reveal and animated tooltips.
// =============================================================================

import { useMemo, useState, useEffect, useRef } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import anime from "animejs";
import { useTheme } from "@/app/components/ThemeProvider";

type Props = {
  data: Array<{ date: string; xp: number }>;
};

// Format date for display (moved outside component to avoid re-creation)
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Custom tooltip component with spring animation
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length || !label) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
      }}
      className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] p-2 shadow-lg"
    >
      <p className="text-xs text-[var(--text-muted)]">{formatDate(label)}</p>
      <motion.p
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
        className="text-sm font-mono font-bold text-[var(--accent-primary)]"
      >
        +{payload[0].value} XP
      </motion.p>
    </motion.div>
  );
}

export default function XpChart({ data }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const prefersReducedMotionHook = useReducedMotion();
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Theme-aware colors - use CSS variables for accent awareness
  const colors = useMemo(() => ({
    primary: "var(--accent-primary)",
    tickFill: isDark ? "#525252" : "#6b7280",
    axisLine: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  }), [isDark]);

  // Calculate cumulative XP for area chart effect (memoized to prevent recalc on each render)
  const cumulativeData = useMemo(() => {
    return data.reduce<Array<{ date: string; xp: number; cumulative: number }>>(
      (acc, d) => {
        const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
        acc.push({ ...d, cumulative: prevCumulative + d.xp });
        return acc;
      },
      []
    );
  }, [data]);

  // Use unique gradient ID to avoid conflicts when theme changes
  const gradientId = `xpGradient-${isDark ? "dark" : "light"}`;

  // Anime.js-style area reveal animation
  useEffect(() => {
    if (hasAnimated || prefersReducedMotionHook || !chartRef.current) return;

    // Area sweep reveal from left to right
    const chart = chartRef.current;
    chart.style.clipPath = "inset(0 100% 0 0)";

    anime({
      targets: chart,
      clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"],
      easing: "easeOutExpo",
      duration: 1000,
      delay: 200,
      complete: () => {
        chart.style.clipPath = "";
        setHasAnimated(true);
      },
    });

    // Animate axis labels
    const xAxisLabels = chart.querySelectorAll(".recharts-xAxis .recharts-cartesian-axis-tick");
    const yAxisLabels = chart.querySelectorAll(".recharts-yAxis .recharts-cartesian-axis-tick");

    anime({
      targets: [...Array.from(xAxisLabels), ...Array.from(yAxisLabels)],
      opacity: [0, 1],
      translateY: [8, 0],
      easing: "easeOutCubic",
      duration: 400,
      delay: (el, i) => i * 50 + 300,
    });
  }, [hasAnimated, prefersReducedMotionHook]);

  // Chart container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        delay: 0.1,
      },
    },
  };

  return (
    <motion.div
      ref={chartRef}
      variants={containerVariants}
      initial={prefersReducedMotionHook ? "visible" : "hidden"}
      animate="visible"
      className="h-48 sm:h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: colors.tickFill, fontSize: 10 }}
            axisLine={{ stroke: colors.axisLine }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: colors.tickFill, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={colors.primary}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
