"use client";

// =============================================================================
// AI PROVIDER
// Global context for the AI assistant functionality.
//
// LEARNING: React Context for Global State
// ----------------------------------------
// React Context allows us to share state across components without
// passing props through every level (prop drilling).
//
// This provider manages:
// - Chat panel open/close state
// - Current conversation and messages
// - Streaming message state
// - Sending messages and handling responses
//
// Any component can use the useAI() hook to:
// - Open/close the chat panel
// - Send messages
// - Access conversation history
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type { AIAction, AIConversation, AIMessage, AIInsight } from "@/app/lib/types";
import { parseActionsFromResponse, stripActionsFromResponse } from "@/app/lib/ai-actions";
import { ProactiveInsightContainer } from "./ProactiveInsight";
import { fetchWithRetry } from "@/app/lib/fetch-with-retry";
import { fetchApi } from "@/app/lib/api";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * A message in the UI, which may be streaming.
 */
export type UIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  isStreaming?: boolean;
  createdAt: Date;
};

/**
 * Context value exposed by the provider.
 */
type AIContextValue = {
  // Panel state
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;

  // Conversation state
  conversations: AIConversation[];
  currentConversationId: string | null;
  messages: UIMessage[];

  // Proactive insights
  insights: AIInsight[];
  dismissInsight: (insightId: string) => void;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  startNewConversation: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  executeAction: (action: AIAction) => Promise<void>;

  // State
  isLoading: boolean;
  error: string | null;
};

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const AIContext = createContext<AIContextValue | null>(null);

/**
 * Hook to access AI context.
 * Must be used within AIProvider.
 */
