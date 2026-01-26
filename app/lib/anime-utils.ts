// =============================================================================
// ANIME.JS UTILITIES
// Helper functions for anime.js animations used across the app.
// Includes Iron Man HUD-inspired effects, premium micro-interactions,
// and consistent easing/timing patterns.
// =============================================================================

import type { AnimeParams } from "animejs";

// Easing presets for consistent feel
export const EASING = {
  smooth: "easeOutExpo",
  bounce: "easeOutBack",
  snappy: "easeOutQuart",
  gentle: "easeInOutSine",
  linear: "linear",
  // Premium easing curves
  premium: "cubicBezier(0.16, 1, 0.3, 1)",  // iOS-like smooth
  dramatic: "cubicBezier(0.68, -0.55, 0.265, 1.55)",  // Overshoot bounce
} as const;

// Duration presets (in ms) - snappy, responsive feel
export const DURATION = {
  instant: 100,
  fast: 180,
  normal: 350,
  slow: 500,
  reveal: 400,
  // HUD-specific timings
  hudScan: 2000,
  hudFlicker: 150,
} as const;

// Stagger presets for sequential animations - tight for snappy cascade
export const STAGGER = {
  fast: 30,
  normal: 50,
  slow: 80,
  // Page reveal stagger
  page: 60,
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

// =============================================================================
// IRON MAN HUD ANIMATIONS
// Premium, immersive animation effects inspired by sci-fi interfaces
// =============================================================================

/**
 * Creates a HUD scan line effect.
 * A horizontal line that sweeps across the target element.
 */
export function createHudScan(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
  } = {}
): AnimeParams {
  const { duration = DURATION.hudScan, delay = 0 } = options;

  return {
    targets: targetSelector,
    translateX: ["-100%", "100%"],
    opacity: [0, 0.6, 0.6, 0],
    easing: "linear",
    duration,
    delay,
  };
}

/**
 * Creates a holographic flicker effect.
 * Quick opacity flicker for interactive element feedback.
 */
export function createHoloFlicker(
  targetSelector: string,
  options: {
    intensity?: number;
  } = {}
): AnimeParams {
  const { intensity = 0.2 } = options;
  const min = 1 - intensity;

  return {
    targets: targetSelector,
    opacity: [1, min, 1, min * 0.9, 1],
    duration: DURATION.hudFlicker,
    easing: "steps(5)",
  };
}

/**
 * Creates a data stream loading effect.
 * Vertical lines streaming down for loading states.
 */
export function createDataStream(
  targetSelector: string,
  options: {
    duration?: number;
  } = {}
): AnimeParams {
  const { duration = 2000 } = options;

  return {
    targets: targetSelector,
    backgroundPositionY: ["0px", "-100px"],
    easing: "linear",
    duration,
    loop: true,
  };
}

/**
 * Creates a page enter animation.
 * Fade in with subtle scale and blur clear.
 */
export function createPageEnter(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
  } = {}
): AnimeParams {
  const { duration = 300, delay = 0 } = options;

  return {
    targets: targetSelector,
    opacity: [0, 1],
    scale: [0.98, 1],
    filter: ["blur(4px)", "blur(0px)"],
    easing: EASING.premium,
    duration,
    delay,
  };
}

/**
 * Creates a section reveal animation.
 * Staggered reveal for dashboard sections.
 */
export function createSectionReveal(
  targetSelector: string,
  options: {
    stagger?: number;
    duration?: number;
  } = {}
): AnimeParams {
  const { stagger = STAGGER.page, duration = 400 } = options;

  return {
    targets: targetSelector,
    opacity: [0, 1],
    translateY: [20, 0],
    easing: "easeOutCubic",
    duration,
    delay: (_el: Element, i: number) => i * stagger,
  };
}

/**
 * Creates a value change animation with highlight.
 * For animating number changes with visual feedback.
 */
