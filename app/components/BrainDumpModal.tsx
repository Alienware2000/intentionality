"use client";

// =============================================================================
// BRAIN DUMP MODAL COMPONENT
// Quick capture modal for thoughts and ideas.
// Triggered via Ctrl+K / Cmd+K keyboard shortcut.
// anime.js inspired: minimal dark theme with dramatic focus.
// Now includes NLP parsing preview for smart task creation.
//
// AI ENHANCEMENT:
// Added "Process with AI" button that sends content to AI for intelligent
// parsing into tasks, habits, and quests. Shows suggestions that users can
// selectively create.
// =============================================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap, Calendar, Flag, Clock, Sparkles, Bot, Loader2, Check, Plus, Target, Heart } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { parseTaskInput } from "@/app/lib/nlp-parser";
import { useOnboarding } from "./OnboardingProvider";
import { useFreemium } from "./FreemiumProvider";
import UsageIndicator from "./UsageIndicator";
import PremiumBadge from "./PremiumBadge";
import type { BrainDumpEntry, ParsedTaskInput, AIProcessBrainDumpResponse, Priority } from "@/app/lib/types";

// Type for AI suggestions
type AISuggestion = {
  type: 'task' | 'quest' | 'habit';
  title: string;
  due_date?: string;
  priority?: Priority;
  quest_suggestion?: string;
};

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
  const { usage, openUpgradeModal, openLimitReachedModal, refreshUsage } = useFreemium();

  // AI processing state
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [creatingItems, setCreatingItems] = useState<Set<number>>(new Set());
  const [createdItems, setCreatedItems] = useState<Set<number>>(new Set());
  const [showAiResults, setShowAiResults] = useState(false);

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
      setAiProcessing(false);
      setAiSuggestions([]);
      setAiNotes(null);
      setCreatingItems(new Set());
      setCreatedItems(new Set());
      setShowAiResults(false);
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

  // Process content with AI
  async function handleAiProcess() {
    if (!content.trim()) return;

    setAiProcessing(true);
    setError(null);
    setAiSuggestions([]);
    setAiNotes(null);
    setCreatedItems(new Set());

    try {
      const result = await fetchApi<AIProcessBrainDumpResponse>(
        "/api/ai/process",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        }
      );

      setAiSuggestions(result.suggestions || []);
      setAiNotes(result.notes || null);
      setShowAiResults(true);
      // Refresh usage after successful AI process
      refreshUsage();
    } catch (e) {
      const errorMsg = getErrorMessage(e);
      // Check for rate limit error (429 status returns this message from backend)
      if (errorMsg.includes("daily") && errorMsg.toLowerCase().includes("limit")) {
        openLimitReachedModal("brain_dump");
      } else {
        setError(errorMsg);
      }
    } finally {
      setAiProcessing(false);
    }
  }

  // Create a single suggestion as a task/habit/quest
  async function handleCreateSuggestion(suggestion: AISuggestion, index: number) {
    if (creatingItems.has(index) || createdItems.has(index)) return;

    setCreatingItems(prev => new Set(prev).add(index));
    setError(null);

    try {
      if (suggestion.type === 'task') {
        // Create task - need to get or create a quest first
        // Use default "Personal" quest
        const questsRes = await fetchApi<{ ok: true; quests: Array<{ id: string; title: string }> }>(
          "/api/quests"
        );
        let questId = questsRes.quests?.find(q => q.title === "Personal")?.id;

        if (!questId && questsRes.quests?.[0]) {
          questId = questsRes.quests[0].id;
        }

        if (!questId) {
          // Create Personal quest
          const newQuest = await fetchApi<{ ok: true; quest: { id: string } }>(
            "/api/quests",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "Personal" }),
            }
          );
          questId = newQuest.quest.id;
        }

        await fetchApi("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: suggestion.title,
            quest_id: questId,
            due_date: suggestion.due_date || new Date().toISOString().split("T")[0],
            priority: suggestion.priority || "medium",
          }),
        });
      } else if (suggestion.type === 'habit') {
        await fetchApi("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: suggestion.title,
            priority: suggestion.priority || "medium",
          }),
        });
      } else if (suggestion.type === 'quest') {
        await fetchApi("/api/quests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: suggestion.title,
          }),
        });
      }

      setCreatedItems(prev => new Set(prev).add(index));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setCreatingItems(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  // Create all suggestions at once
  async function handleCreateAll() {
    for (let i = 0; i < aiSuggestions.length; i++) {
      if (!createdItems.has(i)) {
        await handleCreateSuggestion(aiSuggestions[i], i);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (showAiResults) {
        setShowAiResults(false);
      } else {
        onClose();
      }
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              // Bottom-positioned on mobile to avoid keyboard, top-positioned on desktop
              "fixed z-50",
              "bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-[15%] sm:-translate-x-1/2",
              "w-full sm:w-full max-w-lg p-4 sm:p-6",
              "rounded-t-2xl sm:rounded-xl",
              "glass-card-premium",
              "shadow-2xl shadow-black/50",
              "max-h-[80vh] sm:max-h-[85vh] overflow-y-auto"
            )}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-2.5 rounded-xl bg-[var(--accent-primary)]/10 glow-primary"
                >
                  <Brain size={20} className="text-[var(--accent-primary)]" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                      Brain Dump
                    </h2>
                    <PremiumBadge variant="chip" size="sm" onClick={() => openUpgradeModal("brain_dump_badge")} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Capture your thoughts
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close dialog"
                className={cn(
                  "p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors",
                  "min-h-[44px] min-w-[44px] flex items-center justify-center",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                )}
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </motion.button>
            </div>

            {/* Textarea */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative"
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind? Try: 'Call mom tomorrow high priority' or 'Finish report by Friday at 3pm'"
                rows={5}
                className={cn(
                  "w-full px-4 py-3 rounded-xl resize-none min-h-[120px]",
                  "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                  "focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/10",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
                  "transition-all duration-200"
                )}
              />
            </motion.div>

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

            {/* AI Suggestions Results */}
            <AnimatePresence>
              {showAiResults && aiSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-3 rounded-lg bg-[var(--accent-highlight)]/5 border border-[var(--accent-highlight)]/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bot size={14} className="text-[var(--accent-highlight)]" />
                        <span className="text-xs font-medium text-[var(--accent-highlight)]">
                          AI Suggestions ({aiSuggestions.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCreateAll}
                          disabled={createdItems.size === aiSuggestions.length}
                          className={cn(
                            "text-xs px-2 py-1 rounded",
                            "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
                            "hover:bg-[var(--accent-primary)]/20 transition-colors",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          Create All
                        </button>
                        <button
                          onClick={() => setShowAiResults(false)}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                        >
                          Hide
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {aiSuggestions.map((suggestion, index) => {
                        const isCreating = creatingItems.has(index);
                        const isCreated = createdItems.has(index);
                        const TypeIcon = suggestion.type === 'task' ? Plus
                          : suggestion.type === 'habit' ? Heart
                          : Target;

                        return (
                          <div
                            key={index}
                            className={cn(
                              "flex items-start gap-3 p-2 rounded-lg",
                              "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                              isCreated && "opacity-60"
                            )}
                          >
                            <div className={cn(
                              "p-1.5 rounded-lg flex-shrink-0 mt-0.5",
                              suggestion.type === 'task' && "bg-[var(--accent-primary)]/10",
                              suggestion.type === 'habit' && "bg-pink-500/10",
                              suggestion.type === 'quest' && "bg-[var(--accent-success)]/10"
                            )}>
                              <TypeIcon size={12} className={cn(
                                suggestion.type === 'task' && "text-[var(--accent-primary)]",
                                suggestion.type === 'habit' && "text-pink-500",
                                suggestion.type === 'quest' && "text-[var(--accent-success)]"
                              )} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--text-primary)]">
                                {suggestion.title}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                                  {suggestion.type}
                                </span>
                                {suggestion.due_date && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] flex items-center gap-1">
                                    <Calendar size={8} />
                                    {new Date(suggestion.due_date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                )}
                                {suggestion.priority && (
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                                    suggestion.priority === "high" && "bg-[var(--priority-high)]/10 text-[var(--priority-high)]",
                                    suggestion.priority === "medium" && "bg-[var(--priority-medium)]/10 text-[var(--priority-medium)]",
                                    suggestion.priority === "low" && "bg-[var(--priority-low)]/10 text-[var(--priority-low)]"
                                  )}>
                                    <Flag size={8} />
                                    {suggestion.priority}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleCreateSuggestion(suggestion, index)}
                              disabled={isCreating || isCreated}
                              className={cn(
                                "p-2.5 rounded-lg transition-colors flex-shrink-0",
                                "min-h-[44px] min-w-[44px] flex items-center justify-center",
                                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
                                isCreated
                                  ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                                  : "hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-[0.95]",
                                "disabled:cursor-not-allowed"
                              )}
                            >
                              {isCreating ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : isCreated ? (
                                <Check size={14} />
                              ) : (
                                <Plus size={14} />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {aiNotes && (
                      <p className="mt-2 text-xs text-[var(--text-muted)] italic">
                        {aiNotes}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            {error && (
              <p className="mt-2 text-sm text-[var(--priority-high)]">{error}</p>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex items-center justify-between gap-2"
            >
              {/* Keyboard shortcut hint - only show on desktop */}
              <p className="hidden md:block text-xs text-[var(--text-muted)] flex-shrink-0">
                <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono text-[10px] border border-[var(--border-subtle)]">
                  {typeof window !== "undefined" && navigator.platform.includes("Mac")
                    ? "Cmd"
                    : "Ctrl"}
                </kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--bg-hover)] text-[var(--text-secondary)] font-mono text-[10px] border border-[var(--border-subtle)]">
                  Enter
                </kbd>
              </p>
              {/* Spacer for mobile */}
              <div className="flex-1 md:hidden" />

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* AI Process Button with Usage Indicator */}
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={handleAiProcess}
                    disabled={aiProcessing || !content.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl min-h-[44px]",
                      "bg-[var(--accent-highlight)]/10 text-[var(--accent-highlight)] border border-[var(--accent-highlight)]/20",
                      "hover:bg-[var(--accent-highlight)]/20 transition-all duration-200",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--accent-highlight)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {aiProcessing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Bot size={14} />
                    )}
                    <span className="hidden sm:inline">
                      {aiProcessing ? "Processing..." : "AI Process"}
                    </span>
                  </motion.button>
                  {/* Usage indicator - always show with subtle styling when low */}
                  <UsageIndicator
                    feature="brain_dump"
                    usage={usage?.brain_dump || null}
                    compact
                    alwaysShow
                    onClick={() => openUpgradeModal("brain_dump_usage")}
                  />
                </div>

                {/* Capture Button */}
                <motion.button
                  onClick={handleCapture}
                  disabled={saving || !content.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl min-h-[44px]",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:bg-[var(--accent-primary)]/90",
                    "glow-primary transition-all duration-200",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:glow-none"
                  )}
                >
                  <Zap size={14} />
                  {saving ? "Saving..." : "Capture"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
