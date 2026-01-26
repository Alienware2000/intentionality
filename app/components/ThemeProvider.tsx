"use client";

// =============================================================================
// THEME PROVIDER
// Manages dark/light theme and accent color state with localStorage persistence.
// Always defaults to dark mode and crimson accent regardless of system preference.
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Theme = "dark" | "light";
type AccentTheme = "crimson" | "teal" | "gold" | "violet" | "emerald";
type BaseTheme = "charcoal" | "midnight";

type ThemeContextValue = {
  theme: Theme;
  accent: AccentTheme;
  baseTheme: BaseTheme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: AccentTheme) => void;
  setBaseTheme: (base: BaseTheme) => void;
};

// -----------------------------------------------------------------------------
// Accent Theme Definitions
// -----------------------------------------------------------------------------

export const ACCENT_THEMES: Record<AccentTheme, {
  name: string;
  primary: string;
  highlight: string;
  description: string;
}> = {
  crimson: {
    name: "Crimson",
    primary: "#dc2626",
    highlight: "#fbbf24",
    description: "Bold & Focused",
  },
  teal: {
    name: "Teal",
    primary: "#00d4aa",
    highlight: "#f0c040",
    description: "Calm & Creative",
  },
  gold: {
    name: "Gold",
    primary: "#f0c040",
    highlight: "#00d4aa",
    description: "Warm & Energetic",
  },
  violet: {
    name: "Violet",
    primary: "#7c5cff",
    highlight: "#f0c040",
    description: "Deep & Focused",
  },
  emerald: {
    name: "Emerald",
    primary: "#10b981",
    highlight: "#fbbf24",
    description: "Fresh & Natural",
  },
};

export const ACCENT_THEME_ORDER: AccentTheme[] = ["crimson", "teal", "gold", "violet", "emerald"];

// -----------------------------------------------------------------------------
// Base Theme Definitions (Dark Mode Only)
// -----------------------------------------------------------------------------

export const BASE_THEMES: Record<BaseTheme, {
  name: string;
  description: string;
  bgPreview: string;
}> = {
  charcoal: {
    name: "Charcoal",
    description: "Softer contrast",
    bgPreview: "#18181b",
  },
  midnight: {
    name: "Midnight",
    description: "True black",
    bgPreview: "#09090b",
  },
};

export const BASE_THEME_ORDER: BaseTheme[] = ["charcoal", "midnight"];

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// Initialization Helpers
// -----------------------------------------------------------------------------

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored && (stored === "dark" || stored === "light")) return stored;

  // Always default to dark mode regardless of system preference
  return "dark";
}

function getInitialAccent(): AccentTheme {
  if (typeof window === "undefined") return "crimson";

  const stored = localStorage.getItem("accent") as AccentTheme | null;
  if (stored && ACCENT_THEME_ORDER.includes(stored)) return stored;

  return "crimson";
}

function getInitialBaseTheme(): BaseTheme {
  if (typeof window === "undefined") return "charcoal";

  const stored = localStorage.getItem("baseTheme") as BaseTheme | null;
  if (stored && BASE_THEME_ORDER.includes(stored)) return stored;

  return "charcoal";
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accent, setAccentState] = useState<AccentTheme>(getInitialAccent);
  const [baseTheme, setBaseThemeState] = useState<BaseTheme>(getInitialBaseTheme);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after initial render
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Apply theme class, accent, and base theme attributes to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Apply theme class
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Apply accent attribute
    root.setAttribute("data-accent", accent);
    localStorage.setItem("accent", accent);

    // Apply base theme attribute (only affects dark mode via CSS)
    root.setAttribute("data-base", baseTheme);
    localStorage.setItem("baseTheme", baseTheme);
  }, [theme, accent, baseTheme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setAccent = useCallback((newAccent: AccentTheme) => {
    setAccentState(newAccent);
  }, []);

  const setBaseTheme = useCallback((newBase: BaseTheme) => {
    setBaseThemeState(newBase);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, baseTheme, toggleTheme, setTheme, setAccent, setBaseTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Utility Hook for Accent Colors
// -----------------------------------------------------------------------------

/**
 * Hook to get the current accent theme colors.
 * Useful for components that need programmatic access to theme colors.
 */
export function useAccentColors() {
  const { accent } = useTheme();
  return ACCENT_THEMES[accent];
}
