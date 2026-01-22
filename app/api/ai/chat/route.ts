// =============================================================================
// AI CHAT API ENDPOINT
// Streaming chat endpoint for the Kofi AI assistant.
//
// LEARNING: Streaming API Endpoints in Next.js
// ---------------------------------------------
// Traditional API endpoints wait for the full response before sending it.
// Streaming endpoints send data as it's generated, which:
// - Provides faster perceived response time
// - Shows text appearing character by character (like ChatGPT)
// - Reduces memory usage for large responses
//
// We use the Web Streams API (ReadableStream) for this.
// Next.js 13+ App Router has native support for streaming responses.
//
// Flow:
// 1. Receive user message
// 2. Build context and system prompt
// 3. Call Gemini with streaming enabled
// 4. Transform stream to include actions and message ID
// 5. Save messages to database
// 6. Return streaming response to client
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth, ApiErrors, parseJsonBody } from '@/app/lib/auth-middleware';
import { GeminiMessage } from '@/app/lib/gemini';
import { aiRouter, AIRouterError } from '@/app/lib/ai-router';
import { buildUserContext, formatContextForPrompt } from '@/app/lib/ai-context';
import { buildChatSystemPrompt } from '@/app/lib/ai-prompts';
import { parseActionsFromResponse } from '@/app/lib/ai-actions';
import { learnFromMessage } from '@/app/lib/ai-learning';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ChatRequestBody = {
  message: string;
  conversationId?: string;
  timezone?: string;
};

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  // Parse request body
  const body = await parseJsonBody<ChatRequestBody>(request);
  if (!body?.message?.trim()) {
    return ApiErrors.badRequest('message is required');
  }

  const { message, conversationId, timezone } = body;

  // Check if any AI provider is configured
  if (!aiRouter.isConfigured()) {
    return ApiErrors.serverError(
      'AI features are being set up. Check back soon!'
    );
  }

  try {
    // Get or create conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      // Create new conversation with title from first message
      const title = message.length > 50 ? message.slice(0, 47) + '...' : message;

      const { data: newConversation, error: convError } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title,
        })
        .select('id')
        .single();

      if (convError || !newConversation) {
        console.error('Failed to create conversation:', convError);
        return ApiErrors.serverError('Failed to create conversation');
      }

      activeConversationId = newConversation.id;
    }

    // Fetch conversation history (last 10 messages for context)
    const { data: history } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Build messages array for Gemini
    // LEARNING: Conversation History for Context
    // LLMs are stateless - they don't remember previous messages.
    // We need to include relevant history in each request.
    const messages: GeminiMessage[] = [];

    // Add history (convert our role format to Gemini's)
    for (const msg of history || []) {
      messages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Save user message to database
    const { data: userMessage, error: userMsgError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: 'user',
        content: message,
        metadata: {},
      })
      .select('id')
      .single();

    if (userMsgError) {
      console.error('Failed to save user message:', userMsgError);
      // Continue anyway - we can still generate a response
    }

    // Extract learning signals from user message (runs in background)
    // This allows Kofi to learn from explicit user statements like
    // "My goal is to graduate with honors" or "I work best in the morning"
    learnFromMessage(message, supabase, user.id).catch((err) => {
      console.warn('Learning extraction failed:', err);
    });

    // Build context and system prompt
    const context = await buildUserContext(supabase, user, timezone);
    const contextString = formatContextForPrompt(context);
    const systemPrompt = buildChatSystemPrompt(context, contextString);

    // Generate streaming response using AI router (with fallback)
    const { stream, provider } = await aiRouter.generateStream(
      'chat',
      systemPrompt,
      messages,
      {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
      user.id,
      supabase
    );

    // LEARNING: TransformStream for Processing Streamed Data
    // We need to:
    // 1. Collect the full response for saving to database
    // 2. Parse actions when complete
    // 3. Pass through chunks to client
    //
    // TransformStream lets us do this by intercepting each chunk.
    let fullResponse = '';

    const transformedStream = new TransformStream<string, string>({
      transform(chunk, controller) {
        fullResponse += chunk;
        controller.enqueue(chunk);
      },
      async flush(controller) {
        // Stream is complete, now save the response
        try {
          // Parse any actions from the response
          const actions = parseActionsFromResponse(fullResponse);

          // Create placeholder for assistant message ID
          let assistantMessageId = '';

          // Save assistant message
          const { data: assistantMessage } = await supabase
            .from('ai_messages')
            .insert({
              conversation_id: activeConversationId,
              user_id: user.id,
              role: 'assistant',
              content: fullResponse,
              metadata: {
                actions: actions.length > 0 ? actions : undefined,
                provider,
                model: provider === 'gemini' ? 'gemini-2.5-flash-lite' : 'llama-3.3-70b-versatile',
              },
            })
            .select('id')
            .single();

          if (assistantMessage) {
            assistantMessageId = assistantMessage.id;
          }

          // Enqueue metadata as a final JSON chunk
          // Client can parse this to get actions and message ID
          const metadata = JSON.stringify({
            __metadata: true,
            conversationId: activeConversationId,
            messageId: assistantMessageId,
            actions,
          });
          controller.enqueue(`\n\n__METADATA__${metadata}`);
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      },
    });

    // Pipe through transform
    const responseStream = stream.pipeThrough(transformedStream);

    // LEARNING: Returning Streaming Responses in Next.js
    // We return a Response with:
    // - The ReadableStream as the body
    // - Content-Type: text/event-stream for SSE compatibility
    // - Cache-Control: no-cache to prevent caching
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);

    if (error instanceof AIRouterError) {
      // Return user-friendly error message
      return NextResponse.json(
        { ok: false, error: error.userMessage },
        { status: error.statusCode || 500 }
      );
    }

    return ApiErrors.serverError("I'm having trouble connecting. This usually resolves quickly.");
  }
});

// -----------------------------------------------------------------------------
// GET: Fetch conversation history
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase, request }) => {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');

  if (conversationId) {
    // Fetch specific conversation with messages
    const { data: messages, error } = await supabase
      .from('ai_messages')
      .select('id, role, content, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return ApiErrors.serverError('Failed to fetch messages');
    }

    return NextResponse.json({ ok: true, messages });
  }

  // Fetch list of conversations
  const { data: conversations, error } = await supabase
    .from('ai_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    return ApiErrors.serverError('Failed to fetch conversations');
  }

  return NextResponse.json({ ok: true, conversations });
});

// -----------------------------------------------------------------------------
// DELETE: Delete a conversation
// -----------------------------------------------------------------------------

export const DELETE = withAuth(async ({ user, supabase, request }) => {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');

  if (!conversationId) {
    return ApiErrors.badRequest('conversationId is required');
  }

  // Delete conversation (messages will cascade delete)
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id);

  if (error) {
    return ApiErrors.serverError('Failed to delete conversation');
  }

  return NextResponse.json({ ok: true });
});
