"use client";

// =============================================================================
// FEATURES SHOWCASE
// Tabbed feature demonstrations with interactive mini-demos.
// Flows through Capture → Plan → Execute → Progress narrative.
// =============================================================================

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Brain, ListTodo, Timer, TrendingUp, ChevronRight } from "lucide-react";
import GamificationDemo from "./GamificationDemo";
import FocusTimerDemo from "./FocusTimerDemo";
import AIAssistantDemo from "./AIAssistantDemo";

const FEATURES = [
  {
    id: "capture",
    title: "Capture",
    subtitle: "Get it out of your head",
    icon: Brain,
    description:
      "Brain dump your thoughts, and let Kofi help parse them into actionable tasks. Stop trying to remember everything.",
  },
  {
    id: "plan",
    title: "Plan",
    subtitle: "Turn chaos into clarity",
    icon: ListTodo,
    description:
      "Prioritize what matters. Weekly planning sessions help you stay intentional about where your time goes.",
  },
  {
    id: "execute",
    title: "Execute",
    subtitle: "Do the work",
    icon: Timer,
    description:
      "Focus timers keep you in the zone. Track your progress and earn XP as you complete tasks.",
  },
  {
    id: "progress",
    title: "Progress",
    subtitle: "Consistency compounds",
    icon: TrendingUp,
    description:
      "Watch your XP grow. Level up. Maintain streaks. The gamification isn't a gimmick—it's a feedback loop for your habits.",
  },
];

export default function FeaturesShowcase() {
  const [activeFeature, setActiveFeature] = useState("capture");
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-24 px-6" ref={containerRef}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            Here&apos;s How It Works
          </h2>
          <p className="mt-4 text-[var(--text-secondary)] max-w-2xl mx-auto">
            Four steps to staying on top of your work. No complex setup, no steep
            learning curve.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Feature tabs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3"
          >
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;

              return (
                <motion.button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={
                    isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }
                  }
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30"
                      : "hover:bg-[var(--bg-hover)] border border-transparent"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive
                        ? "bg-[var(--accent-primary)] text-white"
                        : "bg-[var(--bg-hover)] text-[var(--text-muted)]"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isActive
                            ? "text-[var(--accent-primary)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        Step {index + 1}
                      </span>
                      {isActive && (
                        <ChevronRight
                          size={14}
                          className="text-[var(--accent-primary)]"
                        />
                      )}
                    </div>
                    <h3
                      className={`text-lg font-semibold mt-1 ${
                        isActive
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      {feature.subtitle}
                    </p>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-[var(--text-secondary)] mt-2"
                      >
                        {feature.description}
                      </motion.p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Demo area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:sticky lg:top-24"
          >
            <AnimatePresence mode="wait">
              {activeFeature === "capture" && (
                <motion.div
                  key="capture"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <AIAssistantDemo />
                </motion.div>
              )}
              {activeFeature === "plan" && (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlanningDemo />
                </motion.div>
              )}
              {activeFeature === "execute" && (
                <motion.div
                  key="execute"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <FocusTimerDemo />
                </motion.div>
              )}
              {activeFeature === "progress" && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <GamificationDemo />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Simple planning demo showing task prioritization
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
    high: "bg-[var(--priority-high)]",
    medium: "bg-[var(--priority-medium)]",
    low: "bg-[var(--priority-low)]",
  };

  const priorityLabels = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  return (
    <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            Weekly Planning
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Click priorities to change them
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-[var(--bg-hover)] text-[var(--text-muted)]">
          Auto-sorted
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task, index) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)]"
            >
              <span className="text-sm text-[var(--text-muted)] w-6">
                {index + 1}.
              </span>
              <span className="flex-1 text-[var(--text-primary)]">
                {task.title}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => cyclePriority(task.id)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}/20 text-[var(--text-primary)]`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`}
                />
                {priorityLabels[task.priority]}
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        Tasks automatically sort by priority
      </p>
    </div>
  );
}
