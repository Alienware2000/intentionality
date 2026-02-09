// =============================================================================
// AI ROUTER
// Central routing logic for dual-provider AI system (Gemini + Groq).
//
// This module handles:
// - Provider selection based on feature type
// - Automatic fallback when primary provider fails
// - User-friendly error messages
// - Per-user daily request limits
// - Usage logging for monitoring
//
// Provider Allocation:
// - Chat: Gemini (primary) - user-facing, quality matters
// - Briefing: Gemini (primary) - low volume, quality matters
// - Insights: Groq (primary) - high volume, background feature
// - Brain Dump: Gemini (primary) - structured JSON output
// =============================================================================

import { gemini, GeminiMessage, GeminiError } from './gemini';
import { groq, GroqError } from './groq';
import type { SupabaseClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AIFeature = 'chat' | 'briefing' | 'insights' | 'brain_dump';
export type AIProvider = 'gemini' | 'groq';

export type AIConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
  responseSchema?: object; // JSON schema for structured output (Gemini only)
};

export type AIResult = {
  text: string;
  finishReason: string;
  promptTokens?: number;
  completionTokens?: number;
  provider: AIProvider;
};

/**
 * Unified error class for AI operations.
 * Contains user-friendly messages and retry information.
 */
export class AIRouterError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIRouterError';
  }
}

// -----------------------------------------------------------------------------
// User-Friendly Error Messages
// -----------------------------------------------------------------------------

const USER_MESSAGES = {
  rateLimited: "I'm getting a lot of requests right now. Please try again in a moment.",
  apiError: "I'm having trouble connecting. This usually resolves quickly.",
  bothFailed: "Both my thinking systems are busy. Please try again shortly.",
  dailyLimit: "You've reached your daily AI limit. It resets at midnight!",
  notConfigured: "AI features are being set up. Check back soon!",
};

// -----------------------------------------------------------------------------
// Provider Configuration
// -----------------------------------------------------------------------------

/**
 * Primary and fallback provider for each feature.
 */
const PROVIDER_CONFIG: Record<AIFeature, { primary: AIProvider; fallback: AIProvider }> = {
  chat: { primary: 'gemini', fallback: 'groq' },
  briefing: { primary: 'gemini', fallback: 'groq' },
  insights: { primary: 'groq', fallback: 'gemini' },
  brain_dump: { primary: 'gemini', fallback: 'groq' },
};

/**
 * Model configuration per feature.
 * All Gemini Flash models are FREE with the same rate limits (15 RPM).
 *
 * - gemini-2.5-flash-lite: Fastest, good for high-volume simple tasks
 * - gemini-2.0-flash: Better at structured JSON extraction, more reliable
 */
const MODEL_CONFIG: Record<AIFeature, string> = {
  chat: 'gemini-2.5-flash-lite',      // Fast for conversational chat
  briefing: 'gemini-2.0-flash',       // Better quality for daily summaries
  insights: 'gemini-2.5-flash-lite',  // High volume, speed matters
  brain_dump: 'gemini-2.0-flash',     // Needs reliable JSON extraction
};

/**
 * Per-user daily limits for each feature.
 */
const DAILY_LIMITS: Record<AIFeature, number> = {
  chat: 50,
  briefing: 5,
  insights: 48, // Every 30 min for 24 hours
  brain_dump: 20,
};

// -----------------------------------------------------------------------------
// Circuit Breaker
// -----------------------------------------------------------------------------

/**
 * Track consecutive failures per provider to implement circuit breaker pattern.
 * After 3 consecutive failures, temporarily disable the provider.
 */
class CircuitBreaker {
  private failures: Map<AIProvider, number> = new Map();
  private disabledUntil: Map<AIProvider, number> = new Map();
  private readonly maxFailures = 3;
  private readonly disableDurationMs = 60 * 1000; // 1 minute

  isOpen(provider: AIProvider): boolean {
    const until = this.disabledUntil.get(provider);
    if (until && Date.now() < until) {
      return true;
    }
    // Reset if disabled time has passed
    if (until) {
      this.disabledUntil.delete(provider);
      this.failures.set(provider, 0);
    }
    return false;
  }

  recordFailure(provider: AIProvider): void {
    const current = this.failures.get(provider) || 0;
    const newCount = current + 1;
    this.failures.set(provider, newCount);

    if (newCount >= this.maxFailures) {
      this.disabledUntil.set(provider, Date.now() + this.disableDurationMs);
    }
  }

