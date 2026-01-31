# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Layered Next.js 16 App Router application with Server Components, Client Components, and API routes.

**Key Characteristics:**
- Next.js 16 (App Router) with TypeScript strict mode
- Supabase (PostgreSQL) with Row Level Security (RLS) enforced per user
- React Context for global state management (Profile, Focus, AI, Theme, etc.)
- Dual-provider AI system (Gemini 2.5 Flash-Lite primary, Groq LLaMA 3.3 70B fallback)
- Middleware-based authentication with session refresh
- Gamification core system with XP, levels, streaks, challenges, achievements
- Pomodoro focus timer with state machine (idle → work → break → completed)

## Layers

**Presentation Layer:**
- Purpose: React components for user interface and interactions
- Location: `app/components/`
- Contains: Page layouts, modals, charts, form components, provider contexts
- Depends on: Context hooks, API utilities (`lib/api.ts`), types (`lib/types.ts`)
- Used by: Page components in `app/(app)/`

**State Management Layer:**
- Purpose: Global state via React Context providers
- Location: `app/components/*Provider.tsx`
- Contains:
  - `ProfileProvider` - User XP/level/streak (reads from `api/profile`)
  - `FocusProvider` - Pomodoro session state (reads from `api/focus`)
  - `AIProvider` - Chat/insights state (reads from `api/ai/*`)
  - `BrainDumpProvider` - Quick capture modal state
  - `ThemeProvider` - Dark/light mode toggle
  - `CelebrationProvider` - XP gain animations
  - `OnboardingProvider` - First-time user flow
- Depends on: Context hooks, Supabase types, gamification formulas
- Used by: All page components and nested children

**API Layer:**
- Purpose: RESTful HTTP endpoints with authentication
- Location: `app/api/[resource]/[action]/route.ts`
- Contains:
  - Task CRUD: `api/tasks/` (create, read, update, delete, toggle, move)
  - Focus lifecycle: `api/focus/` (complete, abandon, check active)
  - AI features: `api/ai/` (chat, briefing, insights, brain dump, learning)
  - Gamification: `api/achievements/check`, `api/challenges/`
  - Social: `api/friends/`, `api/groups/`, `api/leaderboard/`
  - Calendar: `api/calendar/google/` (OAuth, sync, subscriptions)
  - User profile: `api/profile/`, `api/daily-review/`
- Depends on: `withAuth` middleware, Supabase client, gamification logic
- Used by: Client components via `fetchApi()` utility

**Business Logic Layer:**
- Purpose: Pure computation and orchestration logic
- Location: `app/lib/`
- Key modules:
  - `gamification.ts` - XP values, level formulas, streak multipliers
  - `gamification-actions.ts` - Award XP orchestration, streak calculation
  - `ai-router.ts` - Dual-provider routing with fallback logic
  - `ai-context.ts` - User context builder for LLM prompts
  - `ai-prompts.ts` - System prompts for chat/insights/briefing
  - `ai-learning.ts` - Learning profile updates from conversations
  - `ai-signal-extraction.ts` - LLM-based goal/preference extraction
  - `achievements.ts` - Achievement unlock logic
  - `challenges.ts` - Daily/weekly challenge progress
  - `types.ts` - Comprehensive TypeScript definitions
- Depends on: External APIs (Gemini, Groq), Supabase client
- Used by: API routes, providers, components

**Data Access Layer:**
- Purpose: Supabase client configuration and query building
- Location: `app/lib/supabase/`
- Contains:
  - `server.ts` - Server-side client using Next.js cookies()
  - `client.ts` - Browser-side client
  - `middleware.ts` - Session refresh and auth redirect logic
- Depends on: Supabase SDK, Next.js APIs
- Used by: API routes, middleware, server components

**External Provider Integration Layer:**
- Purpose: LLM provider SDKs and authentication
- Location: `app/lib/`
- Key modules:
  - `gemini.ts` - Google Gemini 2.5 Flash-Lite client with streaming
  - `groq.ts` - Groq LLaMA 3.3 70B client with streaming
  - `ics-parser.ts` - ICS calendar file parsing
- Depends on: External APIs
- Used by: AI router, API endpoints

## Data Flow

**Task Creation → XP Award → Profile Update:**

