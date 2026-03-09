"use client";

// =============================================================================
// FEATURES SHOWCASE
// OS Command Center bento-style presentation.
// Refined for a sleeker, terminal-esque "Personal OS" vibe.
// =============================================================================

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Brain, ListTodo, Timer, TrendingUp, Sparkles, Check, Terminal, Box } from "lucide-react";
import GamificationDemo from "./GamificationDemo";
import FocusTimerDemo from "./FocusTimerDemo";
import AIAssistantDemo from "./AIAssistantDemo";

const FEATURES = [
  {
    id: "capture",
    title: "Instant Capture",
    subtitle: "Focus First",
    icon: Brain,
    description:
      "Clear your mind in seconds. Type anything floating around in your head, and let Kofi automatically sort tasks from thoughts.",
    demo: AIAssistantDemo,
  },
  {
    id: "plan",
    title: "Strategic Planning",
    subtitle: "Prioritize Better",
    icon: ListTodo,
    description:
      "Stop staring at endless lists. Intentionality helps you identify what actually matters for the week so you can start with confidence.",
    demo: PlanningDemo,
  },
  {
    id: "execute",
    title: "Deep Work Sessions",
    subtitle: "Execution",
    icon: Timer,
    description:
      "A focused timer that respects your discipline. Work in intervals, earn XP, and build a habit of showing up.",
    demo: FocusTimerDemo,
  },
  {
    id: "progress",
    title: "Visual Progress",
    subtitle: "Momentum",
    icon: TrendingUp,
    description:
      "See your growth in real-time. Streaks, levels, and activity heatmaps provide the proof you need to keep moving forward.",
    demo: GamificationDemo,
  },
];

export default function FeaturesShowcase() {
  const [activeFeature, setActiveFeature] = useState(FEATURES[0].id);

  return (
    <section id="features" className="py-20 md:py-32 px-6 relative font-sans">
      <div className="mx-auto max-w-7xl border-t border-[var(--border-default)] pt-16 md:pt-24">
        
        {/* Section Header */}
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--accent-primary)] font-bold text-[10px] uppercase tracking-widest">
               <Box size={14} /> Feature Suite
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
              Designed for focus
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed font-sans">
              A streamlined workflow that removes the friction between planning and doing.
            </p>
          </div>
          <div className="flex gap-2 items-center">
             {FEATURES.map((f, i) => (
                <div key={f.id} className={`h-1 rounded-full transition-all duration-500 ${activeFeature === f.id ? 'w-8 bg-[var(--accent-primary)]' : 'w-2 bg-[var(--border-default)]'}`} />
             ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 relative">
          {/* Left Column: Human Text */}
          <div className="flex flex-col gap-[15vh] md:gap-[25vh] py-[5vh] md:py-[10vh]">
            {FEATURES.map((feature) => (
              <FeatureText
                key={feature.id}
                feature={feature}
                setActive={setActiveFeature}
              />
            ))}
          </div>

          {/* Right Column: Sticky Personal OS Demo */}
          <div className="hidden lg:block relative">
            <div className="sticky top-40 h-[480px] w-full">
              <div className="relative w-full h-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden shadow-2xl ring-1 ring-white/5">
                {/* Demo Chrome */}
                <div className="h-10 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] flex items-center justify-between px-6">
                   <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-subtle)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-subtle)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-subtle)]" />
                      </div>
                   </div>
                   <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      Live Preview
                   </div>
                </div>
                
                <AnimatePresence mode="wait">
                   {FEATURES.map((feature) => (
                     activeFeature === feature.id && (
                       <motion.div
                         key={feature.id}
                         initial={{ opacity: 0, scale: 0.98 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 1.02 }}
                         transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                         className="absolute inset-0 flex items-center justify-center p-8"
                       >
                          <feature.demo />
                       </motion.div>
                     )
                   ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureText({ 
  feature, 
  setActive 
}: { 
  feature: typeof FEATURES[0], 
  setActive: (id: string) => void 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" });

  useEffect(() => {
    if (isInView) setActive(feature.id);
  }, [isInView, feature.id, setActive]);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-x-0" : "opacity-20 -translate-x-4"}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--accent-primary)] flex items-center justify-center shadow-sm">
           <feature.icon size={20} strokeWidth={2} />
        </div>
        <div>
           <div className="text-[10px] font-bold text-[var(--accent-primary)] mb-1 uppercase tracking-widest">{feature.subtitle}</div>
           <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{feature.title}</h3>
        </div>
      </div>
      <p className="text-[17px] text-[var(--text-secondary)] leading-relaxed mb-8 font-sans">
        {feature.description}
      </p>
      
      {/* Mobile Demo */}
      <div className="lg:hidden mb-12 w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden flex items-center justify-center p-6 py-16 shadow-xl">
         <feature.demo />
      </div>
    </div>
  );
}

// Restored simple planning demo showing task prioritization
function PlanningDemo() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Research paper outline", priority: "high" as const },
    { id: 2, title: "Email professor", priority: "low" as const },
    { id: 3, title: "Study for quiz", priority: "medium" as const },
  ]);

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...tasks].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  const cyclePriority = (id: number) => {
    setTasks(
      tasks.map((t) => {
        if (t.id !== id) return t;
        const next =
          t.priority === "high"
            ? "medium"
            : t.priority === "medium"
            ? "low"
            : "high";
        return { ...t, priority: next };
      })
    );
  };

  const priorityColors = {
    high: "text-[var(--priority-high)] bg-[var(--priority-high)]/10 border-[var(--priority-high)]/20",
    medium: "text-[var(--priority-medium)] bg-[var(--priority-medium)]/10 border-[var(--priority-medium)]/20",
    low: "text-[var(--text-muted)] bg-[var(--bg-hover)] border-[var(--border-subtle)]",
  };

  return (
    <div className="w-full max-w-xs mx-auto bg-[var(--bg-base)] p-6 rounded-2xl border border-[var(--border-default)] shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-bold text-[var(--text-primary)] text-sm tracking-tight">Focus Queue</p>
          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider mt-0.5">Smart Sort Active</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
          <ListTodo size={14} className="text-[var(--accent-primary)]" />
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 hover:border-[var(--border-default)] transition-all group cursor-pointer"
              onClick={() => cyclePriority(task.id)}
            >
              <div className="w-5 h-5 rounded-md border-2 border-[var(--border-default)] flex items-center justify-center shrink-0 group-hover:border-[var(--accent-primary)]/50 transition-colors" />
              <span className="flex-1 text-[13px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {task.title}
              </span>
              <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${priorityColors[task.priority]}`}>
                {task.priority}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="mt-8 text-center">
         <p className="text-[10px] text-[var(--text-muted)] font-medium">Tap to change priority</p>
      </div>
    </div>
  );
}
