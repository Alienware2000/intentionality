// =============================================================================
// AI SIGNAL EXTRACTION MODULE
// Uses LLM to extract learning signals from user messages.
//
// LEARNING: LLM vs Regex for NLU
// ------------------------------
// Regex patterns are fast and cheap but only catch specific phrasings.
// LLMs understand natural language, handling:
// - Emotional/stressed language ("ugh", "so much to do")
// - Implicit signals ("mornings are rough" → low morning productivity)
// - Hypotheticals ("if my goal was..." → should NOT be saved)
// - Brain-dump style input without structure
//
// Architecture:
// - Runs async, parallel with chat response (non-blocking)
// - Uses temperature=0 for consistent extraction
// - Uses Groq (cheaper) for extraction, freeing Gemini quota for chat
// - Converts LLMExtractedSignals to LearningSignal format for storage
// =============================================================================

import { groq, GroqError } from './groq';
import { buildSignalExtractionPrompt } from './ai-prompts';
import type { LearningSignal, LLMExtractedSignals, MotivationDriver } from './types';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const EXTRACTION_CONFIG = {
  temperature: 0, // Deterministic output for consistent extraction
  maxOutputTokens: 512, // JSON response is typically small
} as const;

// -----------------------------------------------------------------------------
// Signal Extraction Function
// -----------------------------------------------------------------------------

/**
 * Extract learning signals from a user message using LLM.
 *
 * This is the main entry point for LLM-based signal extraction.
 * It handles the full flow:
 * 1. Build extraction prompt
 * 2. Call LLM (Groq)
 * 3. Parse JSON response
 * 4. Convert to LearningSignal format
 *
 * @param message - The user's message text
 * @param userId - User ID for rate limiting
 * @returns Promise<LearningSignal[]> - Extracted signals
 */
export async function extractSignalsWithLLM(
  message: string,
  userId: string
): Promise<LearningSignal[]> {
  // Skip very short messages (unlikely to contain signals)
  if (message.length < 10) {
    return [];
  }

  // Check if Groq is configured
  if (!groq.isConfigured()) {
    console.warn('Signal extraction: Groq not configured, skipping');
    return [];
  }

  try {
    const prompt = buildSignalExtractionPrompt(message);

    // Use generate (non-streaming) with temperature=0
    const result = await groq.generate(
      prompt,
      [{ role: 'user', parts: [{ text: message }] }],
      EXTRACTION_CONFIG,
      userId
    );

    // Parse the JSON response
    const extracted = parseExtractionResponse(result.text);

    if (!extracted || extracted.noSignalsDetected) {
      return [];
    }

    // Convert to LearningSignal format
    return convertToLearningSignals(extracted);
  } catch (error) {
    // Log but don't throw - extraction failure shouldn't break chat
    if (error instanceof GroqError) {
      console.warn(`Signal extraction failed (${error.statusCode}):`, error.message);
    } else {
      console.warn('Signal extraction error:', error);
    }
    return [];
  }
}

// -----------------------------------------------------------------------------
// Response Parsing
// -----------------------------------------------------------------------------

/**
 * Parse the LLM's JSON response into LLMExtractedSignals.
 * Handles common issues like markdown code blocks.
 */
function parseExtractionResponse(text: string): LLMExtractedSignals | null {
  // Clean up common response issues
  let jsonText = text.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }

  jsonText = jsonText.trim();

  try {
    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('Signal extraction: Invalid response structure');
      return null;
    }

    // Return with defaults for missing fields
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      workStyle: parsed.workStyle || null,
      timePreferences: Array.isArray(parsed.timePreferences) ? parsed.timePreferences : [],
      motivationDrivers: Array.isArray(parsed.motivationDrivers) ? parsed.motivationDrivers : [],
      dislikes: Array.isArray(parsed.dislikes) ? parsed.dislikes : [],
      focusDuration: parsed.focusDuration || null,
      noSignalsDetected: Boolean(parsed.noSignalsDetected),
    };
  } catch (error) {
    console.warn('Signal extraction: Failed to parse JSON:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Signal Conversion
// -----------------------------------------------------------------------------

/**
 * Valid motivation drivers for type checking
 */
const VALID_MOTIVATION_DRIVERS: MotivationDriver[] = [
  'achievement', 'mastery', 'deadline', 'social', 'curiosity', 'competition'
];

/**
 * Convert LLMExtractedSignals to LearningSignal format for storage.
 * Filters out hypothetical goals and low-confidence signals.
 */
function convertToLearningSignals(extracted: LLMExtractedSignals): LearningSignal[] {
  const signals: LearningSignal[] = [];
  const now = new Date().toISOString();

  // Convert goals (exclude hypothetical ones)
  for (const goal of extracted.goals) {
    if (goal.isHypothetical) continue;
    if (goal.confidence < 0.5) continue;

    signals.push({
      type: 'goal_stated',
      content: normalizeGoalText(goal.text),
      confidence: goal.confidence,
      extractedAt: now,
    });
  }

  // Convert work style
  if (extracted.workStyle && extracted.workStyle.preference) {
    if (extracted.workStyle.confidence >= 0.5) {
      signals.push({
        type: 'work_style_indicated',
        content: extracted.workStyle.preference,
        confidence: extracted.workStyle.confidence,
        extractedAt: now,
      });
    }
  }

  // Convert time preferences
  for (const pref of extracted.timePreferences) {
    if (pref.confidence < 0.5) continue;

    signals.push({
      type: 'preference_expressed',
      content: `preferred_work_hours:${pref.period}`,
      confidence: pref.confidence,
      extractedAt: now,
    });
  }

  // Convert motivation drivers
  for (const motivation of extracted.motivationDrivers) {
    if (motivation.confidence < 0.5) continue;
    if (!VALID_MOTIVATION_DRIVERS.includes(motivation.driver)) continue;

    signals.push({
      type: 'preference_expressed',
      content: `motivation:${motivation.driver}`,
      confidence: motivation.confidence,
      extractedAt: now,
    });
  }

  // Convert dislikes
  for (const dislike of extracted.dislikes) {
    if (dislike.confidence < 0.5) continue;
    if (dislike.type !== 'insight_type') continue; // Only store insight type dislikes for now

    signals.push({
      type: 'feedback_given',
      content: `dislike:${dislike.value}`,
      confidence: dislike.confidence,
      extractedAt: now,
    });
  }

  // Convert focus duration
  if (extracted.focusDuration) {
    const { minutes, confidence } = extracted.focusDuration;
    if (confidence >= 0.5 && minutes >= 5 && minutes <= 120) {
      signals.push({
        type: 'preference_expressed',
        content: `focus_duration:${minutes}`,
        confidence: confidence,
        extractedAt: now,
      });
    }
  }

  return signals;
}

/**
 * Normalize goal text for consistent storage.
 */
function normalizeGoalText(text: string): string {
  return text
    .trim()
    .replace(/^(to|that|about)\s+/i, '') // Remove leading prepositions
    .replace(/[.!?]+$/, '') // Remove trailing punctuation
    .slice(0, 200) // Limit length
    .trim();
}
