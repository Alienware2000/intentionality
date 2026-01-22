// =============================================================================
// GEMINI API CLIENT
// Service for communicating with Google's Gemini 2.5 Flash-Lite API.
//
// This module handles all the complexity of working with an LLM API:
// - Rate limiting to stay within free tier limits (15 requests/minute)
// - Streaming responses for real-time chat feedback
// - Error handling with automatic retries
// - Token estimation for context budget management
//
// LEARNING: Understanding LLM API Basics
// --------------------------------------
// LLMs (Large Language Models) like Gemini work by:
// 1. Receiving a "prompt" - text input that includes context and instructions
// 2. Processing it through their neural network
// 3. Generating a "completion" - the response text
//
// Key concepts:
// - TOKENS: LLMs process text in chunks called tokens (~4 chars = 1 token)
// - CONTEXT WINDOW: Max tokens the model can handle (Gemini Flash: 1M tokens)
// - TEMPERATURE: Controls randomness (0 = deterministic, 1 = creative)
// - SYSTEM PROMPT: Instructions that shape the model's behavior
// - STREAMING: Getting response chunks as they're generated vs waiting for full response
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * A message in a conversation with the AI.
 * Roles follow the standard LLM convention:
 * - 'user': Messages from the human
 * - 'model': Messages from the AI (Gemini uses 'model' instead of 'assistant')
 */
export type GeminiMessage = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

/**
 * Configuration options for a Gemini API request.
 * These control how the model generates its response.
 */
export type GeminiConfig = {
  /**
   * Controls randomness in the response.
   * 0 = very focused/deterministic (good for tasks, extraction)
   * 0.7 = balanced (good for chat)
   * 1.0 = very creative (good for brainstorming)
   */
  temperature?: number;

  /**
   * Maximum tokens in the response.
   * Useful to prevent overly long responses.
   * Default: 1024 tokens (~4000 characters)
   */
  maxOutputTokens?: number;

  /**
   * Whether to stream the response chunk by chunk.
   * true = receive text as it's generated (better UX for chat)
   * false = wait for complete response (better for processing)
   */
  stream?: boolean;
};

/**
 * Result from a non-streaming Gemini request.
 */
export type GeminiResult = {
  text: string;
  finishReason: string;
  promptTokens?: number;
  completionTokens?: number;
};

/**
 * Error from the Gemini API with additional context.
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

// -----------------------------------------------------------------------------
// Rate Limiting
// -----------------------------------------------------------------------------

/**
 * Simple in-memory rate limiter for the free tier.
 *
 * LEARNING: Rate Limiting Patterns
 * --------------------------------
 * APIs have usage limits to prevent abuse and ensure fair access.
 * Gemini's free tier allows 15 requests per minute.
 *
 * This implementation uses a "sliding window" approach:
 * - Keep timestamps of recent requests
 * - Filter out requests older than 1 minute
 * - Check if we're under the limit before making a request
 *
 * In production, you'd want:
 * - Per-user rate limiting (we do this)
 * - Request queuing for better UX
 * - Persistent storage for distributed systems
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxRequests = 15; // Free tier limit

  /**
   * Check if a user can make a request.
   * Cleans up old timestamps in the process.
   */
  canMakeRequest(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Filter out requests outside the window
    const recentRequests = userRequests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    this.requests.set(userId, recentRequests);
    return recentRequests.length < this.maxRequests;
  }

  /**
   * Record a new request for a user.
   */
  recordRequest(userId: string): void {
    const userRequests = this.requests.get(userId) || [];
    userRequests.push(Date.now());
    this.requests.set(userId, userRequests);
  }

  /**
   * Get the time until next request is allowed (for UI feedback).
   */
  getWaitTime(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    if (userRequests.length < this.maxRequests) {
      return 0;
    }

    // Find the oldest request in the window
    const sortedRequests = [...userRequests].sort((a, b) => a - b);
    const oldestInWindow = sortedRequests[0];

    return Math.max(0, oldestInWindow + this.windowMs - now);
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// -----------------------------------------------------------------------------
// Token Estimation
// -----------------------------------------------------------------------------

/**
 * Estimate the number of tokens in a text string.
 *
 * LEARNING: Token Estimation
 * --------------------------
 * LLMs don't see characters - they see tokens (word pieces).
 * "Hello world!" might be 3 tokens: ["Hello", " world", "!"]
 *
 * Accurate tokenization requires the actual tokenizer, but for
 * budget estimation, a rough approximation works:
 * - English text: ~4 characters per token
 * - Code: ~3 characters per token (more symbols)
 *
 * We use a conservative estimate to avoid hitting context limits.
 */
export function estimateTokens(text: string): number {
  // Conservative estimate: ~3.5 chars per token
  return Math.ceil(text.length / 3.5);
}

/**
 * Estimate tokens for a conversation history.
 */
export function estimateConversationTokens(messages: GeminiMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    for (const part of msg.parts) {
      total += estimateTokens(part.text);
    }
    // Add overhead for message structure
    total += 4;
  }
  return total;
}

