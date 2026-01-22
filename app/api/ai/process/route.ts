// =============================================================================
// AI BRAIN DUMP PROCESSING ENDPOINT
// Processes brain dump text through AI to extract actionable items.
//
// LEARNING: Structured Output from LLMs
// -------------------------------------
// When we need specific data structures from an LLM (not just freeform text),
// we have several strategies:
//
// 1. JSON Mode: Tell the model to output only valid JSON
//    - Used here: We explicitly request JSON-only output in the prompt
//    - Validate the response with try/catch
//
// 2. Schema Validation: Check the response matches expected structure
//    - We verify required fields exist
//    - We sanitize/normalize the data
//
// 3. Fallback Handling: What to do when AI doesn't follow instructions
//    - Try to extract any usable data
//    - Return a helpful error message
//
// Flow:
// 1. Receive brain dump text
// 2. Build user context for personalization
// 3. Call AI with processing prompt (JSON mode)
// 4. Parse and validate JSON response
// 5. Return structured suggestions
// =============================================================================

import { NextResponse } from 'next/server';
import { withAuth, ApiErrors, parseJsonBody } from '@/app/lib/auth-middleware';
import { GeminiMessage } from '@/app/lib/gemini';
import { aiRouter, AIRouterError } from '@/app/lib/ai-router';
import { buildUserContext, formatContextForPrompt } from '@/app/lib/ai-context';
import { buildBrainDumpProcessingPrompt } from '@/app/lib/ai-prompts';
import type { AIProcessBrainDumpResponse, Priority } from '@/app/lib/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ProcessRequestBody = {
  content: string;
  timezone?: string;
};

type AISuggestion = {
  type: 'task' | 'quest' | 'habit';
  title: string;
  due_date?: string;
  priority?: Priority;
  quest_suggestion?: string;
};

type AIProcessingResponse = {
  suggestions: AISuggestion[];
  notes?: string;
};

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<ProcessRequestBody>(request);
  if (!body?.content?.trim()) {
    return ApiErrors.badRequest('content is required');
  }

  const { content, timezone } = body;

  // Check if any AI provider is configured
  if (!aiRouter.isConfigured()) {
    return ApiErrors.serverError(
      'AI features are being set up. Check back soon!'
    );
  }

  try {
    // Build user context for personalization
    const context = await buildUserContext(supabase, user, timezone);
    const contextString = formatContextForPrompt(context);

    // Build the processing prompt
    const systemPrompt = buildBrainDumpProcessingPrompt(context, contextString);

    // Create the messages array
    const messages: GeminiMessage[] = [
      {
        role: 'user',
        parts: [{ text: `Process this brain dump:\n\n${content}` }],
      },
    ];

    // Call AI with lower temperature for more consistent JSON output
    // LEARNING: Temperature for Structured Output
    // Lower temperature (0.3-0.5) produces more consistent, deterministic output.
    // This is important when we need valid JSON - higher temps can cause
    // the model to be "creative" with the format.
    const result = await aiRouter.generateWithRetry(
      'brain_dump',
      systemPrompt,
      messages,
      {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
      user.id,
      supabase
    );

    // Parse the response as JSON
    // LEARNING: JSON Parsing from LLM Output
    // Even when we ask for JSON, the model might:
    // - Add markdown code blocks around it
    // - Include explanatory text before/after
    // - Produce invalid JSON
    // We need to handle all these cases.
    let parsed: AIProcessingResponse;

    try {
      // Try to extract JSON from the response
      let jsonStr = result.text.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      // Try to find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', result.text);
      // Return a fallback response with the raw text as a note
      return NextResponse.json({
        ok: true,
        suggestions: [],
        notes: `Could not parse AI response. Raw output: ${result.text.slice(0, 500)}`,
      } satisfies AIProcessBrainDumpResponse);
    }

    // Validate and normalize the response
    const suggestions = validateAndNormalizeSuggestions(parsed.suggestions || []);

    // Return the processed results
    const response: AIProcessBrainDumpResponse = {
      ok: true,
      suggestions,
      notes: parsed.notes || undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('AI processing error:', error);

    if (error instanceof AIRouterError) {
      return NextResponse.json(
        { ok: false, error: error.userMessage },
        { status: error.statusCode || 500 }
      );
    }

    return ApiErrors.serverError("I'm having trouble connecting. This usually resolves quickly.");
  }
});

// -----------------------------------------------------------------------------
// Validation Helpers
// -----------------------------------------------------------------------------

/**
 * Validate and normalize AI suggestions.
 * Ensures all required fields are present and values are valid.
 */
function validateAndNormalizeSuggestions(suggestions: unknown[]): AISuggestion[] {
  if (!Array.isArray(suggestions)) {
    return [];
  }

  const validSuggestions: AISuggestion[] = [];

  for (const item of suggestions) {
    if (!isValidSuggestion(item)) {
      continue;
    }

    // Normalize the suggestion
    const normalized: AISuggestion = {
      type: normalizeType(item.type),
      title: normalizeTitle(item.title),
      due_date: normalizeDueDate(item.due_date),
      priority: normalizePriority(item.priority),
      quest_suggestion: typeof item.quest_suggestion === 'string' ? item.quest_suggestion : undefined,
    };

    // Skip if title is empty after normalization
    if (!normalized.title) {
      continue;
    }

    validSuggestions.push(normalized);
  }

  return validSuggestions;
}

/**
 * Check if an item is a valid suggestion object.
 */
function isValidSuggestion(item: unknown): item is Record<string, unknown> {
  return (
    typeof item === 'object' &&
    item !== null &&
    'title' in item &&
    typeof (item as Record<string, unknown>).title === 'string'
  );
}

/**
 * Normalize suggestion type.
 */
function normalizeType(type: unknown): 'task' | 'quest' | 'habit' {
  if (type === 'quest' || type === 'habit') {
    return type;
  }
  return 'task'; // Default to task
}

/**
 * Normalize title string.
 */
function normalizeTitle(title: unknown): string {
  if (typeof title !== 'string') {
    return '';
  }
  // Truncate to 200 chars, trim whitespace
  return title.trim().slice(0, 200);
}

/**
 * Normalize due date string.
 */
function normalizeDueDate(date: unknown): string | undefined {
  if (!date || typeof date !== 'string') {
    return undefined;
  }

  // Check if it's a valid YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return undefined;
  }

  // Verify it's a valid date
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return undefined;
  }

  return date;
}

/**
 * Normalize priority value.
 */
function normalizePriority(priority: unknown): Priority | undefined {
  if (priority === 'low' || priority === 'medium' || priority === 'high') {
    return priority;
  }
  return undefined;
}
