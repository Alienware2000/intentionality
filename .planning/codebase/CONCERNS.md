# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Empty catch blocks throughout API routes:**
- Issue: Promises are caught and ignored silently with `.catch(() => {})`, preventing error logging and observability
- Files: `app/api/brain-dump/route.ts`, `app/api/focus/complete/route.ts`, `app/api/tasks/route.ts`, `app/api/habits/route.ts`, `app/api/quests/route.ts`, `app/api/daily-review/route.ts`
- Impact: Non-critical background operations (like onboarding tracking) fail silently. Difficult to debug why users aren't progressing through onboarding
- Fix approach: Add at minimum `console.error()` logging to these catch blocks, or use a separate error tracking layer

**Type Safety Bypasses in anime.js Integration:**
- Issue: Multiple `as any` and `as unknown as { ... }` casts to access anime.js internal animation state
- Files: `app/lib/anime-utils.ts`, `app/lib/hooks/useScrollReveal.ts`, `app/(app)/leaderboard/LeaderboardClient.tsx`, `app/(app)/analytics/AnalyticsClient.tsx`, `app/components/DashboardStats.tsx`
- Impact: Breaking changes to anime.js could go undetected; accessing internal API (currentValue, target.val) is fragile
- Fix approach: Create a type-safe wrapper for anime.js animations rather than casting; consider alternative animation library with TypeScript support

**innerHTML Usage in Counter Animations:**
- Issue: `anime-utils.ts` uses `innerHTML: [0, endValue]` for counter animations, which could be XSS vector if endValue comes from untrusted source
- Files: `app/lib/anime-utils.ts` lines 107, 252
- Impact: Low risk currently (values are from XP calculations), but sets bad pattern if reused with user input
- Fix approach: Use `textContent` instead of `innerHTML` for numeric counters; if HTML is needed, use a DOM library instead of anime.js

**Unhandled AI Provider Circuit Breaker State:**
- Issue: Circuit breaker is in-memory only; failure state is lost on server restart
- Files: `app/lib/ai-router.ts` lines 119-154
- Impact: If AI provider goes down, first requests after server restart will try failed provider again before circuit opens
- Fix approach: Move circuit breaker state to Redis or database for persistence across restarts

## Known Bugs

**Fetch Retry Race Condition Not Fully Resolved:**
- Symptoms: API calls may timeout or hang if token refresh and retries collide
- Files: `app/lib/fetch-with-retry.ts`, `app/lib/auth-middleware.ts`
- Trigger: Multiple parallel API requests while JWT expires
- Current mitigation: `fetchWithRetry` adds 100ms delay before retry on 401; auth middleware handles token refresh
- Issue: Delay is arbitrary; no exponential backoff; doesn't account for slow token refresh
- Improvement: Implement request queue that waits for token refresh to complete before retrying

**Missing Action Execution Implementation:**
- Symptoms: AI responses with `[ACTION:...]` tags parse correctly but execution is incomplete
- Files: `app/components/AIProvider.tsx` lines 413-423
- Trigger: Any AI response with action tag other than NAVIGATE
- Current state: TODO comment; only NAVIGATE (client-side redirect) is implemented
- Impact: AI suggestions for creating tasks, habits, or starting focus don't execute; users see action buttons but they don't work
- Workaround: Users must manually create tasks/habits suggested by AI
- Fix: Complete action execution API endpoints or integrate with existing CRUD endpoints

**Anime.js Counter Animation innerHTML Injection:**
- Symptoms: Counter animations may render incorrectly or expose XSS if values aren't numeric
- Files: `app/lib/anime-utils.ts` createCounterAnimation()
- Trigger: If target element innerHTML contains non-numeric content that changes
- Issue: No validation that endValue is a safe number before setting innerHTML
- Fix: Use `textContent` and ensure type safety on numeric values

## Security Considerations

**Environment Variables Exposed in Client-Side Code:**
- Risk: `process.env.GOOGLE_CLIENT_ID` appears in client-side code, though prefixed with `GOOGLE_` may indicate public exposure is acceptable
- Files: `app/api/calendar/google/auth/route.ts`, `app/api/calendar/google/callback/route.ts`, `app/api/calendar/google/sync/route.ts`, `app/api/calendar/google/calendars/route.ts`
- Current mitigation: Values use NEXT_PUBLIC prefix pattern OR are in server-only route handlers (auth/callback)
- Recommendation: Audit all calendar routes to ensure secrets are only accessed server-side; verify GOOGLE_CLIENT_SECRET is never accessed from client

