"use client";

// =============================================================================
// CONFIRM MODAL COMPONENT
// Reusable confirmation dialog for destructive actions.
// anime.js inspired: dark backdrop, dramatic contrast.
// =============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/app/lib/cn";

type Props = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 modal-backdrop z-50"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              // Bottom-positioned on mobile to avoid keyboard, centered on desktop
              "fixed z-50",
              "bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "w-full sm:w-full max-w-md p-4 sm:p-6",
              "rounded-t-xl sm:rounded-xl",
              "bg-[var(--bg-card)] glass-card border border-[var(--border-default)]",
              "max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            )}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className={cn(
                "absolute top-3 right-3 p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-all hover:rotate-[15deg]",
                "min-h-[44px] min-w-[44px] flex items-center justify-center",
                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
              )}
            >
              <X size={18} className="text-[var(--text-muted)]" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--accent-primary)]/10">
                <AlertTriangle size={24} className="text-[var(--accent-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className={cn(
                  "px-4 py-3 text-sm font-medium rounded min-h-[44px]",
                  "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
                  "hover:bg-[var(--bg-elevated)] transition-colors",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "active:scale-[0.98]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                )}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "px-4 py-3 text-sm font-medium rounded min-h-[44px]",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "active:scale-[0.98]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