1. User submits task in `DayTimeline.tsx` → POST `/api/tasks`
2. API validates, inserts to Supabase `tasks` table
3. On task toggle (completion), POST `/api/tasks/toggle` with `taskId`
4. Route handler:
   - Updates task `completed=true` in database
   - Calls `awardXp()` from `gamification-actions.ts`
   - Calculates base XP from task priority
   - Updates `user_profiles` (xp_total, level, streak)
   - Checks daily/weekly challenges for progress
   - Checks achievements for unlock conditions
5. Response includes `xpAwarded`, `levelUp`, `achievementUnlocked`
6. `ProfileProvider.refreshProfile()` refetches user profile
7. `CelebrationProvider` shows XP gain animation or level-up modal
8. UI updates with new XP/level in sidebar

**AI Chat Request → Response with Actions:**

1. User types message in `ChatPanel.tsx` → POST `/api/ai/chat`
2. API handler:
   - Calls `buildUserContext()` (tasks, habits, focus history, patterns)
   - Builds system prompt via `buildChatSystemPrompt()`
   - Calls `aiRouter.callAI()` with Gemini (primary) or Groq (fallback)
   - Returns streaming ReadableStream to client
3. Client streams response, parses action tags: `[ACTION:TYPE:{"json":"payload"}]`
4. Executes actions: `CREATE_TASK`, `START_FOCUS`, `NAVIGATE`, etc.
5. Calls `learnFromMessage()` to extract goals/preferences
6. Saves conversation to `ai_conversations` table

**Focus Timer Lifecycle:**

1. User starts focus in `FocusLauncher.tsx` → POST `/api/focus`
2. Creates `focus_sessions` record, initial state `work`
3. `FocusProvider` polls `/api/focus?status=active` on mount
4. Timer counts down using timestamp-based tracking (server time)
5. On completion (work phase): POST `/api/focus/complete`
   - Sets state to `break`, starts break timer
   - Calls `awardXp()` based on focus_minutes
6. After break, user confirms → POST `/api/focus/complete` again
   - Sets state to `completed`
   - Awards additional XP for streak/bonuses
   - Updates profile via `ProfileProvider.refreshProfile()`
7. Or user abandons → POST `/api/focus/abandon`
   - Sets state to `abandoned`
   - No XP awarded

**Daily Review → Weekly Planning Flow:**

1. User opens `DailyBriefing.tsx` → fetches `/api/daily-review/summary`
2. Shows completed tasks, habits, streaks, challenges
3. User reflects and creates tasks for tomorrow
4. On creating 3+ tasks, awards `PLANNING_XP.daily_planning` (10 XP)
5. Weekly view (`week/page.tsx`) shows week structure
6. User opens `WeeklyPlanModal` → fetches AI suggestions
7. User sets weekly goals → POST `/api/weekly-plan`
8. On completion, awards `PLANNING_XP.weekly_planning` (25 XP)

**State Management:**

- **ProfileProvider**: Polls `api/profile` on mount, refreshed after XP-earning actions
- **FocusProvider**: Maintains timer state in memory, server session in database
- **AIProvider**: Manages chat conversation history (in-memory) and message streaming
- **BrainDumpProvider**: Modal open/close state, quick capture via Ctrl+K
- **OnboardingProvider**: First-time user checklist, marks steps complete via API

## Key Abstractions

**withAuth Middleware:**
- Purpose: Protect API routes and provide authenticated context
- Examples: `app/api/tasks/route.ts`, `app/api/ai/chat/route.ts`
- Pattern: `export const POST = withAuth(async ({ user, supabase, request }) => { ... })`
- Handles: Session validation, user extraction, error responses
- Location: `app/lib/auth-middleware.ts`

**awardXp Orchestration:**
- Purpose: Centralized XP calculation and stat updates
- Examples: Task completion, habit check-in, focus session end
- Pattern: Called from task/habit/focus API routes, returns `XpAwardResult`
- Details: Updates `user_profiles`, checks achievements/challenges, returns celebration data
- Location: `app/lib/gamification-actions.ts`

**aiRouter Dual-Provider Pattern:**
- Purpose: Seamless AI provider failover with user-friendly errors
- Pattern: `aiRouter.callAI(feature, prompt, options)` tries Gemini, falls back to Groq
- Details: Rate limiting, daily usage tracking, structured output support
- Features: chat, briefing, insights, brain_dump
- Location: `app/lib/ai-router.ts`

**FocusSession State Machine:**
- Purpose: Enforce valid state transitions for focus timer
- States: `idle` → `work` → `break` → `completed` (or `abandoned`)
- Implemented in: `FocusProvider.tsx`, API routes handle state updates
- Key detail: Always reach `completed` state for XP claim (not just end of break)

