# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**AI/LLM Providers:**
- **Google Gemini 2.5 Flash-Lite** - Primary AI model for chat and content generation
  - SDK/Client: Direct REST API via `app/lib/gemini.ts`
  - Auth: `GEMINI_API_KEY` environment variable
  - Rate Limit: 15 requests/minute (free tier)
  - Usage: Chat interface, daily briefings, brain dump processing
  - Streaming: Full streaming support via Server-Sent Events

- **Groq LLaMA 3.3 70B** - Fallback AI model with automatic failover
  - SDK/Client: OpenAI-compatible REST API via `app/lib/groq.ts`
  - Auth: `GROQ_API_KEY` environment variable
  - Rate Limit: 30 requests/minute, 14,400 requests/day (free tier)
  - Usage: Proactive insights, high-volume background features
  - Streaming: Full streaming support via Server-Sent Events

- **AI Router** (`app/lib/ai-router.ts`):
  - Provider selection by feature type (chat → Gemini, insights → Groq)
  - Automatic fallback when primary provider fails
  - Per-user daily request limits (Chat: 50, Briefing: 5, Insights: 48, Brain Dump: 20)
  - Usage logging for monitoring

## Calendar & Scheduling Integrations

**ICS Calendar Feeds (iCalendar Standard):**
- Parses `.ics` files for calendar events
- Client: Custom parser in `app/lib/ics-parser.ts`
- Stored in: `calendar_subscriptions` table
- Features:
  - Fetch from public ICS URLs
  - Parse VEVENT, VTODO entries
  - Auto-detect calendar names
  - Support for recurring events
  - Hash-based duplicate detection via `imported_events` table

**Google Calendar (OAuth 2.0):**
- OAuth integration for Google Calendar sync
- API: Google Calendar API (via OAuth tokens)
- Auth: OAuth 2.0 access/refresh tokens stored in `google_calendar_connections` table
- Stored credentials:
  - `access_token` - Current API access token
  - `refresh_token` - Long-lived refresh token
  - `token_expires_at` - Token expiration timestamp
- Database: `google_calendar_connections` table
- Endpoint: `app/api/calendar/google/auth/` (OAuth callback)
- Features:
  - Select multiple calendars to sync
  - Smart event import (as tasks or schedule blocks)
  - Duplicate event tracking
  - Last sync timestamp tracking

## Data Storage

**Databases:**
- **Supabase PostgreSQL** - Primary application database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public) + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
  - Client library: `@supabase/supabase-js` for REST API calls
  - Client library: `@supabase/ssr` for server-side cookie-based auth
  - Security: Row Level Security (RLS) on all tables
  - Schema stored in: `supabase/migrations/` (version controlled)

**File Storage:**
- Local filesystem only - No external file storage configured
- Calendar uploads: Processed in-memory, stored as database records

**Caching:**
- No external caching service
- In-memory caching via `ai_briefing_cache` database table
- Computed pattern cache via `user_pattern_aggregates` table

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** (built on Postgres)
  - Implementation: JWT-based authentication
  - Token storage: HTTP-only cookies (managed by middleware)
  - JWT validation: Via `supabase.auth.getUser()` on each request
  - Session management: Automatic refresh via middleware
  - Rate limiting: JWT token refresh tokens managed by Supabase

**Auth Flow:**
- Server client: `createSupabaseServerClient()` from `app/lib/supabase/server.ts`
- Browser client: Managed via `@supabase/ssr` package
- Middleware: `app/lib/supabase/middleware.ts` handles token refresh and cookie management
- Protected routes: Use `withAuth()` middleware wrapper in `app/lib/auth-middleware.ts`

## Monitoring & Observability

**Error Tracking:**
- None configured - Errors logged to console/Next.js logs

**Logs:**
- Console logging throughout codebase
- Next.js server logs captured during deployment
- No centralized logging service

**Usage Monitoring:**
- AI usage tracked in `ai_usage_log` table
- Interaction outcomes in `ai_interaction_outcomes` table
- User pattern aggregates in `user_pattern_aggregates` table
- Manual monitoring via database queries

## CI/CD & Deployment

**Hosting:**
- Ready for Vercel (Next.js native platform) or any Node.js host
- Environment variables configured via platform settings

**CI Pipeline:**
- None configured - Manual deployments expected
- ESLint available for pre-commit checks: `npm run lint`

**Database Migrations:**
- Supabase CLI for managing migrations
- Commands: `npm run db:new`, `npm run db:push`, `npm run db:pull`, `npm run db:status`, `npm run db:reset`
- Migrations stored in version control: `supabase/migrations/`

## Environment Configuration

**Required Environment Variables:**

Public (client-visible):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (safe to expose)

Private (server-only):
- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq API key
- `SUPABASE_ACCESS_TOKEN` - Supabase CLI authentication

**Secrets Location:**
- `.env` file (git-ignored)
- `.env.local` file (local overrides)
- Platform environment variables (Vercel, etc.)

**Local Development:**
- Supabase CLI can run local database: `supabase start`
- Configure via `supabase/config.toml`
- Local database on port 54322 (configurable)

## Webhooks & Callbacks

**Incoming Webhooks:**
- None configured

**Outgoing Webhooks:**
- Google Calendar OAuth callback: `app/api/calendar/google/auth/` (receives auth code)
- None currently sending outbound webhooks to external services

## API Rate Limits & Usage

**Per-Minute Limits:**
| Provider | Limit | Feature |
|----------|-------|---------|
| Gemini | 15 req/min | Chat, briefing, brain dump |
| Groq | 30 req/min | Insights |

**Daily Limits (per user):**
| Feature | Limit |
|---------|-------|
| Chat messages | 50 |
| Brain dump processing | 20 |
| Proactive insights | 48 |
| Daily briefing | 5 |

**Handled by:**
- `app/lib/gemini.ts` - RateLimiter class for Gemini
- `app/lib/groq.ts` - RateLimiter class for Groq
- `app/lib/ai-router.ts` - Feature-level daily limit enforcement

## AI Learning System Integration

**Database Tables for Learning:**
- `user_learning_profiles` - Goals, work style, motivation drivers, quiet hours
- `ai_interaction_outcomes` - Tracks if AI suggestions led to task completion
- `user_pattern_aggregates` - Precomputed patterns (best work times, completion rates)
- `ai_briefing_cache` - Cached daily briefings
- `ai_usage_log` - API usage tracking for daily limits

**LLM-based Signal Extraction:**
- `app/lib/ai-signal-extraction.ts` - Uses LLM to extract goals, preferences from conversations
- `app/lib/ai-learning.ts` - Updates learning profiles from conversation signals
- `app/lib/ai-context.ts` - Builds rich user context for personalized prompts

## Fetch & Error Handling

**Retry Logic:**
- `app/lib/fetch-with-retry.ts` - Wraps fetch() with automatic retry on 401 errors
- Retries once on network errors
- Handles JWT token refresh race conditions

**Streaming Support:**
- AI providers (Gemini, Groq) support Server-Sent Events (SSE) streaming
- `ReadableStream<string>` return type for streaming responses
- Used in `/api/ai/chat` for real-time chat UI

---

*Integration audit: 2026-01-31*
