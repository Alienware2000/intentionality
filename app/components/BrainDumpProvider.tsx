"use client";

// =============================================================================
// BRAIN DUMP PROVIDER
// Global context for brain dump modal.
// Handles Ctrl+K / Cmd+K keyboard shortcut to open quick capture.
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import BrainDumpModal from "./BrainDumpModal";
import type { BrainDumpEntry } from "@/app/lib/types";

type BrainDumpContextValue = {
  openBrainDump: () => void;
  closeBrainDump: () => void;
  isOpen: boolean;
};

const BrainDumpContext = createContext<BrainDumpContextValue | null>(null);

export function useBrainDump() {
  const ctx = useContext(BrainDumpContext);
  if (!ctx) {
    throw new Error("useBrainDump must be used within BrainDumpProvider");
  }
  return ctx;
}

type Props = {
  children: React.ReactNode;
};

export function BrainDumpProvider({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const openBrainDump = useCallback(() => setIsOpen(true), []);
  const closeBrainDump = useCallback(() => setIsOpen(false), []);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Check for Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleCapture(entry: BrainDumpEntry) {
    // Entry captured successfully - could show toast here in the future
    void entry;
  }

  return (
    <BrainDumpContext.Provider value={{ openBrainDump, closeBrainDump, isOpen }}>
      {children}
      <BrainDumpModal
        isOpen={isOpen}
        onClose={closeBrainDump}
        onCapture={handleCapture}
      />
    </BrainDumpContext.Provider>
  );
}
