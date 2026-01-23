"use client";

// =============================================================================
// AI ASSISTANT DEMO
// Interactive Kofi AI chat preview showing example conversations
// and demonstrating the AI's contextual awareness.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Bot, User } from "lucide-react";

const DEMO_CONVERSATIONS = [
  {
    id: 1,
    trigger: "What should I focus on?",
    messages: [
      { role: "user" as const, content: "What should I focus on today?" },
      {
        role: "assistant" as const,
        content:
          "Based on your schedule and priorities, I'd suggest starting with your CS assignment—it's high priority and due tomorrow. After that, you have a 2-hour focus block at 2 PM that would be perfect for the research paper outline.",
      },
    ],
  },
  {
    id: 2,
    trigger: "Help me plan",
    messages: [
      { role: "user" as const, content: "Help me plan my study session" },
      {
        role: "assistant" as const,
        content:
          "Let's break this down. You have 3 hours available. I suggest: 25 min on flashcards (warm-up), 50 min on problem set (deep work), 10 min break, then 50 min on reading. Want me to set up focus timers for each block?",
      },
    ],
  },
  {
    id: 3,
    trigger: "I'm overwhelmed",
    messages: [
      { role: "user" as const, content: "I'm feeling overwhelmed right now" },
      {
        role: "assistant" as const,
        content:
          "I hear you. Looking at your list, let's simplify: pick ONE thing that would make tomorrow easier if done today. Everything else can wait. What's that one thing for you?",
      },
    ],
  },
];

export default function AIAssistantDemo() {
  const [activeConversation, setActiveConversation] = useState<number | null>(
    null
  );
  const [isTyping, setIsTyping] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const handleTrigger = async (conversationId: number) => {
    const conversation = DEMO_CONVERSATIONS.find((c) => c.id === conversationId);
    if (!conversation) return;

    setActiveConversation(conversationId);
    setVisibleMessages([]);

    // Show user message
    setVisibleMessages([conversation.messages[0]]);

    // Simulate typing delay
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsTyping(false);

    // Show assistant response
    setVisibleMessages(conversation.messages);
  };

  const resetDemo = () => {
    setActiveConversation(null);
    setVisibleMessages([]);
  };

  return (
    <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)]/60 flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Kofi</p>
          <p className="text-xs text-[var(--text-muted)]">AI Study Assistant</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="min-h-[200px] mb-4">
        {activeConversation === null ? (
          <div className="text-center py-8">
            <Bot size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              Click a prompt below to see Kofi in action
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {visibleMessages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex-shrink-0 flex items-center justify-center">
                      <Sparkles
                        size={14}
                        className="text-[var(--accent-primary)]"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.role === "user"
                        ? "bg-[var(--accent-primary)] text-white rounded-br-none"
                        : "bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-bl-none"
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-hover)] flex-shrink-0 flex items-center justify-center">
                      <User size={14} className="text-[var(--text-muted)]" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex-shrink-0 flex items-center justify-center">
                  <Sparkles size={14} className="text-[var(--accent-primary)]" />
                </div>
                <div className="px-4 py-3 rounded-lg bg-[var(--bg-hover)] rounded-bl-none">
                  <div className="flex gap-1">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 rounded-full bg-[var(--text-muted)]"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 rounded-full bg-[var(--text-muted)]"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 rounded-full bg-[var(--text-muted)]"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Quick prompts */}
      <div className="space-y-2">
        {activeConversation !== null ? (
          <button
            onClick={resetDemo}
            className="w-full py-2 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition-colors"
          >
            Try another prompt
          </button>
        ) : (
          <p className="text-xs text-[var(--text-muted)] mb-2">Try asking:</p>
        )}
        {activeConversation === null && (
          <div className="flex flex-wrap gap-2">
            {DEMO_CONVERSATIONS.map((conv) => (
              <motion.button
                key={conv.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTrigger(conv.id)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)]/80 text-[var(--text-primary)] rounded-lg border border-[var(--border-subtle)] transition-colors"
              >
                <Send size={12} className="text-[var(--text-muted)]" />
                {conv.trigger}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
