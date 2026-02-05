"use client";

// =============================================================================
// UPGRADE MODAL COMPONENT
// "Coming Soon" modal with premium feature preview and email waitlist.
// Displays feature comparison between Free and Pro tiers.
// Collects email signups for premium launch notification.
//
// Design: Bottom-positioned on mobile (like BrainDumpModal), centered on desktop.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  X,
  Check,
  Minus,
  Sparkles,
  Mic,
  Bot,
  Loader2,
  Mail,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { fetchApi, getErrorMessage } from "@/app/lib/api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill email if user is logged in */
  userEmail?: string;
  /** Source tracking for analytics */
  source?: string;
};

type FeatureInterest = {
  id: string;
  label: string;
  description: string;
};

// -----------------------------------------------------------------------------
// Feature Data
// -----------------------------------------------------------------------------

const FEATURE_INTERESTS: FeatureInterest[] = [
  {
    id: "unlimited_chat",
    label: "Unlimited AI Chat",
    description: "No daily message limits",
  },
  {
    id: "better_models",
    label: "Premium AI Models",
    description: "Claude, GPT-4, and more",
  },
  {
    id: "voice_assistant",
    label: "Voice Assistant",
    description: "Talk to Kofi hands-free",
  },
  {
    id: "agentic_actions",
    label: "Agentic Actions",
    description: "Let AI manage your tasks automatically",
  },
];