// -----------------------------------------------------------------------------
// Gemini Service
// -----------------------------------------------------------------------------

/**
 * Main service class for interacting with the Gemini API.
 *
 * LEARNING: Service Pattern
 * -------------------------
 * Encapsulating API logic in a service class provides:
 * - Centralized configuration
 * - Consistent error handling
 * - Easy mocking for tests
 * - Clean separation of concerns
 */
export class GeminiService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly model = 'gemini-2.5-flash-lite';

  constructor(apiKey?: string) {
    // Get API key from parameter or environment
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';

    if (!this.apiKey) {
      console.warn(
        'GeminiService: No API key provided. Set GEMINI_API_KEY environment variable.'
      );
    }
  }

  /**
   * Check if the service is configured and ready to use.
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Generate a response from the AI (non-streaming).
   *
   * LEARNING: Basic LLM API Flow
   * ----------------------------
   * 1. Construct the request with:
   *    - contents: The conversation history (messages)
   *    - generationConfig: Temperature, max tokens, etc.
   *    - systemInstruction: The system prompt (optional)
   * 2. Send POST request to the API endpoint
   * 3. Parse the response and extract the generated text
   * 4. Handle errors (rate limits, invalid requests, server errors)
   *
   * @param systemPrompt - Instructions for how the AI should behave
   * @param messages - Conversation history
   * @param config - Generation configuration
   * @param userId - For rate limiting
   */
  async generate(
    systemPrompt: string,
    messages: GeminiMessage[],
    config: GeminiConfig = {},
    userId: string
  ): Promise<GeminiResult> {
    // Check API key
    if (!this.apiKey) {
      throw new GeminiError('Gemini API key not configured', 500, false);
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest(userId)) {
      const waitTime = rateLimiter.getWaitTime(userId);
      throw new GeminiError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        true
      );
    }

    // Build the API URL
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Build request body
    // LEARNING: Gemini API Request Structure
    // The API expects a specific JSON structure:
    // - contents: Array of messages with role and parts
    // - generationConfig: How to generate the response
    // - systemInstruction: System-level instructions
    const body = {
      contents: messages,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxOutputTokens ?? 1024,
      },
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    };

    try {
      // Record the request for rate limiting
      rateLimiter.recordRequest(userId);

      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Handle HTTP errors
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message = error?.error?.message || `API error: ${response.status}`;

        // 429 = rate limit, 503 = server overload (both retryable)
        const retryable = response.status === 429 || response.status === 503;
        throw new GeminiError(message, response.status, retryable);
      }

      // Parse the response
      // LEARNING: Gemini API Response Structure
      // Response contains:
      // - candidates: Array of possible responses (usually just 1)
      // - Each candidate has content.parts with the text
      // - usageMetadata: Token counts for monitoring
      const data = await response.json();

      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new GeminiError('No response generated', 500, true);
      }

      const text = candidate.content?.parts?.[0]?.text || '';
      const finishReason = candidate.finishReason || 'STOP';

      return {
        text,
        finishReason,
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
      };
    } catch (error) {
      // Re-throw GeminiErrors as-is
      if (error instanceof GeminiError) {
        throw error;
      }

      // Wrap other errors
      throw new GeminiError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        true
      );
    }
  }

  /**
   * Generate a streaming response from the AI.
   *
   * LEARNING: Streaming Responses
   * -----------------------------
   * Streaming allows us to show text as it's being generated,
   * creating a much better user experience for chat interfaces.
   *
   * How it works:
   * 1. API sends response as Server-Sent Events (SSE)
   * 2. Each event contains a chunk of the response
   * 3. We use a ReadableStream to process chunks incrementally
   * 4. Frontend can display text character by character
   *
   * The tradeoff: Streaming is harder to implement and you can't
   * easily extract structured data from a partial response.
   *
   * @param systemPrompt - Instructions for how the AI should behave
   * @param messages - Conversation history
   * @param config - Generation configuration
   * @param userId - For rate limiting
   * @returns ReadableStream that yields text chunks
   */
  async generateStream(
    systemPrompt: string,
    messages: GeminiMessage[],
    config: GeminiConfig = {},
    userId: string
  ): Promise<ReadableStream<string>> {
    // Check API key
    if (!this.apiKey) {
      throw new GeminiError('Gemini API key not configured', 500, false);
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest(userId)) {
      const waitTime = rateLimiter.getWaitTime(userId);
      throw new GeminiError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        true
      );
    }

    // Build the streaming API URL
    // LEARNING: Gemini uses streamGenerateContent for streaming
    const url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const body = {
      contents: messages,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxOutputTokens ?? 1024,
      },
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    };

    // Record the request for rate limiting
    rateLimiter.recordRequest(userId);

    // Make the streaming request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error?.error?.message || `API error: ${response.status}`;
      const retryable = response.status === 429 || response.status === 503;
      throw new GeminiError(message, response.status, retryable);
    }

    if (!response.body) {
      throw new GeminiError('No response body', 500, true);
    }

    // LEARNING: ReadableStream Transformation
    // We need to transform the SSE stream into a text stream.
    // The API sends events like:
    //   data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}
    //
    // We extract just the text part and yield it.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<string>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();

          if (done) {
            controller.close();
            return;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE events
          // Each event starts with "data: " followed by JSON
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);

              // Skip empty data or [DONE] signals
              if (!jsonStr || jsonStr === '[DONE]') {
                continue;
              }

              try {
                const data = JSON.parse(jsonStr);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                  controller.enqueue(text);
                }
              } catch {
                // Ignore malformed JSON chunks
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      },

      cancel() {
        reader.cancel();
      },
    });
  }

  /**
   * Generate a response with automatic retry on transient errors.
   *
   * LEARNING: Retry Patterns
   * ------------------------
   * Network requests can fail temporarily due to:
   * - Server overload (503)
   * - Rate limiting (429)
   * - Network blips
   *
   * Exponential backoff is the standard retry strategy:
   * - Wait 1 second, then retry
   * - If still failing, wait 2 seconds
   * - Then 4 seconds, 8 seconds, etc.
   *
   * This prevents overwhelming the server with retries.
   */
  async generateWithRetry(
    systemPrompt: string,
    messages: GeminiMessage[],
    config: GeminiConfig = {},
    userId: string,
    maxRetries: number = 3
  ): Promise<GeminiResult> {
    let lastError: GeminiError | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.generate(systemPrompt, messages, config, userId);
      } catch (error) {
        if (error instanceof GeminiError) {
          lastError = error;

          // Only retry on retryable errors
          if (!error.retryable) {
            throw error;
          }

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    // All retries failed
    throw lastError || new GeminiError('Max retries exceeded', 500, false);
  }
}

// -----------------------------------------------------------------------------
// Default Instance
// -----------------------------------------------------------------------------

/**
 * Default Gemini service instance.
 * Uses the GEMINI_API_KEY environment variable.
 */
export const gemini = new GeminiService();
