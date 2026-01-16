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
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
              "w-full max-w-md p-4 sm:p-6 rounded-lg mx-4 sm:mx-0",
              "bg-[var(--bg-card)] border border-[var(--border-default)]",
              "max-h-[90vh] overflow-y-auto"
            )}
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
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
                  "px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
                  "hover:bg-[var(--bg-elevated)] transition-colors"
                )}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors"
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
