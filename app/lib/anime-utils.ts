// =============================================================================
// ANIME.JS UTILITIES
// Helper functions for anime.js animations used across landing page components.
// Provides consistent easing, timing, and animation patterns.
// =============================================================================

import type { AnimeParams } from "animejs";

// Easing presets for consistent feel
export const EASING = {
  smooth: "easeOutExpo",
  bounce: "easeOutBack",
  snappy: "easeOutQuart",
  gentle: "easeInOutSine",
  linear: "linear",
} as const;

// Duration presets (in ms)
export const DURATION = {
  fast: 300,
  normal: 600,
  slow: 1000,
  reveal: 1200,
} as const;

// Stagger presets for sequential animations
export const STAGGER = {
  fast: 60,
  normal: 100,
  slow: 150,
} as const;

// Common animation patterns
export const ANIMATIONS = {
  // Fade in from below
  fadeInUp: {
    opacity: [0, 1],
    translateY: [40, 0],
    easing: EASING.smooth,
    duration: DURATION.reveal,
  } satisfies Partial<AnimeParams>,

  // Fade in from above
  fadeInDown: {
    opacity: [0, 1],
    translateY: [-40, 0],
    easing: EASING.smooth,
    duration: DURATION.reveal,
  } satisfies Partial<AnimeParams>,

  // Scale in with bounce
  scaleIn: {
    opacity: [0, 1],
    scale: [0.8, 1],
    easing: EASING.bounce,
    duration: DURATION.normal,
  } satisfies Partial<AnimeParams>,

  // Pulse effect
  pulse: {
    scale: [1, 1.05, 1],
    easing: EASING.gentle,
    duration: DURATION.slow,
  } satisfies Partial<AnimeParams>,

  // Glow pulse
  glowPulse: {
    opacity: [0.3, 0.6, 0.3],
    easing: EASING.gentle,
    duration: 2000,
    loop: true,
  } satisfies Partial<AnimeParams>,
};

// XP bar fill animation generator
export function createXpFillAnimation(
  targetSelector: string,
  fromPercent: number,
  toPercent: number
): AnimeParams {
  return {
    targets: targetSelector,
    width: [`${fromPercent}%`, `${toPercent}%`],
    easing: EASING.snappy,
    duration: DURATION.reveal,
  };
}

// Counter animation generator (for stats)
export function createCounterAnimation(
  targetSelector: string,
  endValue: number,
  duration = 2000
): AnimeParams {
  return {
    targets: targetSelector,
    innerHTML: [0, endValue],
    round: 1,
    easing: EASING.snappy,
    duration,
  };
}

// Timer ring animation generator
export function createTimerRingAnimation(
  targetSelector: string,
  durationMs: number
): AnimeParams {
  return {
    targets: targetSelector,
    strokeDashoffset: [283, 0], // 2 * PI * 45 (circumference)
    easing: EASING.linear,
    duration: durationMs,
  };
}

// Particle explosion animation (for level up, task complete)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createParticleAnimation(targetSelector: string): AnimeParams {
  return {
    targets: targetSelector,
    translateX: () => Math.random() * 200 - 100,
    translateY: () => Math.random() * -150 - 50,
    opacity: [1, 0],
    scale: [1, 0],
    easing: EASING.snappy,
    duration: 800,
    delay: (_el: Element, i: number) => i * 30,
  };
}

// Check for reduced motion preference
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Get animation config based on reduced motion preference
export function getAnimationConfig<T extends AnimeParams>(
  config: T,
  reducedConfig?: Partial<T>
): T {
  if (prefersReducedMotion()) {
    return {
      ...config,
      duration: 0,
      delay: 0,
      ...reducedConfig,
    };
  }
  return config;
}
