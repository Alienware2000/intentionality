"use client";

// =============================================================================
// PROACTIVE INSIGHT COMPONENT
// Toast-like notification for AI-generated proactive insights.
//
// Features:
// - Slides in from the bottom-right
// - Auto-dismisses after a timeout (or user can dismiss)
// - Can include an action button
// - Shows different icons/colors based on priority
//
// LEARNING: Non-Intrusive Notifications
// -------------------------------------
// Proactive features walk a fine line between helpful and annoying.
// Good practices:
// - Position away from main content (bottom-right)
// - Allow easy dismissal
// - Don't stack too many at once
// - Auto-dismiss low-priority items
// - Respect user's "do not disturb" preferences
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Lightbulb,
  AlertTriangle,
  Clock,
  Flame,
  PartyPopper,
  Heart,
  Target,
  Calendar,
  Play,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/app/lib/cn";
import { useFocus } from "./FocusProvider";
import type { AIInsight, AIInsightType } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

type InsightConfig = {
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const INSIGHT_CONFIGS: Record<AIInsightType, InsightConfig> = {
  optimal_focus_time: {
    icon: Clock,
    color: "text-[var(--accent-primary)]",
    bgColor: "bg-[var(--accent-primary)]/10",
  },
  workload_warning: {
    icon: AlertTriangle,
    color: "text-[var(--priority-high)]",
    bgColor: "bg-[var(--priority-high)]/10",
  },
  streak_risk: {
    icon: Flame,
    color: "text-[var(--accent-streak)]",
    bgColor: "bg-[var(--accent-streak)]/10",
  },
  break_reminder: {
    icon: Clock,
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
  },
  progress_celebration: {
    icon: PartyPopper,
    color: "text-[var(--accent-highlight)]",
    bgColor: "bg-[var(--accent-highlight)]/10",
  },
  habit_reminder: {
    icon: Heart,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  task_suggestion: {
    icon: Target,
    color: "text-[var(--accent-primary)]",
    bgColor: "bg-[var(--accent-primary)]/10",
  },
  planning_reminder: {
    icon: Calendar,
    color: "text-[var(--accent-highlight)]",
    bgColor: "bg-[var(--accent-highlight)]/10",
  },
};

const AUTO_DISMISS_DELAYS: Record<string, number> = {
  low: 8000,
  medium: 12000,
  high: 0, // Don't auto-dismiss high priority
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  insight: AIInsight;
  onDismiss: (insightId: string) => void;
  onAction?: (insight: AIInsight) => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ProactiveInsight({ insight, onDismiss, onAction }: Props) {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();
  const { startSession, mode: focusMode } = useFocus();

  const config = INSIGHT_CONFIGS[insight.insight_type] || INSIGHT_CONFIGS.task_suggestion;
  const Icon = config.icon;

  // Auto-dismiss after timeout (based on priority)
  useEffect(() => {
    const delay = AUTO_DISMISS_DELAYS[insight.priority];
    if (delay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(insight.id), 300); // Wait for exit animation
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [insight.id, insight.priority, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss(insight.id), 300);
  }, [insight.id, onDismiss]);

  const handleAction = useCallback(async () => {
    if (!insight.action_type) return;

    // Handle different action types
    switch (insight.action_type) {
      case 'NAVIGATE':
        const path = (insight.action_payload as { path?: string })?.path;
        if (path) {
          router.push(path);
        }
        break;

      case 'START_FOCUS':
        if (focusMode === 'idle') {
          const payload = insight.action_payload as { work_duration?: number; title?: string };
          await startSession({
            workDuration: payload?.work_duration || 25,
            breakDuration: 5,
            title: payload?.title,
          });
        }
        break;

      default:
        onAction?.(insight);
    }

    handleDismiss();
  }, [insight, router, focusMode, startSession, handleDismiss, onAction]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          className={cn(
            "w-80 p-4 rounded-xl shadow-lg",
            "bg-[var(--bg-card)] border border-[var(--border-default)]"
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg flex-shrink-0", config.bgColor)}>
              <Icon size={18} className={config.color} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {insight.title}
                </h4>
                <button
                  onClick={handleDismiss}
                  className="p-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <X size={14} className="text-[var(--text-muted)]" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {insight.description}
              </p>
            </div>
          </div>

          {/* Action Button */}
          {insight.action_type && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleAction}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                  "bg-[var(--accent-primary)] text-white",
                  "hover:bg-[var(--accent-primary)]/80 transition-colors"
                )}
              >
                {insight.action_type === 'START_FOCUS' && <Play size={12} />}
                {insight.action_type === 'NAVIGATE' && <ArrowRight size={12} />}
                {getActionLabel(insight.action_type)}
              </button>
            </div>
          )}

          {/* Progress bar for auto-dismiss */}
          {AUTO_DISMISS_DELAYS[insight.priority] > 0 && (
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: AUTO_DISMISS_DELAYS[insight.priority] / 1000, ease: "linear" }}
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]/30 origin-left rounded-b-xl"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Get human-readable label for action type.
 */
function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    START_FOCUS: 'Start Focus',
    NAVIGATE: 'View',
    CREATE_TASK: 'Create',
    COMPLETE_TASK: 'Complete',
  };
  return labels[actionType] || 'Action';
}

// -----------------------------------------------------------------------------
// Container Component
// Manages multiple insights
// -----------------------------------------------------------------------------

type ContainerProps = {
  insights: AIInsight[];
  onDismiss: (insightId: string) => void;
  onAction?: (insight: AIInsight) => void;
};

export function ProactiveInsightContainer({ insights, onDismiss, onAction }: ContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-3">
      <AnimatePresence mode="popLayout">
        {insights.slice(0, 3).map((insight) => (
          <ProactiveInsight
            key={insight.id}
            insight={insight}
            onDismiss={onDismiss}
            onAction={onAction}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
