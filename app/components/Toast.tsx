"use client";

// =============================================================================
// TOAST COMPONENT
// Simple toast notification with optional action button (e.g., Undo).
// Auto-dismisses after a timeout.
// =============================================================================

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/app/lib/cn";

type ToastType = "default" | "success" | "error";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
};

type ToastContextType = {
  showToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 w-full max-w-sm px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
        "bg-[var(--bg-card)] border border-[var(--border-default)]",
        toast.type === "success" && "border-[var(--accent-success)]/30",
        toast.type === "error" && "border-[var(--accent-primary)]/30"
      )}
    >
      <span className="flex-1 text-sm text-[var(--text-primary)]">
        {toast.message}
      </span>

      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className={cn(
            "px-3 py-1 text-sm font-medium rounded",
            "bg-[var(--accent-primary)] text-white",
            "hover:bg-[var(--accent-primary)]/80 transition-colors"
          )}
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