export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) {
    throw new Error("useAI must be used within AIProvider");
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

// Polling interval for proactive insights (45 minutes)
// Increased from 15 min to reduce API usage while maintaining usefulness
const INSIGHTS_POLL_INTERVAL = 45 * 60 * 1000;

export function AIProvider({ children }: Props) {
  // Panel state
  const [isOpen, setIsOpen] = useState(false);

  // Conversation state
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);

  // Proactive insights state
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // Loading/error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track if we're currently streaming
  const streamingRef = useRef(false);

  // Ref to track if we've marked the meet_kofi onboarding step
  const hasMarkedKofiStepRef = useRef(false);

  // Get timezone for API calls
  const getTimezone = useCallback(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Panel Actions
  // -------------------------------------------------------------------------

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  // -------------------------------------------------------------------------
  // Conversation Actions
  // -------------------------------------------------------------------------

  /**
   * Fetch list of conversations.
   */
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetchWithRetry("/api/ai/chat");
      const data = await response.json();
      if (data.ok) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  /**
   * Load a specific conversation's messages.
   */
  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithRetry(`/api/ai/chat?conversationId=${conversationId}`);
      const data = await response.json();

      if (data.ok) {
        setCurrentConversationId(conversationId);
        setMessages(
          (data.messages || []).map((msg: AIMessage) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            actions: msg.metadata?.actions,
            isStreaming: false,
            createdAt: new Date(msg.created_at),
          }))
        );
      } else {
        setError(data.error || "Failed to load conversation");
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setError("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Start a new conversation (clear current messages).
   */
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  /**
   * Delete a conversation.
   */
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        const response = await fetchWithRetry(`/api/ai/chat?conversationId=${conversationId}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (data.ok) {
          // If deleting current conversation, clear it
          if (conversationId === currentConversationId) {
            startNewConversation();
          }
          // Refresh conversations list
          await fetchConversations();
        }
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    },
    [currentConversationId, startNewConversation, fetchConversations]
  );

  // -------------------------------------------------------------------------
  // Message Actions
  // -------------------------------------------------------------------------

  /**
   * Send a message to the AI and stream the response.
   *
   * LEARNING: Streaming Response Handling
   * -------------------------------------
   * We use the Fetch API with a ReadableStream to process the response
   * chunk by chunk as it arrives. This creates the typing effect.
   *
   * Steps:
   * 1. Add user message to UI immediately (optimistic update)
   * 2. Start streaming request
   * 3. Read chunks and update the assistant message incrementally
   * 4. Parse metadata at the end for conversation ID and actions
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || streamingRef.current) return;

      setIsLoading(true);
      setError(null);
      streamingRef.current = true;

      // Add user message immediately (optimistic update)
      const userMessageId = `temp-user-${Date.now()}`;
      const userMessage: UIMessage = {
        id: userMessageId,
        role: "user",
        content: message,
        isStreaming: false,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Create placeholder for assistant response
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: UIMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Send request
        const response = await fetchWithRetry("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            conversationId: currentConversationId,
            timezone: getTimezone(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // Prefix rate limit errors so ChatPanel can detect them
          if (response.status === 429) {
            throw new Error(`RATE_LIMIT:${errorData.error || "Daily limit reached"}`);
          }
          throw new Error(errorData.error || "Failed to send message");
        }

        // LEARNING: Reading Streaming Response
        // The response body is a ReadableStream. We get a reader and
        // read chunks in a loop until done.
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Check for metadata marker
          const metadataMarker = "__METADATA__";
          if (chunk.includes(metadataMarker)) {
            const parts = chunk.split(metadataMarker);
            // Add content before metadata
            if (parts[0]) {
              fullContent += parts[0].trim();
            }
            // Parse metadata
            if (parts[1]) {
              try {
                const metadata = JSON.parse(parts[1]);
                if (metadata.__metadata) {
                  // Update conversation ID if this was a new conversation
                  if (metadata.conversationId && !currentConversationId) {
                    setCurrentConversationId(metadata.conversationId);
                  }

                  // Parse actions from full content
                  const actions = parseActionsFromResponse(fullContent);
                  const cleanContent = stripActionsFromResponse(fullContent);

                  // Update assistant message with final data
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            id: metadata.messageId || msg.id,
                            content: cleanContent,
                            actions: actions.length > 0 ? actions : undefined,
                            isStreaming: false,
                          }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error("Failed to parse metadata:", e);
              }
            }
          } else {
            // Regular content chunk
            fullContent += chunk;

            // Update assistant message with current content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: stripActionsFromResponse(fullContent),
                    }
                  : msg
              )
            );
          }
        }

        // Ensure streaming is marked as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );

        // Refresh conversations list
        await fetchConversations();

        // Mark meet_kofi onboarding step as complete (only once)
        if (!hasMarkedKofiStepRef.current) {
          hasMarkedKofiStepRef.current = true;
          try {
            await fetchApi("/api/onboarding", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "complete", step: "meet_kofi" }),
            });
            // Dispatch event so OnboardingProvider can refresh its state
            window.dispatchEvent(new CustomEvent('onboarding-refresh'));
          } catch {
            // Non-critical - ignore errors
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        setError(error instanceof Error ? error.message : "Failed to send message");

        // Remove the streaming assistant message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
      } finally {
        setIsLoading(false);
        streamingRef.current = false;
      }
    },
    [currentConversationId, getTimezone, fetchConversations]
  );

  /**
   * Execute an action from the AI response.
   * This is called when the user confirms an action button.
   * Note: AI suggests actions but users must confirm - no auto-execution.
   */
  const executeAction = useCallback(async (action: AIAction) => {
    try {
      if (action.type === "NAVIGATE") {
        const path = (action.payload as { path: string }).path;
        window.location.href = path;
      }
    } catch (error) {
      console.error("Failed to execute action:", error);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Proactive Insights
  // -------------------------------------------------------------------------

  /**
   * Fetch proactive insights from the API.
   *
   * LEARNING: Proactive AI Features
   * -------------------------------
   * Proactive features push information to users without them asking.
   * This requires careful consideration of:
   * - Timing: Don't interrupt focused work
   * - Relevance: Only show genuinely useful insights
   * - Frequency: Don't overwhelm with notifications
   *
   * We use polling instead of WebSockets for simplicity and to work
   * with serverless deployments (Vercel). The 15-minute interval
   * balances freshness with API usage (within free tier limits).
   */
  const fetchInsights = useCallback(async () => {
    try {
      const timezone = getTimezone();
      const params = timezone ? `?timezone=${encodeURIComponent(timezone)}` : "";

      // First, request generation of new insights (POST)
      // This checks patterns and creates new insights if needed
      const generateResponse = await fetchWithRetry(`/api/ai/insights${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({}));
        console.error("Failed to generate insights:", generateResponse.status, errorData);
        return;
      }

      // Then fetch all pending insights (GET)
      const fetchResponse = await fetchWithRetry("/api/ai/insights");
      const data = await fetchResponse.json();

      if (data.ok && data.insights) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    }
  }, [getTimezone]);

  /**
   * Dismiss an insight (mark as dismissed).
   */
  const dismissInsight = useCallback(async (insightId: string) => {
    // Optimistic update - remove from UI immediately
    setInsights((prev) => prev.filter((i) => i.id !== insightId));

    try {
      await fetchWithRetry("/api/ai/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insightId,
          action: "dismiss",
        }),
      });
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
    }
  }, []);

  /**
   * Handle insight action (called from ProactiveInsight component).
   * Custom actions can be handled here if needed.
   * Most actions (NAVIGATE, START_FOCUS) are handled by the component itself.
   */
  const handleInsightAction = useCallback(() => {
    // Placeholder for future custom action handling
  }, []);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Fetch conversations when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  // Keyboard shortcut: Ctrl+Shift+K to toggle chat
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        toggleChat();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleChat]);

  // -------------------------------------------------------------------------
  // Proactive Insights Polling
  // -------------------------------------------------------------------------

  /**
   * LEARNING: Polling Pattern for Proactive Features
   * ------------------------------------------------
   * We poll for insights at regular intervals rather than using
   * real-time connections. This approach:
   *
   * 1. Works with serverless (no persistent connections needed)
   * 2. Stays within free tier limits (15 min = 4 requests/hour)
   * 3. Is simpler to implement and debug
   * 4. Automatically handles reconnection (just next poll)
   *
   * The trade-off is that insights aren't truly real-time, but
   * for a productivity app, 15-minute freshness is acceptable.
   */
  useEffect(() => {
    // Initial fetch on mount (with a small delay to not block initial render)
    const initialTimer = setTimeout(() => {
      fetchInsights();
    }, 3000);

    // Set up polling interval
    const pollTimer = setInterval(() => {
      fetchInsights();
    }, INSIGHTS_POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
    };
  }, [fetchInsights]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const value: AIContextValue = {
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    conversations,
    currentConversationId,
    messages,
    insights,
    dismissInsight,
    sendMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    executeAction,
    isLoading,
    error,
  };

  return (
    <AIContext.Provider value={value}>
      {children}
      {/* Proactive insights toast container */}
      <ProactiveInsightContainer
        insights={insights}
        onDismiss={dismissInsight}
        onAction={handleInsightAction}
      />
    </AIContext.Provider>
  );
}
