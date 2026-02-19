// =============================================================================
// DAY OF WEEK CHART
// Recharts bar chart showing per-day-of-week completion rates.
// Best day highlighted in accent, worst in amber. HUD card treatment.
// =============================================================================

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/app/lib/cn";

export type DayOfWeekData = {
  day: string; // "Mon", "Tue", etc.
  rate: number; // 0-100
  count: number; // days tracked
  isBest: boolean;
  isWorst: boolean;
};

type Props = {
  data: DayOfWeekData[];
};

export default function DayOfWeekChart({ data }: Props) {
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
        <span className="text-[var(--accent-info)]">&#9679;</span> Day of Week
      </h3>

      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 20, left: -20 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
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
              formatter={(value) => [`${Number(value)}%`, "Completion"]}
              labelFormatter={(label) => {
                const entry = data.find((d) => d.day === label);
                return entry ? `${label} \u2014 ${entry.count} ${entry.count === 1 ? "day" : "days"} tracked` : String(label);
              }}
              cursor={{ fill: "var(--bg-hover)", opacity: 0.3 }}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.isBest
                      ? "var(--accent-primary)"
                      : entry.isWorst
                        ? "var(--accent-streak)"
                        : "var(--accent-success)"
                  }
                  fillOpacity={entry.isBest || entry.isWorst ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Best / Worst labels */}
      <div className="flex justify-center gap-4 text-[10px] -mt-2">
        {data.some((d) => d.isBest) && (
          <span className="text-[var(--accent-primary)] font-mono">
            &#9650; Best: {data.find((d) => d.isBest)?.day}
          </span>
        )}
        {data.some((d) => d.isWorst) && (
          <span className="text-[var(--accent-streak)] font-mono">
            &#9660; Weakest: {data.find((d) => d.isWorst)?.day}
          </span>
        )}
      </div>
    </div>
  );
}