**State Parameter Validation in OAuth Callback:**
- Risk: State parameter decoded from base64 but timestamp only validates 5-minute window
- Files: `app/api/calendar/google/callback/route.ts` lines 40-51
- Mitigation: Does check timestamp and verify user ID matches; decoding is wrapped in try-catch
- Recommendation: Consider CSRF token rotation to prevent replay attacks

**JSON Parsing Without Validation:**
- Risk: Multiple API routes use `await request.json().catch(() => {})`, returning empty object on parse error
- Files: `app/api/calendar/google/sync/route.ts`, `app/lib/ai-router.ts`
- Impact: If parsing fails, code continues with undefined values; could mask injection attempts
- Fix: Explicitly validate parsed data matches expected schema

**AI Router Daily Limits Fail Open:**
- Risk: If database check fails, `allowed: true` is returned, bypassing daily limits
- Files: `app/lib/ai-router.ts` lines 199-203
- Rationale: "fail open for better UX" - avoids breaking chat if database is down
- Impact: Malicious user could spam AI endpoints if Supabase is unavailable
- Recommendation: Consider stricter handling for high-volume features (insights); allow graceful degradation for user-facing chat

## Performance Bottlenecks

**AI Context Building on Every Chat Request:**
- Problem: `buildUserContext()` queries tasks, habits, quests, streaks, patterns for every message
- Files: `app/api/ai/chat/route.ts`, `app/lib/ai-context.ts`
- Cause: No caching; context includes full task list, habit completions for past 7 days, pattern aggregates
- Impact: Chat latency increases with user data size; heavy database load on popular users
- Improvement path: Cache context for 30-60 seconds; use indexed queries; implement incremental updates

**Large Component Re-renders:**
- Problem: ReviewClient (2154 lines), DayTimeline (1379 lines), WeeklyPlanModal (1098 lines) are monolithic
- Files: `app/(app)/review/ReviewClient.tsx`, `app/components/DayTimeline.tsx`, `app/components/WeeklyPlanModal/WeeklyPlanModal.tsx`
- Impact: Any state change re-renders entire component tree; hard to identify performance issues
- Improvement: Break into smaller, memoized subcomponents; use useCallback on event handlers (159 uses found but not comprehensive)

**Proactive Insights Poll Every 15 Minutes:**
- Problem: `AIProvider.tsx` polls `/api/ai/insights` every 15 minutes even if user is inactive
- Files: `app/components/AIProvider.tsx` lines 444-449
- Impact: Wasted API calls on inactive tabs; unnecessary Groq requests
- Improvement: Only poll when user is focused; pause on idle timeout; implement WebSocket alternative

**In-Memory Rate Limiter Memory Growth:**
- Problem: Rate limiter in `gemini.ts` accumulates request timestamps in memory
- Files: `app/lib/gemini.ts` lines 122-150
- Cause: While old timestamps are filtered, Map grows with each unique user
- Impact: Long-running server accumulates memory; no automatic cleanup of inactive users
- Fix: Implement TTL-based cleanup; move to Redis; cap user request history size

## Fragile Areas

**AI Action Parsing with Regex:**
- Files: `app/lib/ai-actions.ts` lines 87-100, 103-128
- Why fragile: Regex `\[ACTION:([A-Z_]+):(\{[^}]*\})` assumes single-level JSON; fails if payload contains nested braces or escaped quotes
- Safe modification: Add tests for malformed actions; use JSON schema validation; consider JSON mode API for reliable output
- Test coverage: No test files found in repo (only node_modules tests)

**Focus Timer State Machine:**
- Files: `app/components/FocusTimer.tsx`, `app/api/focus/complete/route.ts`, `FocusProvider.tsx`
- Why fragile: State transitions (idle → work → break → completed) are enforced in multiple places; race condition possible if user clicks buttons rapidly
- Safe modification: Consolidate state transitions in reducer; add optimistic update safeguards
- Risk: Incomplete state transitions could leave user in "work" state; XP claims might fail silently due to `.catch(() => {})`

**Anime.js Event Listener Attachment:**
- Files: `app/lib/anime-utils.ts`, `app/components/DashboardStats.tsx`
- Why fragile: createTimerRingAnimation creates listeners on SVG stroke-dashoffset; no documented cleanup
- Safe modification: Add explicit ref cleanup in useEffect return; verify SVG element exists before attaching
- Test coverage: No tests for animation cleanup

**Database Migration Order Dependency:**
- Files: `supabase/migrations/20260117200000_*` through `20260204000000_*`
- Why fragile: 87 migrations; backfill migration (20260204) runs after schema changes; if schema migration fails, backfill is orphaned
- Safe modification: Always test full migration sequence in dev; never reorder applied migrations
- Impact: If backfill fails, user_titles table remains partially populated

## Scaling Limits

