"use client";

// =============================================================================
// BRAIN DUMP MODAL COMPONENT
// Quick capture modal for thoughts and ideas.
// Triggered via Ctrl+K / Cmd+K keyboard shortcut.
// anime.js inspired: minimal dark theme with dramatic focus.
// Now includes NLP parsing preview for smart task creation.
// =============================================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap, Calendar, Flag, Clock, Sparkles } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { parseTaskInput } from "@/app/lib/nlp-parser";
import { useOnboarding } from "./OnboardingProvider";
import type { BrainDumpEntry, ParsedTaskInput } from "@/app/lib/types";

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
  const { markStepComplete } = useOnboarding();

  // Parse content for smart preview
  const parsed: ParsedTaskInput | null = useMemo(() => {
    if (!content.trim() || content.trim().length < 3) return null;
    return parseTaskInput(content);
  }, [content]);

  // Check if we detected any smart parsing
  const hasSmartParsing = parsed && (parsed.due_date || parsed.priority || parsed.scheduled_time);

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
      // Mark onboarding step complete
      markStepComplete("brain_dump");
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
            className="fixed inset-0 modal-backdrop-heavy z-50 backdrop-blur-sm"
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
              "w-[calc(100%-32px)] sm:w-full max-w-lg p-4 sm:p-6 rounded-lg",
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
                placeholder="What's on your mind? Try: 'Call mom tomorrow high priority' or 'Finish report by Friday at 3pm'"
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

            {/* Smart Parsing Preview */}
            <AnimatePresence>
              {hasSmartParsing && parsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-3 rounded-lg bg-[var(--accent-highlight)]/5 border border-[var(--accent-highlight)]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={12} className="text-[var(--accent-highlight)]" />
                      <span className="text-xs font-medium text-[var(--accent-highlight)]">
                        Smart parsing detected
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {/* Parsed title */}
                      <p className="text-sm text-[var(--text-primary)]">
                        {parsed.title || "(no title)"}
                      </p>
                      {/* Parsed attributes */}
                      <div className="flex flex-wrap gap-2">
                        {parsed.due_date && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-xs text-[var(--text-secondary)]">
                            <Calendar size={10} />
                            {new Date(parsed.due_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {parsed.scheduled_time && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-card)] text-xs text-[var(--text-secondary)]">
                            <Clock size={10} />
                            {(() => {
                              const [hours, minutes] = parsed.scheduled_time.split(":").map(Number);
                              const period = hours >= 12 ? "PM" : "AM";
                              const displayHours = hours % 12 || 12;
                              return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
                            })()}
                          </span>
                        )}
                        {parsed.priority && (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                            parsed.priority === "high" && "bg-[var(--priority-high)]/10 text-[var(--priority-high)]",
                            parsed.priority === "medium" && "bg-[var(--priority-medium)]/10 text-[var(--priority-medium)]",
                            parsed.priority === "low" && "bg-[var(--priority-low)]/10 text-[var(--priority-low)]"
                          )}>
                            <Flag size={10} />
                            {parsed.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