export function createValueChange(
  targetSelector: string,
  options: {
    duration?: number;
    highlightColor?: string;
  } = {}
): AnimeParams {
  const { duration = 300 } = options;

  return {
    targets: targetSelector,
    scale: [1, 1.05, 1],
    easing: "easeOutBack",
    duration,
  };
}

/**
 * Creates a button press animation.
 * Quick scale down and back up for tactile feedback.
 */
export function createButtonPress(targetSelector: string): AnimeParams {
  return {
    targets: targetSelector,
    scale: [1, 0.95, 1],
    duration: DURATION.instant,
    easing: "easeOutQuad",
  };
}

/**
 * Creates a success celebration animation.
 * Scale up with slight bounce for positive feedback.
 */
export function createSuccessCelebration(
  targetSelector: string,
  options: {
    duration?: number;
    scale?: number;
  } = {}
): AnimeParams {
  const { duration = 400, scale = 1.1 } = options;

  return {
    targets: targetSelector,
    scale: [1, scale, 1],
    easing: EASING.bounce,
    duration,
  };
}

/**
 * Creates a shake animation for errors.
 * Horizontal shake to indicate error or invalid action.
 */
export function createErrorShake(targetSelector: string): AnimeParams {
  return {
    targets: targetSelector,
    translateX: [0, -8, 8, -6, 6, -4, 4, 0],
    duration: 400,
    easing: "easeOutQuad",
  };
}

/**
 * Creates ambient glow pulse animation.
 * Subtle pulsing glow for active/highlighted elements.
 */
export function createAmbientGlow(
  targetSelector: string,
  options: {
    color?: string;
    minSize?: number;
    maxSize?: number;
    duration?: number;
  } = {}
): AnimeParams {
  const {
    color = "var(--accent-primary-rgb)",
    minSize = 20,
    maxSize = 35,
    duration = 2000,
  } = options;

  return {
    targets: targetSelector,
    boxShadow: [
      `0 0 ${minSize}px rgba(${color}, 0.15)`,
      `0 0 ${maxSize}px rgba(${color}, 0.3)`,
      `0 0 ${minSize}px rgba(${color}, 0.15)`,
    ],
    easing: "easeInOutSine",
    duration,
    loop: true,
  };
}

// =============================================================================
// 3D TILT EFFECT
// Mouse-tracking perspective transform for premium hover effect
// =============================================================================

type TiltCleanup = () => void;

/**
 * Applies 3D tilt effect to an element based on mouse position.
 * Returns cleanup function to remove event listeners.
 */
export function apply3DTilt(
  element: HTMLElement,
  options: {
    maxTilt?: number;
    perspective?: number;
    scale?: number;
    transitionDuration?: number;
  } = {}
): TiltCleanup {
  const {
    maxTilt = 8,
    perspective = 1000,
    scale = 1.02,
    transitionDuration = 150,
  } = options;

  // Don't apply if user prefers reduced motion
  if (prefersReducedMotion()) {
    return () => {};
  }

  let animationFrame: number | null = null;

  const handleMouseMove = (e: MouseEvent) => {
    if (animationFrame) cancelAnimationFrame(animationFrame);

    animationFrame = requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const tiltX = (mouseY / (rect.height / 2)) * -maxTilt;
      const tiltY = (mouseX / (rect.width / 2)) * maxTilt;

      element.style.transform = `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`;
    });
  };

  const handleMouseLeave = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    element.style.transform = "";
  };

  // Set up transition
  element.style.transition = `transform ${transitionDuration}ms ease-out`;
  element.style.transformStyle = "preserve-3d";

  element.addEventListener("mousemove", handleMouseMove);
  element.addEventListener("mouseleave", handleMouseLeave);

  // Return cleanup function
  return () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    element.removeEventListener("mousemove", handleMouseMove);
    element.removeEventListener("mouseleave", handleMouseLeave);
    element.style.transform = "";
    element.style.transition = "";
  };
}