**Supabase RLS Policy at Scale:**
- Current capacity: RLS policies on every table enforce `user_id = auth.uid()`
- Limit: Row-level security has overhead; at millions of rows per user, query performance degrades
- Scaling path: Implement data sharding by user cohort; archive old tasks/habits; consider caching layer (Redis)

**AI Usage Logging Without Cleanup:**
- Current capacity: `ai_usage_log` table grows daily with 50+ chat messages per active user
- Limit: No retention policy; table will grow unbounded
- Scaling path: Add PostgreSQL retention policy; archive logs older than 90 days; implement log sampling for high-volume features

**Context Window Token Budget:**
- Current capacity: Building context with 10 previous messages + full task list
- Limit: Gemini 1M token context window is large, but at scale with 100+ tasks + habits, context approaches 20k tokens
- Scaling path: Implement relevance-based context selection; summarize old conversations; limit task/habit detail in context

**Polling-Based Proactive Insights:**
- Current capacity: Poll every 15 minutes per active user = 96 requests/day per user
- Limit: At 1000 active users = 96k requests/day = inefficient
- Scaling path: Move to event-based triggers (on task completion, XP milestone); implement server-sent events or WebSockets

## Dependencies at Risk

**anime.js Internal API Usage:**
- Risk: Code accesses `animations[0].currentValue` (internal state), not public API
- Impact: Anime.js 3.3 update could break; only alternative is rewrite animations
- Migration plan: Switch to Framer Motion (already used) which has stable public API; or use CSS animations with JavaScript triggers

**Single Gemini/Groq Provider Dependency:**
- Risk: Both are free tier with rate limits (15 RPM Gemini, 30 RPM Groq); no other providers configured as backup
- Impact: If both go down simultaneously, all AI features fail for entire user base
- Migration plan: Add Claude API as tertiary provider; implement async job queue for non-blocking requests

**Next.js 16 / React 19 Beta Dependency:**
- Risk: Using latest beta versions (Next 16.1.0, React 19.2.3); no LTS versions pinned
- Impact: Potential breaking changes in minor updates; CVE fixes come with version bumps
- Recommendation: Document breaking changes before updating; pin to specific patch versions

## Missing Critical Features

**No Test Coverage:**
- Problem: Zero test files in src/ (only node_modules tests exist); critical features untested
- Blocks: Cannot refactor with confidence; regression detection impossible; onboarding bugs go unnoticed
- Priority: HIGH - implement unit tests for gamification, auth-middleware, AI router

**No Observability:**
- Problem: Errors logged to console only; no centralized error tracking or metrics
- Blocks: Cannot diagnose production issues; performance bottlenecks are invisible
- Recommendation: Add Sentry for error tracking; implement logging service for API calls

**No Input Validation Framework:**
- Problem: Body validation is manual (`if (!body?.field)`) scattered across 20+ API routes
- Blocks: Inconsistent error messages; injection vulnerabilities possible
- Recommendation: Use Zod or similar for schema validation; reduce code duplication

**Missing Rate Limiting on User Endpoints:**
- Problem: Leaderboard, friends, groups endpoints have no per-user rate limiting
- Blocks: Malicious user could spam queries; no protection against distributed scraping
- Recommendation: Implement middleware-level rate limiting (by IP + user_id)

## Test Coverage Gaps

**Gamification Formula Untested:**
- What's not tested: XP calculation, level formulas, streak multipliers, achievement unlocks
- Files: `app/lib/gamification.ts`, `app/lib/gamification-actions.ts`, `app/lib/achievements.ts`
- Risk: Bug in XP math (e.g., streak multiplier applied twice) could take weeks to notice
- Priority: HIGH

**API Error Paths:**
- What's not tested: 401 auth failures, 400 validation, 500 server errors, network timeouts
- Files: All `app/api/*` routes
- Risk: Error messages may be confusing; users encounter broken flows
- Priority: MEDIUM

**AI Action Parsing Edge Cases:**
- What's not tested: Malformed action tags, nested JSON, special characters in payloads
- Files: `app/lib/ai-actions.ts`
- Risk: AI responses with edge cases crash or silently fail
- Priority: MEDIUM

**Focus Timer State Transitions:**
- What's not tested: Rapid button clicks, network failures during claim, duplicate submissions
- Files: `app/components/FocusTimer.tsx`, `app/api/focus/complete/route.ts`
- Risk: XP claims double-counted or lost
- Priority: MEDIUM

**Database Migration Integrity:**
- What's not tested: Full migration sequence from v0; rollback behavior; data loss scenarios
- Files: `supabase/migrations/*`
- Risk: Dev → prod migration could drop tables or corrupt data
- Priority: HIGH

---

*Concerns audit: 2026-01-31*
