"use client";

// =============================================================================
// AI ASSISTANT DEMO
// Refined human-facing Kofi AI chat preview.
// Uses sharp borders, technical monospace accents, and brand-consistent colors.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, User, MessageSquare } from "lucide-react";

const DEMO_CONVERSATIONS = [
  {
    id: 1,
    trigger: "What should I focus on?",
    messages: [
      { role: "user" as const, content: "What should I focus on today?" },
      {
        role: "assistant" as const,
        content:
          "Based on your priorities, start with your History chapters—it's high priority and due by evening. You have a prime focus window at 2 PM for the Ethics Essay.",
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
          "You have 3 hours available. Suggestion: 25m on flashcards (warm-up), 50m on problem set (deep work), 10m break, then 50m on reading. Set timers?",
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
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsTyping(false);

    // Show assistant response
    setVisibleMessages(conversation.messages);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-[var(--bg-base)] rounded-xl border border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl">
      {/* Header - Human Facing */}
      <div className="bg-[var(--bg-elevated)] p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--accent-primary)]/10 flex items-center justify-center border border-[var(--accent-primary)]/20">
            <Sparkles size={12} className="text-[var(--accent-primary)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)] tracking-tight">Kofi AI Assistant</span>
        </div>
        <div className="flex gap-1.5 items-center">
           <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)] animate-pulse" />
           <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ready to help</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="h-[240px] p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
        {activeConversation === null ? (
          <div className="h-full flex flex-col items-center justify-start py-4">
            <div className="flex gap-3 w-full">
              <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border bg-[var(--accent-primary)] text-white shadow-sm">
                <Sparkles size={14} />
              </div>
              <div className="p-3.5 rounded-2xl text-[13.5px] leading-relaxed bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm">
                Hi! I&apos;m Kofi, your study assistant. I can help you plan your day, stay focused, or figure out what to tackle next. How can I help you right now?
              </div>
            </div>
            <div className="mt-auto opacity-50 text-center w-full">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Select a prompt below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence mode="popLayout">
              {visibleMessages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${
                    message.role === "assistant" 
                      ? "bg-[var(--accent-primary)] text-white shadow-sm" 
                      : "bg-[var(--bg-hover)] border-[var(--border-default)] text-[var(--text-secondary)]"
                  }`}>
                    {message.role === "assistant" ? <Sparkles size={14} /> : <User size={14} />}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      : "bg-[var(--bg-card)] border border-[var(--border-accent)] text-[var(--text-primary)]"
                  }`}>
                    {message.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-sm">
                  <Sparkles size={14} />
                </div>
                <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inputs / Quick Actions */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        {activeConversation === null ? (
          <div className="grid grid-cols-1 gap-2">
            {DEMO_CONVERSATIONS.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleTrigger(conv.id)}
                className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-xl transition-all group"
              >
                <span>{conv.trigger}</span>
                <Send size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-primary)]" />
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => { setActiveConversation(null); setVisibleMessages([]); }}
            className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:underline"
          >
            Reset Chat
          </button>
        )}
      </div>
    </div>
  );
}
