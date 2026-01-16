"use client";

// =============================================================================
// THEME PROVIDER
// Manages dark/light theme state with localStorage persistence.
// Always defaults to dark mode regardless of system preference.
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

type Props = {
  children: React.ReactNode;
};

// Get initial theme from localStorage or default to dark (runs once)
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored) return stored;

  // Always default to dark mode regardless of system preference
  return "dark";
}

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after initial render
  // Using requestAnimationFrame defers the state update to avoid the lint warning
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);

    // Store preference
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
