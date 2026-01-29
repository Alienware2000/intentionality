// =============================================================================
// DAILY PLAN PARSE ENDPOINT
// Parses brain dump text for daily planning, extracting tasks for tomorrow.
//
// This endpoint takes unstructured text about tomorrow's plans and converts it
// into structured task suggestions with:
// - Task titles and priorities
// - Quest suggestions (if user has relevant quests)
// - Time suggestions (morning, afternoon, evening)
//
// The user reviews these suggestions before creating tasks.
// =============================================================================

import { NextResponse } from 'next/server';
import { withAuth, ApiErrors, parseJsonBody } from '@/app/lib/auth-middleware';
import { GeminiMessage } from '@/app/lib/gemini';
import { aiRouter, AIRouterError } from '@/app/lib/ai-router';
import { buildUserContext, formatContextForPrompt } from '@/app/lib/ai-context';
import type { Priority } from '@/app/lib/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ParseRequestBody = {
  brain_dump_text: string;
  target_date: string; // ISO date string (YYYY-MM-DD) for tomorrow
};

type ParsedTaskSuggestion = {
  title: string;
  priority: Priority;
  time_of_day?: 'morning' | 'afternoon' | 'evening';
  original_text: string;
};

type AIParseResponse = {
  suggestions: ParsedTaskSuggestion[];
  advice?: string;
};

// -----------------------------------------------------------------------------
// System Prompt Builder
// -----------------------------------------------------------------------------

function buildDailyPlanParsePrompt(
  contextString: string,
  targetDate: string
): string {
  // Format the date nicely
  const date = new Date(targetDate);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return `You are an AI assistant helping parse a user's daily planning brain dump into structured tasks for tomorrow.

=== USER CONTEXT ===
${contextString}

=== TARGET DATE ===
Tomorrow: ${dayName}, ${formattedDate} (${targetDate})

=== OUTPUT FORMAT ===
Respond with ONLY a JSON object in this exact format:
{
  "suggestions": [
    {
      "title": "Clear, actionable task title",
      "priority": "low" | "medium" | "high",
      "time_of_day": "morning" | "afternoon" | "evening" | null,
      "original_text": "The original text that led to this suggestion"
    }
  ],
  "advice": "Optional brief advice for tomorrow (1-2 sentences, or null)"
}

=== PRIORITY GUIDELINES ===
- "high": Urgent, time-sensitive, or very important (meetings, deadlines, appointments)
- "medium": Important but flexible timing (regular work, studying, errands)
- "low": Nice to do, can be moved if needed (personal tasks, optional activities)

=== TIME OF DAY DETECTION ===
Detect when a time is mentioned or implied:
- "morning meeting" → time_of_day: "morning"
- "afternoon workout" → time_of_day: "afternoon"
- "evening class" → time_of_day: "evening"
- "at 9am" → time_of_day: "morning"
- "at 2pm" → time_of_day: "afternoon"
- "at 7pm" → time_of_day: "evening"
- Leave null if no time is mentioned or implied

=== GUIDELINES ===
1. Extract each distinct task from the brain dump
2. Make titles clear and actionable (start with a verb when possible)
3. Keep titles under 60 characters
4. Preserve the original text for each suggestion
5. Infer priority from urgency cues and importance
6. Only provide advice if you have something genuinely useful to say
7. If input is too vague, still extract what you can
8. Don't create duplicate suggestions for the same thing

=== EXAMPLE ===

Input: "tomorrow I need to finish the project report in the morning, have a meeting with Sarah at 2pm, and maybe go to the gym in the evening if I have time"

Output:
{
  "suggestions": [
    {
      "title": "Finish project report",
      "priority": "high",
      "time_of_day": "morning",
      "original_text": "finish the project report in the morning"
    },
    {
      "title": "Meeting with Sarah",
      "priority": "medium",
      "time_of_day": "afternoon",
      "original_text": "have a meeting with Sarah at 2pm"
    },
    {
      "title": "Go to the gym",
      "priority": "low",
      "time_of_day": "evening",
      "original_text": "go to the gym in the evening if I have time"
    }
  ],
  "advice": "Consider blocking focused time in the morning for your report before the afternoon meeting."
}`;
}

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<ParseRequestBody>(request);
  if (!body?.brain_dump_text?.trim()) {
    return ApiErrors.badRequest('brain_dump_text is required');
  }
  if (!body?.target_date) {
    return ApiErrors.badRequest('target_date is required');
  }

  const { brain_dump_text, target_date } = body;

  // Check if any AI provider is configured
  if (!aiRouter.isConfigured()) {
    return ApiErrors.serverError(
      'AI features are being set up. Check back soon!'
    );
  }

  try {
    // Build user context for personalization
    const context = await buildUserContext(supabase, user);
    const contextString = formatContextForPrompt(context);

    // Build the processing prompt
    const systemPrompt = buildDailyPlanParsePrompt(contextString, target_date);

    // Create the messages array
    const messages: GeminiMessage[] = [
      {
        role: 'user',
        parts: [{ text: `Parse this daily planning brain dump for tomorrow:\n\n${brain_dump_text}` }],
      },
    ];

    // Call AI with lower temperature for more consistent JSON output
    const result = await aiRouter.generateWithRetry(
      'brain_dump', // Use brain_dump feature type for rate limiting
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
    let parsed: AIParseResponse;

    try {
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
    } catch {
      console.error('Failed to parse AI response as JSON:', result.text);
      // Return a fallback response
      return NextResponse.json({
        ok: true,
        suggestions: [],
        advice: 'Could not parse your input. Please try rephrasing.',
      });
    }

    // Validate and normalize the response
    const suggestions = validateAndNormalizeSuggestions(parsed.suggestions || []);

    // Return the processed results
    return NextResponse.json({
      ok: true,
      suggestions,
      advice: typeof parsed.advice === 'string' ? parsed.advice : undefined,
    });
  } catch (error) {
    console.error('Daily plan parse error:', error);

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
 * Validate and normalize task suggestions.
 */
function validateAndNormalizeSuggestions(suggestions: unknown[]): ParsedTaskSuggestion[] {
  if (!Array.isArray(suggestions)) {
    return [];
  }

  const validSuggestions: ParsedTaskSuggestion[] = [];
  const validTimeOfDay: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
  const validPriorities: Priority[] = ['low', 'medium', 'high'];

  for (const item of suggestions) {
    if (!isValidSuggestion(item)) {
      continue;
    }

    const itemPriority = item.priority as string;
    const itemTimeOfDay = item.time_of_day as string | undefined;
    const itemOriginalText = item.original_text as string | undefined;

    const normalized: ParsedTaskSuggestion = {
      title: normalizeTitle(item.title),
      priority: validPriorities.includes(itemPriority as Priority)
        ? (itemPriority as Priority)
        : 'medium',
      time_of_day: itemTimeOfDay && validTimeOfDay.includes(itemTimeOfDay as 'morning' | 'afternoon' | 'evening')
        ? (itemTimeOfDay as 'morning' | 'afternoon' | 'evening')
        : undefined,
      original_text: typeof itemOriginalText === 'string'
        ? itemOriginalText.slice(0, 200)
        : '',
    };

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
 * Normalize title string.
 */
function normalizeTitle(title: unknown): string {
  if (typeof title !== 'string') {
    return '';
  }
  return title.trim().slice(0, 100);
}