// =============================================================================
// ANIME.JS GRID STAGGER UTILITIES
// Diagonal wave patterns and grid-based animations
// =============================================================================

/**
 * Creates a grid stagger delay function for anime.js.
 * Elements animate in diagonal wave pattern from specified corner.
 */
export function createGridStagger(
  rows: number,
  cols: number,
  options: {
    from?: "first" | "last" | "center";
    baseDelay?: number;
    axis?: "x" | "y" | "both";
  } = {}
): (el: Element, i: number) => number {
  const { from = "first", baseDelay = 30, axis = "both" } = options;

  return (_el: Element, i: number) => {
    const row = Math.floor(i / cols);
    const col = i % cols;

    let distance: number;
    if (from === "first") {
      distance = axis === "x" ? col : axis === "y" ? row : row + col;
    } else if (from === "last") {
      distance =
        axis === "x" ? cols - 1 - col : axis === "y" ? rows - 1 - row : (rows - 1 - row) + (cols - 1 - col);
    } else {
      // center
      const centerRow = (rows - 1) / 2;
      const centerCol = (cols - 1) / 2;
      distance =
        axis === "x"
          ? Math.abs(col - centerCol)
          : axis === "y"
          ? Math.abs(row - centerRow)
          : Math.abs(row - centerRow) + Math.abs(col - centerCol);
    }

    return distance * baseDelay;
  };
}

/**
 * Creates a stagger animation for stat cards with scale effect.
 */
export function createStatCardEntrance(
  targetSelector: string,
  options: {
    stagger?: number;
    duration?: number;
  } = {}
): AnimeParams {
  const { stagger = 60, duration = 450 } = options;

  return {
    targets: targetSelector,
    opacity: [0, 1],
    translateY: [15, 0],
    scale: [0.95, 1],
    easing: "spring(1, 80, 10, 0)",
    duration,
    delay: (_el: Element, i: number) => i * stagger,
  };
}

/**
 * Creates an icon pulse animation for entrance effects.
 */
export function createIconPulse(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
    scale?: number;
  } = {}
): AnimeParams {
  const { duration = 400, delay = 0, scale = 1.2 } = options;

  return {
    targets: targetSelector,
    scale: [0.8, scale, 1],
    opacity: [0, 1, 1],
    easing: "easeOutBack",
    duration,
    delay,
  };
}

/**
 * Creates a value highlight flash animation.
 */
export function createValueFlash(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
  } = {}
): AnimeParams {
  const { duration = 300, delay = 0 } = options;

  return {
    targets: targetSelector,
    backgroundColor: [
      "rgba(var(--accent-primary-rgb), 0.3)",
      "rgba(var(--accent-primary-rgb), 0)",
    ],
    easing: "easeOutQuad",
    duration,
    delay,
  };
}

/**
 * Creates a spring-based counter animation.
 */
export function createSpringCounter(
  targetSelector: string,
  endValue: number,
  options: {
    startValue?: number;
    duration?: number;
  } = {}
): AnimeParams {
  const { startValue = 0, duration = 800 } = options;

  return {
    targets: { val: startValue },
    val: endValue,
    round: 1,
    easing: "spring(1, 80, 12, 0)",
    duration,
    update: function (anim) {
      const target = document.querySelector(targetSelector);
      if (target) {
        const animatable = anim.animatables[0];
        if (animatable) {
          const obj = animatable.target as unknown as { val: number };
          target.textContent = Math.round(obj.val).toLocaleString();
        }
      }
    },
  };
}

/**
 * Creates an SVG checkmark draw animation.
 */
export function createSvgCheckDraw(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
  } = {}
): AnimeParams {
  const { duration = 350, delay = 0 } = options;

  return {
    targets: targetSelector,
    strokeDashoffset: [50, 0],
    opacity: [0, 1],
    easing: "easeOutQuad",
    duration,
    delay,
  };
}

/**
 * Creates a completion ripple animation.
 */
