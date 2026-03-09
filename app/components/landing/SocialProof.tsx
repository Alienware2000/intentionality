"use client";

// =============================================================================
// SOCIAL PROOF SECTION
// Refined for a "Sleek OS" feel.
// Uses Geist Mono for system stats and Geist Sans for titles.
// =============================================================================

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle, Clock, Flame, Users, Activity, Terminal, ShieldCheck } from "lucide-react";

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
    suffix: "H",
    label: "Focus Hours",
    color: "text-[var(--accent-primary)]",
  },
  {
    key: "longestStreak" as const,
    icon: Flame,
    suffix: "D",
    label: "Best Streak",
    color: "text-[var(--accent-streak)]",
  },
  {
    key: "totalUsers" as const,
    icon: Users,
    suffix: "+",
    label: "Active Students",
    color: "text-[var(--text-primary)]",
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
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(eased * value));

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [inView, value]);

  return (
    <span className="tabular-nums tracking-tighter">
      {displayValue.toLocaleString()}
      <span className="text-[0.5em] text-[var(--text-muted)] ml-1 font-bold">{suffix}</span>
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
    <section className="py-24 md:py-32 px-6 relative" ref={containerRef}>
      <div className="mx-auto max-w-7xl relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6 border-b border-[var(--border-default)] pb-10">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
            transition={{ duration: 0.5 }}
          >
             <div className="text-label text-[var(--accent-primary)] mb-3 flex items-center gap-2">
               <Activity size={14} /> Community Progress
             </div>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              Real progress, together
            </h2>
            <p className="mt-2 text-lg text-[var(--text-secondary)]">
              Numbers that reflect collective discipline and intentionality.
            </p>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, x: 10 }}
             animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
             transition={{ duration: 0.5 }}
             className="hidden md:flex items-center gap-3 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-sm"
          >
             <ShieldCheck size={16} className="text-[var(--accent-success)]" />
             <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Verified Metrics</span>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STAT_CONFIG.map((stat, index) => {
            const Icon = stat.icon;
            const value = stats ? stats[stat.key] : 0;
            
            // Map accents to cards
            const accentClasses = [
              { text: "text-[var(--accent-success)]", border: "hover:border-[var(--accent-success)]/30", glow: "rgba(34, 197, 94, 0.05)" },
              { text: "text-[var(--accent-primary)]", border: "hover:border-[var(--accent-primary)]/30", glow: "rgba(220, 38, 38, 0.05)" },
              { text: "text-[var(--accent-streak)]", border: "hover:border-[var(--accent-streak)]/30", glow: "rgba(249, 115, 22, 0.05)" },
              { text: "text-[var(--accent-info)]", border: "hover:border-[var(--accent-info)]/30", glow: "rgba(59, 130, 246, 0.05)" }
            ][index];

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] flex flex-col gap-10 relative group ${accentClasses.border} transition-all shadow-xl shadow-black/5 overflow-hidden`}
              >
                 {/* Internal Glow Point */}
                 <div 
                   className="absolute -top-10 -right-10 w-32 h-32 blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                   style={{ backgroundColor: accentClasses.glow }}
                 />

                 <div className="flex items-center justify-between relative z-10">
                    <div className={`p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-inner transition-colors ${accentClasses.text}`}>
                       <Icon size={20} strokeWidth={2.5} />
                    </div>
                 </div>
                  
                 <div className="space-y-3 relative z-10">
                    <div className={`text-5xl font-bold tracking-tighter ${accentClasses.text}`}>
                      {stats ? (
                        <AnimatedCounter value={value} suffix={stat.suffix} inView={isInView} />
                      ) : (
                        <span className="opacity-10 animate-pulse">---</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <div className={`h-px w-4 ${accentClasses.text} opacity-30`} />
                       <div className="text-label text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                         {stat.label}
                       </div>
                    </div>
                 </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
