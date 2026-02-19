// =============================================================================
// HABIT TREND CHART
// Recharts area chart showing daily completion % trend for the month.
// Includes average reference line. HUD card treatment.
// =============================================================================

"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/app/lib/cn";

type DataPoint = {
  day: number;
  label: string;
  percent: number;
};

type Props = {
  data: DataPoint[];
  avgPercent: number;
};

export default function HabitTrendChart({ data, avgPercent }: Props) {
  if (data.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl glass-card hover-lift-glow",
        "bg-[var(--bg-card)]",
        "border border-[var(--border-subtle)]",
        "p-5 sm:p-6"
      )}
    >
      <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
        <span className="text-[var(--accent-success)]">&#9679;</span> Consistency Trend
      </h3>

      <div className="h-40 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="habitTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-success)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent-success)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              tickFormatter={(v: number) => `${v}%`}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--text-primary)",
              }}
              formatter={(value) => [`${value}%`, "Completion"]}
              labelFormatter={(label) => `Day ${label}`}
            />
            <ReferenceLine
              y={avgPercent}
              stroke="var(--text-muted)"
              strokeDasharray="6 4"
              label={{
                value: `avg ${avgPercent}%`,
                position: "right",
                fontSize: 10,
                fill: "var(--text-muted)",
              }}
            />
            <Area
              type="monotone"
              dataKey="percent"
              stroke="var(--accent-success)"
              strokeWidth={2}
              fill="url(#habitTrendFill)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--accent-success)",
                stroke: "var(--bg-card)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
