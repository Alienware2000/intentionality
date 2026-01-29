// =============================================================================
// WEEKLY PLAN PARSE ENDPOINT
// Parses brain dump text for weekly planning, extracting tasks and habits.
//
// This endpoint takes unstructured text about the user's week and converts it
// into structured suggestions with:
// - Tasks categorized as major/have-to/quick-win
// - Day detection (e.g., "Monday meeting" → detected_day: "monday")
// - Habit identification (recurring patterns)
// - Optional advice for the week
//
// The user reviews these suggestions in the WeeklyPlanModal before creating tasks.
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
  week_start: string; // ISO date string (YYYY-MM-DD)
};

type ParsedSuggestion = {
  title: string;
  priority: Priority;
  category: 'major' | 'have-to' | 'quick-win';
  detected_day?: string;
  original_text: string;
};

type ParsedHabit = {
  title: string;
  frequency: 'daily' | 'weekdays' | '3x_week';
};

type AIParseResponse = {
  suggestions: ParsedSuggestion[];
  habits: ParsedHabit[];
  advice?: string;
};

// -----------------------------------------------------------------------------
// System Prompt Builder
// -----------------------------------------------------------------------------

function buildWeeklyPlanParsePrompt(
  contextString: string,
  weekStart: string
): string {
  // Calculate the week's dates
  const startDate = new Date(weekStart);
  const weekDates: Record<string, string> = {};
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    weekDates[dayNames[i]] = date.toISOString().split('T')[0];
  }

  return `You are an AI assistant helping parse a user's weekly plan brain dump into structured tasks and habits.

=== USER CONTEXT ===
${contextString}

=== WEEK CONTEXT ===
Week starting: ${weekStart}
- Monday: ${weekDates.monday}
- Tuesday: ${weekDates.tuesday}
- Wednesday: ${weekDates.wednesday}
- Thursday: ${weekDates.thursday}
- Friday: ${weekDates.friday}
- Saturday: ${weekDates.saturday}
- Sunday: ${weekDates.sunday}

=== OUTPUT FORMAT ===
Respond with ONLY a JSON object in this exact format:
{
  "suggestions": [
    {
      "title": "Clear, actionable task title",
      "priority": "low" | "medium" | "high",
      "category": "major" | "have-to" | "quick-win",
      "detected_day": "monday" | "tuesday" | ... | null,
      "original_text": "The original text that led to this suggestion"
    }
  ],
  "habits": [
    {
      "title": "Habit title",
      "frequency": "daily" | "weekdays" | "3x_week"
    }
  ],
  "advice": "Optional brief advice for the week (1-2 sentences, or null)"
}

=== TASK CATEGORIES ===
- "major": Big, important tasks that require significant effort (projects, assignments, presentations)
- "have-to": Essential tasks that must be done (appointments, deadlines, bills, meetings)
- "quick-win": Small tasks that can be done in under 15 minutes (emails, calls, quick errands)

=== PRIORITY GUIDELINES ===
- "high": Urgent or very important (deadlines this week, critical meetings)
- "medium": Important but not urgent (regular work, preparation tasks)
- "low": Nice to do, flexible timing (personal tasks, optional activities)

=== DAY DETECTION ===
Detect when a day is mentioned:
- Explicit: "Monday meeting" → detected_day: "monday"
- Relative: "end of week" → detected_day: "friday"
- Leave null if no day is mentioned or implied

=== HABIT DETECTION ===
Convert recurring patterns to habits:
- "meditate every day" → habit with frequency: "daily"
- "gym on weekdays" → habit with frequency: "weekdays"
- "read 3 times a week" → habit with frequency: "3x_week"
- "daily journaling" → habit with frequency: "daily"

=== GUIDELINES ===
1. Extract each distinct task from the brain dump
2. Make titles clear and actionable (start with a verb when possible)
3. Keep titles under 60 characters
4. Preserve the original text for each suggestion
5. Infer priority from urgency cues
6. Categorize appropriately - when in doubt, use "have-to"
7. Only provide advice if you have something genuinely useful to say
8. If input is too vague, still extract what you can

=== EXAMPLE ===

Input: "Monday: finish report. Tuesday: team meeting at 2pm. Daily: meditate 10 min. Need to call mom sometime. Big project presentation on Friday!"

Output:
{
  "suggestions": [
    {
      "title": "Finish report",
      "priority": "medium",
      "category": "major",
      "detected_day": "monday",
      "original_text": "Monday: finish report"
    },
    {
      "title": "Team meeting at 2pm",
      "priority": "medium",
      "category": "have-to",
      "detected_day": "tuesday",
      "original_text": "Tuesday: team meeting at 2pm"
    },
    {
      "title": "Call mom",
      "priority": "low",
      "category": "quick-win",
      "detected_day": null,
      "original_text": "Need to call mom sometime"
    },
    {
      "title": "Project presentation",
      "priority": "high",
      "category": "major",
      "detected_day": "friday",
      "original_text": "Big project presentation on Friday!"
    }
  ],
  "habits": [
    {
      "title": "Meditate for 10 minutes",
      "frequency": "daily"
    }
  ],
  "advice": "Your Friday presentation is a high-priority item. Consider blocking focus time earlier in the week to prepare."
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
  if (!body?.week_start) {
    return ApiErrors.badRequest('week_start is required');
  }

  const { brain_dump_text, week_start } = body;

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
    const systemPrompt = buildWeeklyPlanParsePrompt(contextString, week_start);

    // Create the messages array
    const messages: GeminiMessage[] = [
      {
        role: 'user',
        parts: [{ text: `Parse this weekly plan brain dump:\n\n${brain_dump_text}` }],
      },
    ];

    // Call AI with lower temperature for more consistent JSON output
    const result = await aiRouter.generateWithRetry(
      'brain_dump', // Use brain_dump feature type for similar rate limiting
      systemPrompt,
      messages,
      {
        temperature: 0.4,
        maxOutputTokens: 2048,
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
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', result.text);
      // Return a fallback response
      return NextResponse.json({
        ok: true,
        suggestions: [],
        habits: [],
        advice: 'Could not parse your input. Please try rephrasing.',
      });
    }

    // Validate and normalize the response
    const suggestions = validateAndNormalizeSuggestions(parsed.suggestions || []);
    const habits = validateAndNormalizeHabits(parsed.habits || []);

    // Return the processed results
    return NextResponse.json({
      ok: true,
      suggestions,
      habits,
      advice: typeof parsed.advice === 'string' ? parsed.advice : undefined,
    });
  } catch (error) {
    console.error('Weekly plan parse error:', error);

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
function validateAndNormalizeSuggestions(suggestions: unknown[]): ParsedSuggestion[] {
  if (!Array.isArray(suggestions)) {
    return [];
  }

  const validSuggestions: ParsedSuggestion[] = [];
  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const validCategories: Array<'major' | 'have-to' | 'quick-win'> = ['major', 'have-to', 'quick-win'];
  const validPriorities: Priority[] = ['low', 'medium', 'high'];

  for (const item of suggestions) {
    if (!isValidSuggestion(item)) {
      continue;
    }

    const itemPriority = item.priority as string;
    const itemCategory = item.category as string;
    const itemDetectedDay = item.detected_day as string | undefined;
    const itemOriginalText = item.original_text as string | undefined;

    const normalized: ParsedSuggestion = {
      title: normalizeTitle(item.title),
      priority: validPriorities.includes(itemPriority as Priority)
        ? (itemPriority as Priority)
        : 'medium',
      category: validCategories.includes(itemCategory as 'major' | 'have-to' | 'quick-win')
        ? (itemCategory as 'major' | 'have-to' | 'quick-win')
        : 'have-to',
      detected_day: itemDetectedDay && validDays.includes(itemDetectedDay.toLowerCase())
        ? itemDetectedDay.toLowerCase()
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

/**
 * Validate and normalize habit suggestions.
 */
function validateAndNormalizeHabits(habits: unknown[]): ParsedHabit[] {
  if (!Array.isArray(habits)) {
    return [];
  }

  const validHabits: ParsedHabit[] = [];
  const validFrequencies: Array<'daily' | 'weekdays' | '3x_week'> = ['daily', 'weekdays', '3x_week'];

  for (const item of habits) {
    if (!isValidHabit(item)) {
      continue;
    }

    const itemFrequency = item.frequency as string;

    const normalized: ParsedHabit = {
      title: normalizeTitle(item.title),
      frequency: validFrequencies.includes(itemFrequency as 'daily' | 'weekdays' | '3x_week')
        ? (itemFrequency as 'daily' | 'weekdays' | '3x_week')
        : 'daily',
    };

    if (!normalized.title) {
      continue;
    }

    validHabits.push(normalized);
  }

  return validHabits;
}

/**
 * Check if an item is a valid habit object.
 */
function isValidHabit(item: unknown): item is Record<string, unknown> {
  return (
    typeof item === 'object' &&
    item !== null &&
    'title' in item &&
    typeof (item as Record<string, unknown>).title === 'string'
  );
}