**User Context Builder:**
- Purpose: Aggregate relevant user data for AI prompts
- Includes: Active tasks, habits, focus history, patterns, learning profile
- Example data: "User completed 4/5 tasks yesterday", "Best focus time: 9-11am", "Goal: finish thesis"
- Location: `app/lib/ai-context.ts`

**Achievement Unlock System:**
- Purpose: Check multiple unlock conditions and award badges
- Patterns: Streak milestones (7, 14, 30 days), task count (10, 50, 100), level thresholds
- Called after: Task completion, focus session end
- Location: `app/lib/achievements.ts`

## Entry Points

**Web Application:**
- Location: `app/layout.tsx` (root) → `app/(app)/layout.tsx` (authenticated layout)
- Triggers: Browser navigation to `/`
- Responsibilities:
  - Render root HTML
  - Wrap with Supabase/Theme providers
  - Set up Context providers in authenticated layout
  - Render Sidebar/MobileNav/ChatPanel

**Authenticated Dashboard:**
- Location: `app/(app)/dashboard/page.tsx`
- Triggers: Middleware redirect to `/dashboard` after auth
- Responsibilities: Render main dashboard content
- Uses: `DashboardWrapper` client component for date/midnight refresh logic

**API Route Handler:**
- Location: `app/api/[resource]/route.ts` (e.g., `app/api/tasks/route.ts`)
- Triggers: Fetch requests from client components
- Pattern: `export const POST = withAuth(async ({ user, supabase, request }) => { ... })`
- Responsibilities: Validate input, execute business logic, return JSON or streaming response

**Middleware:**
- Location: `middleware.ts`
- Triggers: Every request to `/` (except static assets)
- Responsibilities: Session refresh, auth redirects, cookie sync
- Delegates to: `app/lib/supabase/middleware.ts` updateSession()

**Background Jobs (Future):**
- Computed patterns: `api/ai/learn/compute` (triggers pattern aggregation)
- Calendar sync: `api/calendar/google/sync` (syncs Google Calendar events)
- Insights generation: `api/ai/insights` (proactive tips, not user-triggered)

## Error Handling

**Strategy:** Consistent error responses across all API routes with user-friendly messages.

**Patterns:**

1. **API Errors Helper** (`app/lib/auth-middleware.ts`):
   ```typescript
   ApiErrors.badRequest("message")         // 400
   ApiErrors.unauthorized("message")       // 401
   ApiErrors.forbidden("message")          // 403
   ApiErrors.notFound("message")           // 404
   ApiErrors.serverError("message")        // 500
   ```

2. **withAuth Middleware**:
   - No valid session → `ApiErrors.unauthorized("Not authenticated")`
   - Invalid JWT → `401` response

3. **Input Validation**:
   - Missing required fields → `ApiErrors.badRequest("field is required")`
   - Example: `if (!body?.title) return ApiErrors.badRequest("title is required")`

4. **Supabase Errors**:
   - Query errors → `ApiErrors.serverError(error.message)` with 500 status
   - RLS violations → Supabase returns error, caught and returned to client

5. **AI Provider Errors** (`app/lib/ai-router.ts`):
   - Rate limited → User-friendly: "I'm getting a lot of requests right now"
   - API error → "I'm having trouble connecting"
   - Both providers failed → "Both my thinking systems are busy"
   - Daily limit exceeded → "You've reached your daily AI limit"

6. **Fetch Utility** (`app/lib/api.ts`):
   - Response not OK → Throws error with status code and message
   - JSON parse error → `"Invalid JSON response"`
   - Client component catches and displays toast

## Cross-Cutting Concerns

**Logging:**
- Pattern: File headers explain module purpose, in-code comments for non-obvious logic
- No centralized logger; errors are returned to clients
- AI usage is logged to `ai_usage_log` table for rate limiting

**Validation:**
- API routes validate request bodies with typed interfaces
- Client components validate before sending (e.g., task title required)
- Supabase RLS policies enforce data access rules

**Authentication:**
- Handled by middleware (`middleware.ts`) on every request
- Session refresh via `lib/supabase/middleware.ts`
- withAuth wrapper on all API routes
- Redirect unauthenticated users to `/auth`

**Authorization (RLS):**
- All queries scoped to authenticated user via Supabase policies
- Example: Users can only query their own tasks, achievements, focus sessions
- Enforced at database level (cannot be bypassed from API)

---

*Architecture analysis: 2026-01-31*
