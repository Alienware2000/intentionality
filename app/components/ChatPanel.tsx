"use client";

// =============================================================================
// CHAT PANEL COMPONENT
// Slide-out panel for the AI assistant chat interface.
//
// Features:
// - Slides in from the right side
// - Message history with auto-scroll
// - Input field with send button
// - Conversation management (new, history, delete)
// - Keyboard shortcuts (Enter to send, Escape to close)
//
// LEARNING: Slide Panel UX Pattern
// --------------------------------
// Slide panels are good for secondary interfaces because they:
// - Don't cover the main content completely
// - Can be quickly opened/closed
// - Maintain user's context with the main app
// - Work well on both desktop and mobile
// =============================================================================

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Plus,
  History,
  Trash2,
  ChevronLeft,
  Sparkles,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useAI } from "./AIProvider";
import ChatMessage from "./ChatMessage";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ChatPanel() {
  const {
    isOpen,
    closeChat,
    messages,
    sendMessage,
    startNewConversation,
    conversations,
    loadConversation,
    deleteConversation,
    currentConversationId,
    executeAction,
    isLoading,
    error,
  } = useAI();

  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !showHistory) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, showHistory]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        if (showHistory) {
          setShowHistory(false);
        } else {
          closeChat();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showHistory, closeChat]);

  /**
   * Handle form submission.
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput("");
    await sendMessage(message);
  }

  /**
   * Handle Enter key in textarea.
   * Enter sends, Shift+Enter adds newline.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  /**
   * Auto-resize textarea as content grows.
   */
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = "auto";
    // Set height to scrollHeight, max 120px
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  /**
   * Handle deleting a single conversation with confirmation.
   */
  function handleDeleteConversation(e: React.MouseEvent, conversationId: string) {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      deleteConversation(conversationId);
    }
  }

  /**
   * Handle clearing all conversations with confirmation.
   */
  function handleClearAll() {
    if (confirm(`Delete all ${conversations.length} conversations?`)) {
      conversations.forEach(c => deleteConversation(c.id));
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
            onClick={closeChat}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-0 right-0 h-full z-50",
              "w-full sm:w-[400px]",
              "bg-[var(--bg-base)] border-l border-[var(--border-subtle)]",
              "flex flex-col shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                {showHistory ? (
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <ChevronLeft size={18} className="text-[var(--text-muted)]" />
                  </button>
                ) : null}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-primary)]/20">
                    <Sparkles size={18} className="text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[var(--text-primary)] text-sm">
                      {showHistory ? "Conversations" : "Kofi"}
                    </h2>
                    {!showHistory && (
                      <p className="text-xs text-[var(--text-muted)]">
                        AI Assistant
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!showHistory && (
                  <>
                    <button
                      onClick={() => setShowHistory(true)}
                      className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                      title="Conversation history"
                    >
                      <History size={18} className="text-[var(--text-muted)]" />
                    </button>
                    <button
                      onClick={startNewConversation}
                      className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                      title="New conversation"
                    >
                      <Plus size={18} className="text-[var(--text-muted)]" />
                    </button>
                  </>
                )}
                <button
                  onClick={closeChat}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                  title="Close (Esc)"
                >
                  <X size={18} className="text-[var(--text-muted)]" />
                </button>
              </div>
            </div>

            {/* Content */}
            {showHistory ? (
              // Conversation History View
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {/* Clear all button */}
                {conversations.length > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                )}
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Start chatting to create one!</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                        "hover:bg-[var(--bg-hover)] transition-colors",
                        conv.id === currentConversationId && "bg-[var(--bg-card)]"
                      )}
                      onClick={() => {
                        loadConversation(conv.id);
                        setShowHistory(false);
                      }}
                    >
                      <MessageSquare size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">
                          {conv.title || "New conversation"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(conv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-elevated)] hover:text-red-400 transition-all"
                        title="Delete conversation"
                      >
                        <Trash2 size={14} className="text-[var(--text-muted)] group-hover:text-inherit" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Chat View
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                        <Sparkles size={32} className="text-[var(--accent-primary)]" />
                      </div>
                      <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                        Hi, I&apos;m Kofi!
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] max-w-[250px] mx-auto">
                        Your personal productivity assistant. Ask me anything about your tasks, schedule, or goals!
                      </p>
                      <div className="mt-6 space-y-2">
                        <p className="text-xs text-[var(--text-muted)]">Try asking:</p>
                        {[
                          "What do I have to do today?",
                          "Create a task to call mom tomorrow",
                          "Start a 25 minute focus session",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setInput(suggestion);
                              inputRef.current?.focus();
                            }}
                            className={cn(
                              "block w-full text-left px-3 py-2 rounded-lg text-sm",
                              "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
                              "hover:border-[var(--accent-primary)] transition-colors"
                            )}
                          >
                            &ldquo;{suggestion}&rdquo;
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        actions={msg.actions}
                        isStreaming={msg.isStreaming}
                        onExecuteAction={executeAction}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mx-4 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border-subtle)]">
                  <div className="flex items-end gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl focus-within:border-[var(--accent-primary)] transition-colors">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask Kofi anything..."
                      rows={1}
                      className={cn(
                        "flex-1 px-4 py-3 bg-transparent resize-none",
                        "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                        "focus:outline-none text-sm custom-scrollbar",
                        "min-h-[44px] max-h-[120px]"
                      )}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className={cn(
                        "flex-shrink-0 m-2 p-2 rounded-lg transition-colors",
                        input.trim() && !isLoading
                          ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
                          : "bg-transparent text-[var(--text-muted)] cursor-not-allowed"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