export function createCompletionRipple(
  targetSelector: string,
  options: {
    duration?: number;
    scale?: number;
  } = {}
): AnimeParams {
  const { duration = 400, scale = 2 } = options;

  return {
    targets: targetSelector,
    scale: [0, scale],
    opacity: [0.6, 0],
    easing: "easeOutExpo",
    duration,
  };
}

/**
 * Creates a line draw animation (for dividers).
 */
export function createLineDraw(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
    direction?: "left" | "right" | "center";
  } = {}
): AnimeParams {
  const { duration = 400, delay = 0, direction = "left" } = options;

  const scaleX = direction === "center" ? { scaleX: [0, 1] } : { scaleX: [0, 1] };
  const origin =
    direction === "left"
      ? "left center"
      : direction === "right"
      ? "right center"
      : "center center";

  return {
    targets: targetSelector,
    ...scaleX,
    easing: "easeOutExpo",
    duration,
    delay,
    begin: (anim) => {
      const target = anim.animatables[0]?.target as HTMLElement;
      if (target) {
        target.style.transformOrigin = origin;
      }
    },
  };
}

/**
 * Creates a section cascade animation for dashboard.
 */
export function createSectionCascade(
  targetSelector: string,
  options: {
    stagger?: number;
    duration?: number;
  } = {}
): AnimeParams {
  const { stagger = 80, duration = 500 } = options;

  return {
    targets: targetSelector,
    opacity: [0, 1],
    translateY: [30, 0],
    filter: ["blur(4px)", "blur(0px)"],
    easing: "easeOutCubic",
    duration,
    delay: (_el: Element, i: number) => i * stagger,
  };
}

/**
 * Creates an area chart reveal animation.
 */
export function createAreaChartReveal(
  targetSelector: string,
  options: {
    duration?: number;
    delay?: number;
  } = {}
): AnimeParams {
  const { duration = 800, delay = 0 } = options;

  return {
    targets: targetSelector,
    opacity: [0, 1],
    translateX: ["-100%", "0%"],
    easing: "easeOutExpo",
    duration,
    delay,
  };
}

/**
 * Creates a spring-back animation for value changes.
 */
export function createSpringBounce(
  targetSelector: string,
  options: {
    scale?: number;
  } = {}
): AnimeParams {
  const { scale = 1.1 } = options;

  return {
    targets: targetSelector,
    scale: [1, scale, 1],
    easing: "spring(1, 80, 10, 0)",
    duration: 400,
  };
}

// =============================================================================
// AMBIENT PARTICLES
// Subtle floating particles for premium ambient effect
// =============================================================================

type ParticleCleanup = () => void;

/**
 * Creates ambient floating particles in a container.
 * Returns cleanup function to remove particles.
 */
export function createAmbientParticles(
  container: HTMLElement,
  options: {
    count?: number;
    color?: string;
    size?: number;
    speed?: number;
  } = {}
): ParticleCleanup {
  const {
    count = 15,
    color = "var(--accent-primary)",
    size = 2,
    speed = 20000,
  } = options;

  // Don't create particles if user prefers reduced motion
  if (prefersReducedMotion()) {
    return () => {};
  }

  const particles: HTMLElement[] = [];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      opacity: ${0.1 + Math.random() * 0.15};
      pointer-events: none;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
    `;

    container.style.position = "relative";
    container.style.overflow = "hidden";
    container.appendChild(particle);
    particles.push(particle);

    // Animate each particle
    const animateParticle = () => {
      const duration = speed + Math.random() * speed;
      const xDrift = (Math.random() - 0.5) * 100;
      const yDrift = (Math.random() - 0.5) * 100;

      particle.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: `translate(${xDrift}px, ${yDrift}px)` },
        ],
        {
          duration,
          easing: "ease-in-out",
          iterations: Infinity,
          direction: "alternate",
        }
      );
    };

    animateParticle();
  }

  // Return cleanup function
  return () => {
    particles.forEach((p) => p.remove());
  };
}