const COMPARISON_ROWS = [
  { feature: "AI Chat", free: "50/day", pro: "Unlimited" },
  { feature: "Brain Dump AI", free: "20/day", pro: "Unlimited" },
  { feature: "Daily Briefing", free: "5/day", pro: "Unlimited" },
  { feature: "AI Models", free: "Standard", pro: "Premium" },
  { feature: "Voice Assistant", free: false, pro: "Coming Soon" },
  { feature: "Agentic Actions", free: false, pro: "Coming Soon" },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function UpgradeModal({
  isOpen,
  onClose,
  userEmail = "",
  source = "upgrade_modal",
}: Props) {
  const [email, setEmail] = useState(userEmail);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Toggle feature interest selection
  function toggleFeature(featureId: string) {
    setSelectedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await fetchApi("/api/premium/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          features_interested: Array.from(selectedFeatures),
          source,
        }),
      });

      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle escape key
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  // Reset state when modal closes
  function handleClose() {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setEmail(userEmail);
      setSelectedFeatures(new Set());
      setError(null);
      setSuccess(false);
    }, 200);
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
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onKeyDown={handleKeyDown}
            className={cn(
              "fixed z-50",
              // Bottom on mobile, centered on desktop
              "bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "w-full sm:max-w-md",
              "rounded-t-2xl sm:rounded-xl",
              "bg-[var(--bg-card)] glass-card",
              "border border-[var(--border-default)]",
              "shadow-2xl shadow-black/50",
              "max-h-[85vh] overflow-y-auto custom-scrollbar"
            )}
          >
            {success ? (
              // Success State
              <div className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-success)]/20 flex items-center justify-center"
                >
                  <PartyPopper size={32} className="text-[var(--accent-success)]" />
                </motion.div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  You&apos;re on the list!
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  We&apos;ll notify you at <strong className="text-[var(--text-secondary)]">{email}</strong> when
                  premium features launch.
                </p>
                <button
                  onClick={handleClose}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-medium",
                    "min-h-[44px]",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:bg-[var(--accent-primary)]/90",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "active:scale-[0.98] transition-all duration-100",
                    "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                  )}
                >
                  Got it!
                </button>
              </div>
            ) : (
              // Main Content
              <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[var(--accent-highlight)]/20">
                      <Crown size={24} className="text-[var(--accent-highlight)]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        Unlock Premium
                      </h2>
                      <p className="text-xs text-[var(--text-muted)]">
                        Coming soon
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className={cn(
                      "p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors",
                      "min-h-[44px] min-w-[44px] flex items-center justify-center",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                    )}
                  >
                    <X size={18} className="text-[var(--text-muted)]" />
                  </button>
                </div>

                {/* Feature Comparison */}
                <div className="mb-6">
                  <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Free vs Pro
                  </h3>
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                    {/* Header row */}
                    <div className="grid grid-cols-3 bg-[var(--bg-elevated)]">
                      <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)]">
                        Feature
                      </div>
                      <div className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] text-center">
                        Free
                      </div>
                      <div className="px-3 py-2 text-xs font-medium text-[var(--accent-highlight)] text-center">
                        Pro
                      </div>
                    </div>
                    {/* Data rows */}
                    {COMPARISON_ROWS.map((row, index) => (
                      <div
                        key={row.feature}
                        className={cn(
                          "grid grid-cols-3 border-t border-[var(--border-subtle)]",
                          index % 2 === 0 ? "bg-transparent" : "bg-[var(--bg-card)]/50"
                        )}
                      >
                        <div className="px-3 py-2.5 text-sm text-[var(--text-primary)]">
                          {row.feature}
                        </div>
                        <div className="px-3 py-2.5 text-center">
                          {typeof row.free === "boolean" ? (
                            row.free ? (
                              <Check size={16} className="mx-auto text-[var(--accent-success)]" />
                            ) : (
                              <Minus size={16} className="mx-auto text-[var(--text-muted)]" />
                            )
                          ) : (
                            <span className="text-sm text-[var(--text-muted)]">{row.free}</span>
                          )}
                        </div>
                        <div className="px-3 py-2.5 text-center">
                          {typeof row.pro === "boolean" ? (
                            row.pro ? (
                              <Check size={16} className="mx-auto text-[var(--accent-success)]" />
                            ) : (
                              <Minus size={16} className="mx-auto text-[var(--text-muted)]" />
                            )
                          ) : (
                            <span className="text-sm text-[var(--accent-highlight)] font-medium">
                              {row.pro}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coming Soon Features */}
                <div className="mb-6">
                  <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Coming Soon
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                      <Mic size={18} className="text-[var(--accent-highlight)] mb-2" />
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Voice Assistant
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Talk to Kofi hands-free
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                      <Bot size={18} className="text-[var(--accent-highlight)] mb-2" />
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Agentic Actions
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Let AI manage tasks
                      </p>
                    </div>
                  </div>
                </div>

                {/* Waitlist Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                      Get notified when it launches
                    </h3>

                    {/* Feature interest checkboxes */}
                    <div className="space-y-2 mb-4">
                      {FEATURE_INTERESTS.map((feature) => (
                        <label
                          key={feature.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                            "border transition-colors",
                            selectedFeatures.has(feature.id)
                              ? "border-[var(--accent-highlight)]/40 bg-[var(--accent-highlight)]/5"
                              : "border-[var(--border-subtle)] hover:border-[var(--border-default)]"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFeatures.has(feature.id)}
                            onChange={() => toggleFeature(feature.id)}
                            className="sr-only"
                          />
                          <div
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                              "transition-colors",
                              selectedFeatures.has(feature.id)
                                ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]"
                                : "border-[var(--border-default)]"
                            )}
                          >
                            {selectedFeatures.has(feature.id) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {feature.label}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {feature.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Email input */}
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className={cn(
                          "w-full pl-10 pr-4 py-3 rounded-xl",
                          "min-h-[44px]",
                          "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                          "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                          "focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/10",
                          "transition-all duration-200"
                        )}
                      />
                    </div>
                  </div>

                  {/* Error message */}
                  {error && (
                    <p className="mb-4 text-sm text-[var(--priority-high)]">{error}</p>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium",
                      "min-h-[44px]",
                      "bg-gradient-to-r from-[var(--accent-highlight)] to-amber-500 text-white",
                      "hover:opacity-90",
                      "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                      "active:scale-[0.98] transition-all duration-100",
                      "focus-visible:outline-2 focus-visible:outline-[var(--accent-highlight)]",
                      "disabled:opacity-60 disabled:cursor-not-allowed"
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Join Waitlist
                      </>
                    )}
                  </button>

                  <p className="mt-3 text-xs text-[var(--text-muted)] text-center">
                    No spam, just a heads up when we launch.
                  </p>
                </form>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
