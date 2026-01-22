"use client";

// =============================================================================
// CHAT MESSAGE COMPONENT
// Renders individual chat messages in the AI chat panel.
//
// Features:
// - Distinct styling for user vs assistant messages
// - Action buttons for AI-suggested actions
// - Streaming indicator for messages being generated
// - Markdown-like formatting support
//
// LEARNING: Component Design for Chat UIs
// ---------------------------------------
// Chat messages need to:
// 1. Be visually distinct by sender (user vs AI)
// 2. Show loading/streaming state clearly
// 3. Support rich content (actions, code, etc.)
// 4. Be accessible (proper ARIA labels)
// =============================================================================

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Bot,
  Loader2,
  CheckCircle,
  PlusCircle,
  Play,
  Heart,
  Target,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import type { AIAction, AIActionType } from "@/app/lib/types";
import { formatActionForDisplay } from "@/app/lib/ai-actions";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type Props = {
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  isStreaming?: boolean;
  onExecuteAction?: (action: AIAction) => Promise<void>;
};

// -----------------------------------------------------------------------------
// Action Icon Mapping
// -----------------------------------------------------------------------------

const ACTION_ICONS: Record<AIActionType, typeof CheckCircle> = {
  CREATE_TASK: PlusCircle,
  UPDATE_TASK: CheckCircle,
  COMPLETE_TASK: Check,
  DELETE_TASK: CheckCircle,
  START_FOCUS: Play,
  CREATE_HABIT: Heart,
  CREATE_QUEST: Target,
  NAVIGATE: ArrowRight,
  OPEN_MODAL: ArrowRight,
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ChatMessage({
  role,
  content,
  actions = [],
  isStreaming = false,
  onExecuteAction,
}: Props) {
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [executedActions, setExecutedActions] = useState<Set<string>>(new Set());

  const isUser = role === "user";

  /**
   * Handle action button click.
   */
  async function handleActionClick(action: AIAction, index: number) {
    if (!onExecuteAction) return;

    const actionKey = `${action.type}-${index}`;
    if (executedActions.has(actionKey)) return;

    setExecutingAction(actionKey);

    try {
      await onExecuteAction(action);
      setExecutedActions((prev) => new Set(prev).add(actionKey));
    } catch (error) {
      console.error("Action execution failed:", error);
    } finally {
      setExecutingAction(null);
    }
  }

  /**
   * Format content with basic markdown-like styling.
   * Handles code blocks, bold, italic, and line breaks.
   */
  function formatContent(text: string): React.ReactNode {
    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      // Code block
      if (part.startsWith("```")) {
        const codeContent = part.slice(3, -3);
        const lines = codeContent.split("\n");
        const language = lines[0]?.trim() || "";
        const code = language ? lines.slice(1).join("\n") : codeContent;

        return (
          <pre
            key={i}
            className="my-2 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-x-auto text-xs font-mono"
          >
            <code>{code}</code>
          </pre>
        );
      }

      // Regular text - handle inline formatting
      return (
        <span key={i}>
          {part.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {formatInline(line)}
            </span>
          ))}
        </span>
      );
    });
  }

  /**
   * Format inline elements (bold, italic, inline code).
   */
  function formatInline(text: string): React.ReactNode {
    // Simple inline code
    const parts = text.split(/(`[^`]+`)/g);

    return parts.map((part, i) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--accent-primary)] text-xs font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-[var(--accent-primary)]/20"
            : "bg-[var(--accent-highlight)]/20"
        )}
      >
        {isUser ? (
          <User size={16} className="text-[var(--accent-primary)]" />
        ) : (
          <Bot size={16} className="text-[var(--accent-highlight)]" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex-1 min-w-0 max-w-[85%]",
          isUser && "text-right"
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "inline-block px-4 py-3 rounded-2xl text-sm",
            isUser
              ? "bg-[var(--accent-primary)] text-white rounded-tr-sm"
              : "bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm"
          )}
        >
          {content ? (
            <div className="whitespace-pre-wrap break-words">
              {formatContent(content)}
            </div>
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : null}

          {/* Streaming cursor */}
          {isStreaming && content && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--text-muted)] animate-pulse" />
          )}
        </div>

        {/* Action Buttons */}
        {actions.length > 0 && !isStreaming && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action, index) => {
              const Icon = ACTION_ICONS[action.type] || CheckCircle;
              const actionKey = `${action.type}-${index}`;
              const isExecuting = executingAction === actionKey;
              const isExecuted = executedActions.has(actionKey);

              return (
                <button
                  key={actionKey}
                  onClick={() => handleActionClick(action, index)}
                  disabled={isExecuting || isExecuted}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "transition-colors",
                    isExecuted
                      ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)] cursor-default"
                      : "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                    !isExecuted && "hover:bg-[var(--bg-hover)] hover:border-[var(--accent-primary)]",
                    isExecuting && "opacity-50"
                  )}
                >
                  {isExecuting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : isExecuted ? (
                    <Check size={12} />
                  ) : (
                    <Icon size={12} />
                  )}
                  <span>
                    {isExecuted ? "Done" : formatActionForDisplay(action)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
