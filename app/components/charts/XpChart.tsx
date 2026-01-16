"use client";

// =============================================================================
// XP CHART COMPONENT
// Line chart showing XP earned over time.
// Uses recharts for rendering.
// =============================================================================

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

type Props = {
  data: Array<{ date: string; xp: number }>;
};

// Format date for display (moved outside component to avoid re-creation)
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Custom tooltip component (moved outside to avoid re-creation during render)
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
    <div className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] p-2 shadow-lg">
      <p className="text-xs text-[var(--text-muted)]">{formatDate(label)}</p>
      <p className="text-sm font-mono font-bold text-[var(--accent-primary)]">
        +{payload[0].value} XP
      </p>
    </div>
  );
}

export default function XpChart({ data }: Props) {
  // Calculate cumulative XP for area chart effect
  const cumulativeData = data.reduce<Array<{ date: string; xp: number; cumulative: number }>>(
    (acc, d) => {
      const prevCumulative = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({ ...d, cumulative: prevCumulative + d.xp });
      return acc;
    },
    []
  );

  return (
    <div className="h-48 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#525252", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#525252", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#xpGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
