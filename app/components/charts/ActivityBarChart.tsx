"use client";

// =============================================================================
// ACTIVITY BAR CHART COMPONENT
// Recharts bar chart for short time periods (30 days or fewer).
// Better for magnitude comparison than heatmaps at this scale.
// =============================================================================

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

type ActivityDay = {
  date: string;
  count: number;
  minutes?: number;
};

type Props = {
  data: Array<ActivityDay>;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg"
    >
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        {formatDate(label)}
      </p>
      <p className="text-sm font-mono font-bold text-[var(--accent-success)]">
        {payload[0].value} {payload[0].value === 1 ? "activity" : "activities"}
      </p>
    </motion.div>
  );
}

export default function ActivityBarChart({ data }: Props) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      label: formatShortDate(d.date),
    }));
  }, [data]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Show every 5th label tick for readability
  const ticks = useMemo(() => {
    if (chartData.length <= 7) return chartData.map((d) => d.date);
    const step = Math.max(5, Math.floor(chartData.length / 6));
    return chartData
      .filter((_, i) => i % step === 0 || i === chartData.length - 1)
      .map((d) => d.date);
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] sm:h-[200px] text-sm text-[var(--text-muted)]">
        No activity data
      </div>
    );
  }

  return (
    <div className="w-full h-[160px] sm:h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={formatShortDate}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, Math.max(maxCount, 3)]}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--bg-hover)", opacity: 0.3 }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent-success)"
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