  recordSuccess(provider: AIProvider): void {
    this.failures.set(provider, 0);
    this.disabledUntil.delete(provider);
  }
}

const circuitBreaker = new CircuitBreaker();

// -----------------------------------------------------------------------------
// AI Router Class
// -----------------------------------------------------------------------------

export class AIRouter {
  /**
   * Check if any provider is configured.
   */
  isConfigured(): boolean {
    return gemini.isConfigured() || groq.isConfigured();
  }

  /**
   * Check which providers are available.
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    if (gemini.isConfigured()) providers.push('gemini');
    if (groq.isConfigured()) providers.push('groq');
    return providers;
  }

  /**
   * Check daily usage limit for a user/feature.
   */
  async checkDailyLimit(
    supabase: SupabaseClient,
    userId: string,
    feature: AIFeature
  ): Promise<{ allowed: boolean; used: number; limit: number }> {
    const limit = DAILY_LIMITS[feature];
    const today = new Date().toISOString().split('T')[0];

    try {
      const { count } = await supabase
        .from('ai_usage_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature', feature)
        .gte('created_at', `${today}T00:00:00Z`);

      const used = count || 0;
      return { allowed: used < limit, used, limit };
    } catch (error) {
      // If we can't check, allow the request (fail open for better UX)
      console.error('Failed to check daily limit:', error);
      return { allowed: true, used: 0, limit };
    }
  }

  /**
   * Log usage for tracking.
   */
  async logUsage(
    supabase: SupabaseClient,
    userId: string,
    feature: AIFeature,
    provider: AIProvider
  ): Promise<void> {
    try {
      await supabase.from('ai_usage_log').insert({
        user_id: userId,
        feature,
        provider,
      });
    } catch (error) {
      // Non-critical - don't fail the request
      console.error('Failed to log AI usage:', error);
    }
  }

  /**
   * Generate a response using the appropriate provider with fallback.
   */
  async generate(
    feature: AIFeature,
    systemPrompt: string,
    messages: GeminiMessage[],
    config: AIConfig,
    userId: string,
    supabase?: SupabaseClient
  ): Promise<AIResult> {
    // Check daily limit if supabase client is provided
    if (supabase) {
      const { allowed, used, limit } = await this.checkDailyLimit(supabase, userId, feature);
      if (!allowed) {
        throw new AIRouterError(
          `Daily limit reached (${used}/${limit})`,
          USER_MESSAGES.dailyLimit,
          429,
          false
        );
      }
    }

    const { primary, fallback } = PROVIDER_CONFIG[feature];
    const providers = this.orderProviders(primary, fallback);

    let lastError: Error | null = null;

    // Get the model for this feature (only used for Gemini)
    const featureModel = MODEL_CONFIG[feature];

    for (const provider of providers) {
      // Skip if circuit breaker is open
      if (circuitBreaker.isOpen(provider)) {
        continue;
      }

      // Skip if provider is not configured
      if (provider === 'gemini' && !gemini.isConfigured()) continue;
      if (provider === 'groq' && !groq.isConfigured()) continue;

      try {
        const result = await this.generateWithProvider(
          provider,
          systemPrompt,
          messages,
          config,
          userId,
          provider === 'gemini' ? featureModel : undefined
        );

        circuitBreaker.recordSuccess(provider);

        // Log successful usage
        if (supabase) {
          await this.logUsage(supabase, userId, feature, provider);
        }

        return { ...result, provider };
      } catch (error) {
        lastError = error as Error;
        circuitBreaker.recordFailure(provider);
        console.error(`${provider} failed for ${feature}:`, error);
        // Continue to fallback
      }
    }

    // All providers failed
    throw this.createUserFriendlyError(lastError);
  }

