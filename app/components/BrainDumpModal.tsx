"use client";

// =============================================================================
// BRAIN DUMP MODAL COMPONENT
// Quick capture modal for thoughts and ideas.
// Triggered via Ctrl+K / Cmd+K keyboard shortcut.
// anime.js inspired: minimal dark theme with dramatic focus.
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import type { BrainDumpEntry } from "@/app/lib/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCapture?: (entry: BrainDumpEntry) => void;
};

export default function BrainDumpModal({ isOpen, onClose, onCapture }: Props) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setContent("");
      setError(null);
    }
  }, [isOpen]);

  async function handleCapture() {
    if (!content.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const result = await fetchApi<{ ok: true; entry: BrainDumpEntry }>(
        "/api/brain-dump",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        }
      );

      onCapture?.(result.entry);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
    // Submit on Cmd/Ctrl+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleCapture();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "fixed top-[10%] sm:top-[20%] left-1/2 -translate-x-1/2 z-50",
              "w-full max-w-lg p-4 sm:p-6 rounded-lg mx-4 sm:mx-0",
              "bg-[var(--bg-card)] border border-[var(--border-default)]",
              "shadow-2xl shadow-black/50",
              "max-h-[85vh] overflow-y-auto"
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                  <Brain size={20} className="text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                    Brain Dump
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Capture your thoughts
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 rounded hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Tasks, ideas, reminders..."
                rows={5}
                className={cn(
                  "w-full px-4 py-3 rounded-lg resize-none",
                  "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                  "focus:outline-none focus:border-[var(--accent-primary)]",
                  "transition-colors"
                )}
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-2 text-sm text-[var(--priority-high)]">{error}</p>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between">
              {/* Keyboard shortcut hint - only show on desktop */}
              <p className="hidden md:block text-xs text-[var(--text-muted)]">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono text-[10px]">
                  {typeof window !== "undefined" && navigator.platform.includes("Mac")
                    ? "Cmd"
                    : "Ctrl"}
                </kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono text-[10px]">
                  Enter
                </kbd>
                {" to capture"}
              </p>
              {/* Spacer for mobile to push button to the right */}
              <div className="md:hidden" />
              <button
                onClick={handleCapture}
                disabled={saving || !content.trim()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Zap size={14} />
                {saving ? "Capturing..." : "Capture"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
