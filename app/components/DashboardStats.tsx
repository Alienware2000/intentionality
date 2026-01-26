"use client";

// =============================================================================
// DASHBOARD STATS COMPONENT
// Displays key stats with icons: habits, tasks, XP, streak, quests.
// Enhanced with GlowCard styling, anime.js-inspired animations, and spring counters.
// =============================================================================

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, CheckCircle, Zap, Flame, Target } from "lucide-react";
import anime from "animejs";
import GlowCard, { GlowCardIcon } from "./ui/GlowCard";
import type { Task, Quest, HabitWithStatus } from "@/app/lib/types";
import { useProfile } from "./ProfileProvider";
import { cn } from "@/app/lib/cn";
import { prefersReducedMotion } from "@/app/lib/anime-utils";

type Props = {
  date: string;
  refreshTrigger?: number;
};

// -----------------------------------------------------------------------------
// Animated Number Component - Spring easing with highlight flash
// -----------------------------------------------------------------------------

function AnimatedNumber({
  value,
  duration = 800,
  onComplete,
}: {
  value: number;
  duration?: number;
  onComplete?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef<number>(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (ref.current && !prefersReducedMotion()) {
      const start = isFirstRender.current ? 0 : prevValue.current;
      const shouldAnimate = isFirstRender.current || prevValue.current !== value;

      if (shouldAnimate) {
        // Spring-based counter animation
        anime({
          targets: { val: start },
          val: value,
          round: 1,
          duration,
          easing: "spring(1, 80, 12, 0)",
          update: function (anim) {
            const animatable = anim.animatables[0];
            if (ref.current && animatable) {
              const target = animatable.target as unknown as { val: number };
              ref.current.textContent = Math.round(target.val).toLocaleString();
            }
          },
          complete: onComplete,
        });

        // Value change highlight flash (only on update, not first render)
        if (!isFirstRender.current && ref.current.parentElement) {
          ref.current.parentElement.classList.add("animate-value-flash");
          setTimeout(() => {
            ref.current?.parentElement?.classList.remove("animate-value-flash");
          }, 500);
        }
      }
    } else if (ref.current) {
      ref.current.textContent = value.toLocaleString();
    }
    prevValue.current = value;
    isFirstRender.current = false;
  }, [value, duration, onComplete]);

  return (
    <span ref={ref} className="relative">
      {value.toLocaleString()}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Stat Card Component - Enhanced with anime.js-style animations
// -----------------------------------------------------------------------------

type StatCardProps = {
  value: string | number;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  accent?: boolean;
  accentColor?: "primary" | "success" | "streak" | "highlight";
  index: number;
  numericValue?: number;
};

function StatCard({
  value,
  label,
  icon: Icon,
  accent,
  accentColor = "primary",
  index,
  numericValue,
}: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const textColorMap = {
    primary: "text-[var(--accent-primary)]",
    success: "text-[var(--accent-success)]",
    streak: "text-[var(--accent-streak)]",
    highlight: "text-[var(--accent-highlight)]",
  };

  const glowColor = accent ? accentColor : "none";

  // Spring scale animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 80,
        damping: 12,
        delay: index * 0.06,
      },
    },
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <GlowCard
        glowColor={glowColor}
        hoverLift
        hoverScale
        className="h-full min-h-[72px]"
      >
        <div className="flex items-center gap-3">
          <GlowCardIcon color={glowColor}>
            <Icon size={18} />
          </GlowCardIcon>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xl font-mono font-bold leading-tight rounded-md transition-colors",
                accent ? textColorMap[accentColor] : "text-[var(--text-primary)]"
              )}
            >
              {numericValue !== undefined ? (
                <AnimatedNumber value={numericValue} />
              ) : (
                value
              )}
              {numericValue !== undefined && typeof value === "string" && value.includes("/") && (
                <span className="text-[var(--text-muted)]">
                  /{value.split("/")[1]}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)] leading-snug truncate">
              {label}
            </p>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function DashboardStats({ date, refreshTrigger }: Props) {
  const { profile, loading: profileLoading } = useProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [tasksRes, questsRes, habitsRes] = await Promise.all([
        fetch(`/api/tasks/for-today?date=${date}`),
        fetch("/api/quests"),
        fetch(`/api/habits?date=${date}`),
      ]);

      const [tasksData, questsData, habitsData] = await Promise.all([
        tasksRes.json(),
        questsRes.json(),
        habitsRes.json(),
      ]);

      if (tasksData.ok) setTasks(tasksData.tasks);
      if (questsData.ok) setQuests(questsData.quests);
      if (habitsData.ok) setHabits(habitsData.habits);
    } catch {
      // Silent fail - stats will show defaults
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshTrigger]);

  // Pre-compute tasks by quest for O(1) lookups instead of O(N×M)
  const tasksByQuest = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!map[task.quest_id]) map[task.quest_id] = [];
      map[task.quest_id].push(task);
    }
    return map;
  }, [tasks]);

  const completedQuests = useMemo(() => {
    return quests.filter((q) => {
      const questTasks = tasksByQuest[q.id] ?? [];
      return questTasks.length > 0 && questTasks.every((t) => t.completed);
    }).length;
  }, [quests, tasksByQuest]);

  const todayTasks = useMemo(() => tasks.filter((t) => t.due_date === date), [tasks, date]);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const totalToday = todayTasks.length;

  const completedHabits = useMemo(() => habits.filter((h) => h.completedToday).length, [habits]);
  const totalHabits = habits.length;

  if (loading || profileLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="h-[72px] animate-pulse bg-[var(--skeleton-bg)] rounded-xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <StatCard
        value={`${completedHabits}/${totalHabits}`}
        numericValue={completedHabits}
        label="habits today"
        icon={Heart}
        accent
        accentColor="primary"
        index={0}
      />
      <StatCard
        value={`${completedToday}/${totalToday}`}
        numericValue={completedToday}
        label="tasks today"
        icon={CheckCircle}
        accent
        accentColor="success"
        index={1}
      />
      <StatCard
        value={profile?.xp_total ?? 0}
        numericValue={profile?.xp_total ?? 0}
        label="total XP"
        icon={Zap}
        accent
        accentColor="highlight"
        index={2}
      />
      <StatCard
        value={profile?.current_streak ?? 0}
        numericValue={profile?.current_streak ?? 0}
        label="day streak"
        icon={Flame}
        accent
        accentColor="streak"
        index={3}
      />
      <StatCard
        value={`${completedQuests}/${quests.length}`}
        numericValue={completedQuests}
        label="quests done"
        icon={Target}
        index={4}
      />
    </div>
  );
}
