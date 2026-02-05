"use client";

// =============================================================================
// DASHBOARD CONTENT COMPONENT
// Client wrapper for dashboard that coordinates state updates between
// DashboardStats and TodayClient when tasks/habits are modified.
// Includes onboarding checklist and daily briefing for new/returning users.
// Enhanced with anime.js-style cascade animations and line draw dividers.
// =============================================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import anime from "animejs";
import TodayClient from "./TodayClient";
import HabitsClient from "./HabitsClient";
import DashboardStats from "./DashboardStats";
import FocusLauncher from "./FocusLauncher";
import GettingStartedChecklist from "./GettingStartedChecklist";
import SocialDiscoveryCard from "./SocialDiscoveryCard";
import DailyBriefing from "./DailyBriefing";
import PremiumUsageBanner from "./PremiumUsageBanner";
import { useOnboarding } from "./OnboardingProvider";
import AnimatedContainer from "./ui/AnimatedContainer";
import type { ISODateString } from "@/app/lib/types";

type Props = {
  date: ISODateString;
};

// Anime.js-style cascade animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 15,
    },
  },
};

// Animated divider line component
function AnimatedDivider() {
  const dividerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotionHook = useReducedMotion();
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated || prefersReducedMotionHook || !dividerRef.current) return;

    dividerRef.current.style.transform = "scaleX(0)";
    dividerRef.current.style.transformOrigin = "left center";

    anime({
      targets: dividerRef.current,
      scaleX: [0, 1],
      easing: "easeOutExpo",
      duration: 600,
      delay: 400,
      complete: () => setHasAnimated(true),
    });
  }, [hasAnimated, prefersReducedMotionHook]);

  return (
    <motion.div variants={sectionVariants}>
      <div
        ref={dividerRef}
        className="h-px bg-gradient-to-r from-[var(--accent-primary)]/30 via-[var(--border-subtle)] to-transparent"
        style={{ transform: prefersReducedMotionHook ? "scaleX(1)" : "scaleX(0)" }}
      />
    </motion.div>
  );
}

export default function DashboardContent({ date }: Props) {
  const [statsTrigger, setStatsTrigger] = useState(0);
  const { isOnboardingDone, loading: onboardingLoading } = useOnboarding();
  const prefersReducedMotionHook = useReducedMotion();
  const searchParams = useSearchParams();

  // Section refs for scroll-to-section functionality
  const focusRef = useRef<HTMLElement>(null);
  const habitsRef = useRef<HTMLElement>(null);
  const tasksRef = useRef<HTMLElement>(null);

  const refreshStats = useCallback(() => {
    setStatsTrigger((k) => k + 1);
  }, []);

  // Handle scroll-to-section from URL query param
  useEffect(() => {
    const section = searchParams.get("section");
    if (!section) return;

    const refs: Record<string, React.RefObject<HTMLElement | null>> = {
      focus: focusRef,
      habits: habitsRef,
      tasks: tasksRef,
    };

    const ref = refs[section];
    if (ref?.current) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [searchParams]);

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

      {/* Daily Briefing - AI recommendations only */}
      {!onboardingLoading && isOnboardingDone && (
        <AnimatedContainer direction="down" delay={0.05}>
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

      {/* Social Discovery - contextual for engaged users (after onboarding complete) */}
      {!onboardingLoading && isOnboardingDone && (
        <AnimatedContainer direction="down" delay={0.1}>
          <SocialDiscoveryCard />
        </AnimatedContainer>
      )}

      {/* Premium Usage Banner - subtle usage indicator for AI features */}
      {!onboardingLoading && isOnboardingDone && (
        <AnimatedContainer direction="down" delay={0.15}>
          <PremiumUsageBanner />
        </AnimatedContainer>
      )}

      {/* Focus + Habits row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Session */}
        <motion.section ref={focusRef} variants={sectionVariants}>
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3 ">
            Focus
          </h2>
          <FocusLauncher />
        </motion.section>

        {/* Daily Habits Section */}
        <motion.section ref={habitsRef} variants={sectionVariants}>
          <HabitsClient date={date} onHabitToggle={refreshStats} />
        </motion.section>
      </div>

      {/* Animated Divider */}
      <AnimatedDivider />

      {/* Today's Tasks & Schedule Section */}
      <motion.section ref={tasksRef} variants={sectionVariants}>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            Today
          </h2>
          <span className="text-xs font-mono text-[var(--text-muted)]">{date}</span>
        </div>
        <TodayClient date={date} onTaskAction={refreshStats} />
      </motion.section>
    </motion.div>
  );
}
