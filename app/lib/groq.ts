// =============================================================================
// GROQ API CLIENT
// Service for communicating with Groq's LLaMA 3.3 70B API.
//
// Groq provides high-speed inference with a generous free tier (14,400 req/day).
// This client mirrors the GeminiService interface for easy swapping.
//
// Used for high-volume features like proactive insights where speed matters
// more than capability differences, freeing Gemini quota for chat/briefing.
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * A message in a conversation with the AI.
 * OpenAI-compatible format used by Groq.
 */
export type GroqMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/**
 * Configuration options for a Groq API request.
 */
export type GroqConfig = {
  /**
   * Controls randomness in the response.
   * 0 = deterministic, 1.0 = creative
   */
  temperature?: number;

  /**
   * Maximum tokens in the response.
   */
  maxOutputTokens?: number;

  /**
   * Whether to stream the response.
   */
  stream?: boolean;
};

/**
 * Result from a non-streaming Groq request.
 */
export type GroqResult = {
  text: string;
  finishReason: string;
  promptTokens?: number;
  completionTokens?: number;
};

/**
 * Error from the Groq API with additional context.
 */
export class GroqError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

// -----------------------------------------------------------------------------
// Rate Limiting
// -----------------------------------------------------------------------------

/**
 * In-memory rate limiter for Groq's free tier.
 * Groq allows 30 requests per minute, 14,400 per day.
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxRequests = 30; // Groq's limit per minute

  canMakeRequest(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    this.requests.set(userId, recentRequests);
    return recentRequests.length < this.maxRequests;
  }

  recordRequest(userId: string): void {
    const userRequests = this.requests.get(userId) || [];
    userRequests.push(Date.now());
    this.requests.set(userId, userRequests);
  }

  getWaitTime(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    if (userRequests.length < this.maxRequests) return 0;
    const sortedRequests = [...userRequests].sort((a, b) => a - b);
    const oldestInWindow = sortedRequests[0];
    return Math.max(0, oldestInWindow + this.windowMs - now);
  }
}

const rateLimiter = new RateLimiter();

// -----------------------------------------------------------------------------
// Groq Service
// -----------------------------------------------------------------------------

/**
 * Service class for interacting with the Groq API.
 * Provides the same interface as GeminiService for easy provider switching.
 */
export class GroqService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';
  private readonly model = 'llama-3.3-70b-versatile';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';

    if (!this.apiKey) {
      console.warn(
        'GroqService: No API key provided. Set GROQ_API_KEY environment variable.'
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
   * Convert Gemini-style messages to OpenAI/Groq format.
   */
  private convertMessages(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  ): GroqMessage[] {
    const groqMessages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of messages) {
      groqMessages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.parts.map((p) => p.text).join('\n'),
      });
    }

    return groqMessages;
  }

  /**
   * Generate a response from the AI (non-streaming).
   */
  async generate(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    config: GroqConfig = {},
    userId: string
  ): Promise<GroqResult> {
    if (!this.apiKey) {
      throw new GroqError('Groq API key not configured', 500, false);
    }

    if (!rateLimiter.canMakeRequest(userId)) {
      const waitTime = rateLimiter.getWaitTime(userId);
      throw new GroqError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        true
      );
    }

    const groqMessages = this.convertMessages(systemPrompt, messages);

    const body = {
      model: this.model,
      messages: groqMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxOutputTokens ?? 1024,
      stream: false,
    };

    try {
      rateLimiter.recordRequest(userId);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message = error?.error?.message || `API error: ${response.status}`;
        const retryable = response.status === 429 || response.status === 503;
        throw new GroqError(message, response.status, retryable);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        throw new GroqError('No response generated', 500, true);
      }

      return {
        text: choice.message?.content || '',
        finishReason: choice.finish_reason || 'stop',
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      };
    } catch (error) {
      if (error instanceof GroqError) {
        throw error;
      }
      throw new GroqError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        true
      );
    }
  }

  /**
   * Generate a streaming response from the AI.
   */
  async generateStream(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    config: GroqConfig = {},
    userId: string
  ): Promise<ReadableStream<string>> {
    if (!this.apiKey) {
      throw new GroqError('Groq API key not configured', 500, false);
    }

    if (!rateLimiter.canMakeRequest(userId)) {
      const waitTime = rateLimiter.getWaitTime(userId);
      throw new GroqError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        true
      );
    }

    const groqMessages = this.convertMessages(systemPrompt, messages);

    const body = {
      model: this.model,
      messages: groqMessages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxOutputTokens ?? 1024,
      stream: true,
    };

    rateLimiter.recordRequest(userId);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error?.error?.message || `API error: ${response.status}`;
      const retryable = response.status === 429 || response.status === 503;
      throw new GroqError(message, response.status, retryable);
    }

    if (!response.body) {
      throw new GroqError('No response body', 500, true);
    }

    // Transform SSE stream to text stream
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

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);

              if (!jsonStr || jsonStr === '[DONE]') {
                continue;
              }

              try {
                const data = JSON.parse(jsonStr);
                const text = data.choices?.[0]?.delta?.content;

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
   */
  async generateWithRetry(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
    config: GroqConfig = {},
    userId: string,
    maxRetries: number = 3
  ): Promise<GroqResult> {
    let lastError: GroqError | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.generate(systemPrompt, messages, config, userId);
      } catch (error) {
        if (error instanceof GroqError) {
          lastError = error;

          if (!error.retryable) {
            throw error;
          }

          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw lastError || new GroqError('Max retries exceeded', 500, false);
  }
}

// -----------------------------------------------------------------------------
// Default Instance
// -----------------------------------------------------------------------------

/**
 * Default Groq service instance.
 * Uses the GROQ_API_KEY environment variable.
 */
export const groq = new GroqService();