  /**
   * Generate a streaming response using the appropriate provider with fallback.
   */
  async generateStream(
    feature: AIFeature,
    systemPrompt: string,
    messages: GeminiMessage[],
    config: AIConfig,
    userId: string,
    supabase?: SupabaseClient
  ): Promise<{ stream: ReadableStream<string>; provider: AIProvider }> {
    // Check daily limit if supabase client is provided
    if (supabase) {
      const { allowed } = await this.checkDailyLimit(supabase, userId, feature);
      if (!allowed) {
        throw new AIRouterError(
          'Daily limit reached',
          USER_MESSAGES.dailyLimit,
          429,
          false
        );
      }
    }

    const { primary, fallback } = PROVIDER_CONFIG[feature];
    const providers = this.orderProviders(primary, fallback);

    // Get the model for this feature (only used for Gemini)
    const featureModel = MODEL_CONFIG[feature];

    let lastError: Error | null = null;

    for (const provider of providers) {
      if (circuitBreaker.isOpen(provider)) continue;
      if (provider === 'gemini' && !gemini.isConfigured()) continue;
      if (provider === 'groq' && !groq.isConfigured()) continue;

      try {
        const stream = await this.generateStreamWithProvider(
          provider,
          systemPrompt,
          messages,
          config,
          userId,
          provider === 'gemini' ? featureModel : undefined
        );

        circuitBreaker.recordSuccess(provider);

        // Log successful usage
        if (supabase) {
          await this.logUsage(supabase, userId, feature, provider);
        }

        return { stream, provider };
      } catch (error) {
        lastError = error as Error;
        circuitBreaker.recordFailure(provider);
        console.error(`${provider} streaming failed for ${feature}:`, error);
      }
    }

    throw this.createUserFriendlyError(lastError);
  }

  /**
   * Generate with retry logic using the appropriate provider.
   */
  async generateWithRetry(
    feature: AIFeature,
    systemPrompt: string,
    messages: GeminiMessage[],
    config: AIConfig,
    userId: string,
    supabase?: SupabaseClient,
    maxRetries: number = 3
  ): Promise<AIResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.generate(feature, systemPrompt, messages, config, userId, supabase);
      } catch (error) {
        lastError = error as Error;

        // Don't retry non-retryable errors
        if (error instanceof AIRouterError && !error.retryable) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new AIRouterError(
      'Max retries exceeded',
      USER_MESSAGES.apiError,
      500,
      false
    );
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Order providers with primary first, fallback second.
   */
  private orderProviders(primary: AIProvider, fallback: AIProvider): AIProvider[] {
    return [primary, fallback];
  }

  /**
   * Generate using a specific provider.
   */
  private async generateWithProvider(
    provider: AIProvider,
    systemPrompt: string,
    messages: GeminiMessage[],
    config: AIConfig,
    userId: string,
    model?: string
  ): Promise<Omit<AIResult, 'provider'>> {
    if (provider === 'gemini') {
      const result = await gemini.generate(systemPrompt, messages, config, userId, model);
      return {
        text: result.text,
        finishReason: result.finishReason,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      };
    } else {
      // Note: Groq doesn't support structured output or model override
      // Pass config without responseSchema for Groq
      const groqConfig = { ...config };
      delete groqConfig.responseSchema;
      const result = await groq.generate(systemPrompt, messages, groqConfig, userId);
      return {
        text: result.text,
        finishReason: result.finishReason,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      };
    }
  }

  /**
   * Generate streaming response using a specific provider.
   */
  private async generateStreamWithProvider(
    provider: AIProvider,
    systemPrompt: string,
    messages: GeminiMessage[],
    config: AIConfig,
    userId: string,
    model?: string
  ): Promise<ReadableStream<string>> {
    if (provider === 'gemini') {
      return await gemini.generateStream(systemPrompt, messages, config, userId, model);
    } else {
      return await groq.generateStream(systemPrompt, messages, config, userId);
    }
  }

  /**
   * Transform provider-specific errors into user-friendly AIRouterErrors.
   */
  private createUserFriendlyError(error: Error | null): AIRouterError {
    if (!error) {
      return new AIRouterError(
        'Unknown error',
        USER_MESSAGES.apiError,
        500,
        true
      );
    }

    if (error instanceof GeminiError || error instanceof GroqError) {
      if (error.statusCode === 429) {
        return new AIRouterError(
          error.message,
          USER_MESSAGES.rateLimited,
          429,
          true
        );
      }
    }

    // Both providers failed
    return new AIRouterError(
      error.message,
      USER_MESSAGES.bothFailed,
      500,
      true
    );
  }
}

// -----------------------------------------------------------------------------
// Default Instance
// -----------------------------------------------------------------------------

/**
 * Default AI router instance for use throughout the application.
 */
export const aiRouter = new AIRouter();
