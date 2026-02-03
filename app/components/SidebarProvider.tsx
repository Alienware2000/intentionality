"use client";

// =============================================================================
// SIDEBAR PROVIDER
// Manages sidebar collapsed/expanded state with localStorage persistence.
// Provides keyboard shortcut (Cmd/Ctrl + B) for toggling.
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { prefersReducedMotion } from "@/app/lib/anime-utils";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SidebarContextValue = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  animationsEnabled: boolean;
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const STORAGE_KEY = "intentionality_sidebar_collapsed";

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// Initialization Helper
// -----------------------------------------------------------------------------

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    return stored === "true";
  }

  return false;
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function SidebarProvider({ children }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const [mounted, setMounted] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Mark as mounted after initial render
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
      setAnimationsEnabled(!prefersReducedMotion());
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed, mounted]);

  // Keyboard shortcut: Cmd/Ctrl + B
  useEffect(() => {
    if (!mounted) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux) + B
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        // Don't trigger if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInput) {
          e.preventDefault();
          setIsCollapsed((prev) => !prev);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const collapseSidebar = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const expandSidebar = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
        animationsEnabled,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
