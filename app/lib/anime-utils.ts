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

// Duration presets (in ms) - snappy, responsive feel
export const DURATION = {
  fast: 180,
  normal: 350,
  slow: 500,
  reveal: 400,
} as const;

// Stagger presets for sequential animations - tight for snappy cascade
export const STAGGER = {
  fast: 30,
  normal: 50,
  slow: 80,
} as const;

// Common animation patterns
export const ANIMATIONS = {
  // Fade in from below - reduced distance for snappier feel
  fadeInUp: {
    opacity: [0, 1],
    translateY: [12, 0],
    easing: EASING.smooth,
    duration: DURATION.reveal,
  } satisfies Partial<AnimeParams>,

  // Fade in from above - reduced distance
  fadeInDown: {
    opacity: [0, 1],
    translateY: [-12, 0],
    easing: EASING.smooth,
    duration: DURATION.reveal,
  } satisfies Partial<AnimeParams>,

  // Scale in with bounce - tighter scale range
  scaleIn: {
    opacity: [0, 1],
    scale: [0.95, 1],
    easing: EASING.bounce,
    duration: DURATION.normal,
  } satisfies Partial<AnimeParams>,

  // Pulse effect - faster pulse
  pulse: {
    scale: [1, 1.03, 1],
    easing: EASING.gentle,
    duration: 300,
  } satisfies Partial<AnimeParams>,

  // Glow pulse - snappier ambient animation
  glowPulse: {
    opacity: [0.3, 0.6, 0.3],
    easing: EASING.gentle,
    duration: 1500,
    loop: true,
  } satisfies Partial<AnimeParams>,
};

// XP bar fill animation generator - snappy fill
export function createXpFillAnimation(
  targetSelector: string,
  fromPercent: number,
  toPercent: number
): AnimeParams {
  return {
    targets: targetSelector,
    width: [`${fromPercent}%`, `${toPercent}%`],
    easing: EASING.snappy,
    duration: 350,
  };
}

// Counter animation generator (for stats) - faster count
export function createCounterAnimation(
  targetSelector: string,
  endValue: number,
  duration = 500
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

// =============================================================================
// NEW ANIMATION GENERATORS
// Additional utilities for the UI overhaul
// =============================================================================

/**
 * Creates a staggered reveal animation for list items.
 * Subtle entrance animation for cards and list items.
 */
export function createStaggerReveal(
  targetSelector: string,
  options: {
    duration?: number;
    stagger?: number;
    direction?: "up" | "down" | "left" | "right";
    translateAmount?: number;
  } = {}
): AnimeParams {
  const {
    duration = 250,
    stagger = 35,
    direction = "up",
    translateAmount = 10,
  } = options;

  const translateMap = {
    up: { translateY: [translateAmount, 0] },
    down: { translateY: [-translateAmount, 0] },
    left: { translateX: [translateAmount, 0] },
    right: { translateX: [-translateAmount, 0] },
  };

  return {
    targets: targetSelector,
    opacity: [0, 1],
    ...translateMap[direction],
    easing: "easeOutCubic",
    duration,
    delay: (_el: Element, i: number) => i * stagger,
  };
}

/**
 * Creates a card entrance animation.
 * Subtle fade-in with slight scale for cards and sections.
 */
export function createCardEntrance(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
    scale?: boolean;
  } = {}
): AnimeParams {
  const { duration = 220, delay = 0, scale = true } = options;

  return {
    targets: targetSelector,
    opacity: [0, 1],
    translateY: [8, 0],
    ...(scale ? { scale: [0.98, 1] } : {}),
    easing: "easeOutCubic",
    duration,
    delay,
  };
}

/**
 * Creates a micro-interaction animation for buttons and interactive elements.
 * Quick, snappy feedback for user interactions.
 */
export function createMicroInteraction(
  targetSelector: string,
  type: "press" | "hover" | "success" | "error" = "press"
): AnimeParams {
  const animations = {
    press: {
      scale: [1, 0.97, 1],
      duration: 100,
      easing: "easeOutQuad",
    },
    hover: {
      scale: [1, 1.02],
      duration: 120,
      easing: "easeOutQuad",
    },
    success: {
      scale: [1, 1.03, 1],
      duration: 200,
      easing: "easeOutBack",
    },
    error: {
      translateX: [0, -3, 3, -3, 3, 0],
      duration: 300,
      easing: "easeOutQuad",
    },
  };

  return {
    targets: targetSelector,
    ...animations[type],
  };
}

/**
 * Creates a number counter animation.
 * Animates a number from start to end value.
 */
export function createAnimatedCounter(
  targetSelector: string,
  endValue: number,
  options: {
    startValue?: number;
    duration?: number;
    decimals?: number;
    suffix?: string;
  } = {}
): AnimeParams {
  const {
    startValue = 0,
    duration = 450,
    decimals = 0,
    suffix = "",
  } = options;

  return {
    targets: targetSelector,
    innerHTML: [startValue, endValue],
    round: decimals === 0 ? 1 : Math.pow(10, decimals),
    easing: "easeOutCubic",
    duration,
    update: function (anim) {
      const target = anim.animatables[0]?.target as HTMLElement;
      if (target && suffix) {
        const value = parseFloat(target.innerHTML);
        target.innerHTML = value.toFixed(decimals) + suffix;
      }
    },
  };
}

/**
 * Creates a glow pulse animation.
 * Subtle pulsing glow effect for active/highlighted elements.
 */
export function createGlowPulse(
  targetSelector: string,
  options: {
    color?: string;
    minOpacity?: number;
    maxOpacity?: number;
    duration?: number;
  } = {}
): AnimeParams {
  const {
    color = "239, 68, 68", // accent-primary RGB
    minOpacity = 0.1,
    maxOpacity = 0.3,
    duration = 1500,
  } = options;

  return {
    targets: targetSelector,
    boxShadow: [
      `0 0 20px rgba(${color}, ${minOpacity})`,
      `0 0 30px rgba(${color}, ${maxOpacity})`,
      `0 0 20px rgba(${color}, ${minOpacity})`,
    ],
    easing: "easeInOutSine",
    duration,
    loop: true,
  };
}

/**
 * Creates a progress bar fill animation.
 * Smooth fill animation for progress indicators.
 */
export function createProgressFill(
  targetSelector: string,
  percentage: number,
  options: {
    duration?: number;
    delay?: number;
  } = {}
): AnimeParams {
  const { duration = 320, delay = 0 } = options;

  return {
    targets: targetSelector,
    width: `${percentage}%`,
    easing: "easeOutCubic",
    duration,
    delay,
  };
}

/**
 * Creates a checkmark draw animation.
 * Draws a checkmark SVG path for completion animations.
 */
export function createCheckmarkDraw(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
  } = {}
): AnimeParams {
  const { duration = 300, delay = 0 } = options;

  return {
    targets: targetSelector,
    strokeDashoffset: [100, 0],
    easing: "easeOutQuad",
    duration,
    delay,
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
