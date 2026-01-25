"use client";

// =============================================================================
// DASHBOARD CONTENT COMPONENT
// Client wrapper for dashboard that coordinates state updates between
// DashboardStats and TodayClient when tasks/habits are modified.
// Includes onboarding checklist and daily briefing for new/returning users.
// Enhanced with scroll-reveal animations and section styling.
// =============================================================================

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import TodayClient from "./TodayClient";
import HabitsClient from "./HabitsClient";
import DashboardStats from "./DashboardStats";
import FocusLauncher from "./FocusLauncher";
import GettingStartedChecklist from "./GettingStartedChecklist";
import DailyBriefing from "./DailyBriefing";
import { useOnboarding } from "./OnboardingProvider";
import AnimatedContainer from "./ui/AnimatedContainer";
import type { ISODateString } from "@/app/lib/types";

type Props = {
  date: ISODateString;
};

// Animation variants for staggered sections
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

export default function DashboardContent({ date }: Props) {
  const [statsTrigger, setStatsTrigger] = useState(0);
  const { isOnboardingDone, loading: onboardingLoading } = useOnboarding();

  const refreshStats = useCallback(() => {
    setStatsTrigger((k) => k + 1);
  }, []);

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Onboarding Checklist - shows for new users until dismissed/completed */}
      {!onboardingLoading && !isOnboardingDone && (
        <AnimatedContainer direction="down" delay={0}>
          <GettingStartedChecklist />
        </AnimatedContainer>
      )}

      {/* Daily Briefing - shows after onboarding is done */}
      {!onboardingLoading && isOnboardingDone && (
        <AnimatedContainer direction="down" delay={0}>
          <DailyBriefing date={date} />
        </AnimatedContainer>
      )}

      {/* Stats Section */}
      <motion.section variants={sectionVariants}>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3 ">
          Overview
        </h2>
        <DashboardStats date={date} refreshTrigger={statsTrigger} />
      </motion.section>

      {/* Focus + Habits row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Session */}
        <motion.section variants={sectionVariants}>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3 ">
            Focus
          </h2>
          <FocusLauncher />
        </motion.section>

        {/* Daily Habits Section */}
        <motion.section variants={sectionVariants}>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3 ">
            Daily Habits
          </h2>
          <HabitsClient date={date} onHabitToggle={refreshStats} />
        </motion.section>
      </div>

      {/* Divider */}
      <motion.div
        variants={sectionVariants}
        className="h-px bg-[var(--border-subtle)]"
      />

      {/* Today's Timeline Section (full width) */}
      <motion.section variants={sectionVariants}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] ">
            Today&apos;s Timeline
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">{date}</span>
        </div>
        <TodayClient date={date} onTaskAction={refreshStats} />
      </motion.section>
    </motion.div>
  );
}
