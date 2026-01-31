# Codebase Structure

**Analysis Date:** 2026-01-31

## Directory Layout

```
intentionality/
├── app/
│   ├── layout.tsx                          # Root layout (HTML, fonts, globals)
│   ├── globals.css                         # Tailwind CSS global styles
│   │
│   ├── (app)/                              # Authenticated routes (Route Group)
│   │   ├── layout.tsx                      # Auth layout with 8 Context providers
│   │   ├── dashboard/page.tsx              # Main dashboard (DashboardWrapper)
│   │   ├── week/page.tsx                   # Weekly view + planner modal
│   │   ├── quests/page.tsx                 # Quest/goal management
│   │   ├── review/page.tsx                 # Daily review + briefing
│   │   ├── leaderboard/page.tsx            # Global/friend leaderboards
│   │   ├── analytics/page.tsx              # Charts: activity, habits, XP
│   │   ├── friends/page.tsx                # Friend requests, social
│   │   ├── inbox/page.tsx                  # Notifications, achievements
│   │   ├── groups/page.tsx                 # Group management
│   │   ├── groups/[id]/page.tsx            # Group detail view
│   │   └── settings/page.tsx               # User preferences
│   │
│   ├── (auth)/auth/                        # Authentication pages (Route Group)
│   │   ├── layout.tsx                      # Auth layout (minimal)
│   │   ├── page.tsx                        # Login/signup form
│   │   └── link-expired/page.tsx           # Link expiration error
│   │
│   ├── (marketing)/                        # Public landing pages
│   │   ├── layout.tsx                      # Marketing layout
│   │   └── page.tsx                        # Landing page with hero/features
│   │
│   ├── api/                                # RESTful API endpoints
│   │   ├── tasks/
│   │   │   ├── route.ts                    # GET/POST/PATCH/DELETE (CRUD)
│   │   │   ├── toggle/route.ts             # PATCH mark task done/undone
│   │   │   ├── complete/route.ts           # Alternative completion endpoint
│   │   │   ├── move/route.ts               # PATCH move task to date
│   │   │   ├── restore/route.ts            # PATCH restore soft-deleted task
│   │   │   ├── bulk/route.ts               # POST bulk operations
│   │   │   ├── range/route.ts              # GET tasks in date range
│   │   │   ├── for-today/route.ts          # GET today's tasks
│   │   │   └── from-priorities/route.ts    # Create from priority labels
│   │   │
│   │   ├── focus/
│   │   │   ├── route.ts                    # GET active sessions, POST start
│   │   │   ├── complete/route.ts           # PATCH move to break/complete
│   │   │   └── abandon/route.ts            # PATCH abandon session
│   │   │
│   │   ├── ai/
│   │   │   ├── chat/route.ts               # POST streaming AI chat
│   │   │   ├── briefing/route.ts           # GET daily briefing (cached)
│   │   │   ├── insights/route.ts           # GET proactive tips (limit: 48/day)
│   │   │   ├── process/route.ts            # POST brain dump processing
│   │   │   ├── context/route.ts            # GET aggregated user context
│   │   │   ├── learn/route.ts              # GET/POST/PATCH learning profile
│   │   │   ├── learn/compute/route.ts      # POST compute pattern aggregates
│   │   │   ├── weekly-plan/parse/route.ts  # POST parse weekly goals from text
│   │   │   └── daily-plan/parse/route.ts   # POST parse daily goals from text
│   │   │
│   │   ├── achievements/
│   │   │   ├── route.ts                    # GET user achievements
│   │   │   └── check/route.ts              # POST check all conditions
│   │   │
│   │   ├── challenges/
│   │   │   ├── route.ts                    # GET daily/weekly challenges
│   │   │   ├── daily/route.ts              # GET today's challenges
│   │   │   ├── weekly/route.ts             # GET week's challenges
│   │   │   └── progress/route.ts           # GET challenge progress
│   │   │
│   │   ├── profile/
│   │   │   └── route.ts                    # GET current user profile
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── global/route.ts             # GET top 50 users globally
│   │   │   └── friends/route.ts            # GET friend leaderboard
│   │   │
│   │   ├── friends/
│   │   │   ├── route.ts                    # GET friends, POST add friend
│   │   │   ├── [id]/route.ts               # DELETE remove friend
│   │   │   └── block/route.ts              # POST block user
│   │   │
│   │   ├── groups/
│   │   │   ├── route.ts                    # GET user groups, POST create
│   │   │   ├── join/route.ts               # POST join group by code
│   │   │   ├── [id]/route.ts               # GET group details
│   │   │   ├── [id]/leave/route.ts         # POST leave group
│   │   │   ├── [id]/leaderboard/route.ts   # GET group leaderboard
│   │   │   └── [id]/activity/route.ts      # GET group activity feed
│   │   │
│   │   ├── calendar/
│   │   │   ├── google/auth/route.ts        # OAuth redirect to Google
│   │   │   ├── google/callback/route.ts    # OAuth callback handler
│   │   │   ├── google/calendars/route.ts   # GET user's calendars
│   │   │   ├── google/sync/route.ts        # POST sync calendar events
│   │   │   ├── sync/route.ts               # POST sync uploaded ICS
│   │   │   ├── upload/route.ts             # POST upload ICS file
│   │   │   └── subscriptions/route.ts      # GET/POST calendar subscriptions
│   │   │
│   │   ├── daily-review/
│   │   │   ├── route.ts                    # POST record daily review
│   │   │   ├── summary/route.ts            # GET review stats + briefing
│   │   │   └── planning-xp/route.ts        # POST award planning XP
│   │   │
│   │   ├── habits/
│   │   │   ├── route.ts                    # GET/POST/PATCH/DELETE habits
│   │   │   └── check/route.ts              # POST mark habit checked today
│   │   │
│   │   ├── analytics/route.ts              # GET XP/activity/habit charts
│   │   ├── activity-log/route.ts           # GET user activity history
│   │   ├── streak/route.ts                 # GET streak data
│   │   ├── quests/route.ts                 # GET/POST/PATCH quests
│   │   ├── onboarding/route.ts             # POST mark onboarding steps
│   │   ├── privacy/route.ts                # GET/PATCH privacy settings
│   │   ├── notifications/route.ts          # GET user notifications
│   │   └── day-timeline/route.ts           # GET tasks + calendar for date
│   │
│   ├── components/                         # React components (44 files)
│   │   ├── *Provider.tsx                   # 8 Context providers
│   │   │   ├── ProfileProvider.tsx         # User XP/level/streak
│   │   │   ├── FocusProvider.tsx           # Pomodoro timer state
│   │   │   ├── AIProvider.tsx              # Chat/insights state
│   │   │   ├── BrainDumpProvider.tsx       # Quick capture modal
│   │   │   ├── ThemeProvider.tsx           # Dark/light mode
│   │   │   ├── CelebrationOverlay.tsx      # XP animations
│   │   │   ├── OnboardingProvider.tsx      # Onboarding flow
│   │   │   ├── SocialProvider.tsx          # Friend requests/notifications
│   │   │   └── Toast.tsx                   # Toast notifications
│   │   │
│   │   ├── Layout Components
│   │   │   ├── Sidebar.tsx                 # Desktop left nav + profile
│   │   │   ├── MobileNav.tsx               # Mobile bottom nav
│   │   │   └── DashboardWrapper.tsx        # Midnight auto-refresh logic
│   │   │
│   │   ├── Feature Components
│   │   │   ├── DayTimeline.tsx             # Main task timeline (49KB)
│   │   │   ├── DashboardContent.tsx        # Dashboard intro/stats
│   │   │   ├── DashboardStats.tsx          # XP/level/streak cards
│   │   │   ├── DailyBriefing.tsx           # Review summary + briefing
│   │   │   ├── FocusLauncher.tsx           # Start focus session
│   │   │   ├── FocusTimer.tsx              # Running timer display
│   │   │   ├── TaskCard.tsx                # Individual task display
│   │   │   ├── EditTaskModal.tsx           # Task edit form
│   │   │   ├── AddTaskInline.tsx           # Quick task creation
│   │   │   ├── EditHabitModal.tsx          # Habit management
│   │   │   ├── AddScheduleModal.tsx        # Schedule block creation
│   │   │   ├── CalendarDayView.tsx         # Calendar event viewer
│   │   │   ├── BrainDumpModal.tsx          # AI quick capture form
│   │   │   ├── ChatPanel.tsx               # AI assistant interface
│   │   │   ├── ChatMessage.tsx             # Chat message display
│   │   │   ├── OnboardingModal.tsx         # First-time user checklist
│   │   │   ├── GettingStartedChecklist.tsx # Onboarding steps
│   │   │   ├── ConfirmModal.tsx            # Generic confirm dialog
│   │   │   └── DashboardSync.tsx           # Sync indicator
│   │   │
│   │   ├── gamification/
│   │   │   ├── AchievementCard.tsx         # Badge display
│   │   │   ├── AchievementGrid.tsx         # Achievement list
│   │   │   ├── DailyChallengesSection.tsx  # Daily challenges display
│   │   │   └── WeeklyChallengeCard.tsx     # Weekly challenge card
│   │   │
│   │   ├── charts/
│   │   │   ├── ActivityHeatmap.tsx         # Task completion heatmap
│   │   │   ├── HabitHeatmap.tsx            # Habit check heatmap
│   │   │   └── XpChart.tsx                 # XP progression chart
│   │   │
│   │   ├── social/
│   │   │   ├── RankingRow.tsx              # Leaderboard row
│   │   │   ├── UserCard.tsx                # User profile card
│   │   │   ├── FriendRequestCard.tsx       # Friend request display
│   │   │   ├── AddFriendModal.tsx          # Add friend form
│   │   │   ├── GroupCard.tsx               # Group display
│   │   │   ├── NotificationCenter.tsx      # Notification list
│   │   │   ├── NotificationItem.tsx        # Individual notification
│   │   │   ├── NotificationBell.tsx        # Bell icon with badge
│   │   │   ├── ActivityFeedItem.tsx        # Activity entry display
│   │   │   └── SocialProvider.tsx          # Social state
│   │   │
│   │   ├── landing/
│   │   │   ├── HeroSection.tsx             # Hero with CTA
│   │   │   ├── PhilosophySection.tsx       # "Why Intentionality" section
│   │   │   ├── FeaturesShowcase.tsx        # Feature cards
│   │   │   ├── AIAssistantDemo.tsx         # AI capabilities demo
│   │   │   ├── FocusTimerDemo.tsx          # Pomodoro demo
│   │   │   ├── GamificationDemo.tsx        # XP/level demo
│   │   │   ├── SocialProof.tsx             # Testimonials
│   │   │   ├── CTASection.tsx              # Bottom CTA
│   │   │   └── LandingNav.tsx              # Landing page nav
│   │   │
│   │   ├── WeeklyPlanModal/
│   │   │   ├── index.tsx                   # Component export
│   │   │   ├── WeeklyPlanModal.tsx         # Modal container
│   │   │   └── TaskDaySelector.tsx         # Day selection UI
│   │
│   └── lib/                                # Business logic & utilities
│       ├── types.ts                        # TypeScript type definitions (100+ KB)
│       │                                   # Contains: Quest, Task, Habit, Achievement, etc.
│       │
│       ├── auth-middleware.ts              # withAuth() wrapper, ApiErrors helpers
│       ├── api.ts                          # fetchApi<T>() utility, error handling
│       │
│       ├── gamification.ts                 # XP values, level formula, streak multipliers
│       ├── gamification-actions.ts         # awardXp() orchestration
│       ├── achievements.ts                 # Achievement unlock logic
│       ├── challenges.ts                   # Daily/weekly challenge management
│       │
│       ├── ai-router.ts                    # Dual-provider routing (Gemini + Groq)
│       ├── gemini.ts                       # Google Gemini 2.5 Flash-Lite client
│       ├── groq.ts                         # Groq LLaMA 3.3 70B client
│       ├── ai-context.ts                   # User context builder
│       ├── ai-prompts.ts                   # System prompts for features
│       ├── ai-actions.ts                   # Action parsing from AI responses
│       ├── ai-learning.ts                  # Learning profile updates
│       ├── ai-signal-extraction.ts         # LLM-based signal extraction
│       │
│       ├── supabase/
│       │   ├── server.ts                   # Server client (Route handlers)
│       │   ├── client.ts                   # Browser client (Client components)
│       │   └── middleware.ts               # Session refresh, auth redirects
│       │
│       ├── hooks/
│       │   ├── useProfile.ts               # useProfile() hook
│       │   ├── useScrollReveal.ts          # Scroll animation hook
│       │   ├── useDayTimeline.ts           # Timeline rendering hook
│       │   └── useCurrentDate.ts           # Date management hook
│       │
│       ├── date-utils.ts                   # Date formatting, getLocalDateString()
│       ├── format-time.ts                  # formatTime(seconds) utility
│       ├── constants.ts                    # App-wide constants
│       ├── cn.ts                           # classNames() utility (tailwind-merge)
│       ├── api-utils.ts                    # API response builders
│       ├── nlp-parser.ts                   # Natural language parsing
│       ├── ics-parser.ts                   # ICS calendar file parser
│       ├── anime-utils.ts                  # Anime.js animation helpers
│       ├── fetch-with-retry.ts             # Retry logic for flaky requests
│       ├── smart-recommendations.ts        # Smart suggestion logic
│       └── onboarding.ts                   # Onboarding step helpers
│
├── supabase/
│   └── migrations/
│       ├── 20260117200000_brain_dump.sql
│       ├── 20260128000000_task_xp_awarded.sql
│       ├── 20260129000000_social_features.sql
│       ├── 20260130000000_leaderboard_default_visible.sql
│       └── 20260204000000_backfill_user_titles.sql
│
├── public/                                 # Static assets (images, icons)
├── .next/                                  # Next.js build output (generated)
├── middleware.ts                           # Next.js middleware (auth, redirects)
├── next.config.ts                          # Next.js configuration
├── tailwind.config.ts                      # Tailwind CSS configuration
├── tsconfig.json                           # TypeScript configuration
├── postcss.config.mjs                      # PostCSS configuration
├── eslint.config.mjs                       # ESLint configuration
├── package.json                            # Dependencies, scripts
├── CLAUDE.md                               # This architecture guide
└── README.md                               # Project documentation
```

## Directory Purposes

**`app/(app)/`:**
- Purpose: Authenticated dashboard and feature pages
- Contains: 11 main pages (dashboard, week, quests, analytics, etc.)
- Key files: Each page exports a default component or uses client wrappers
- Route protection: Middleware redirects unauthenticated users to `/auth`

**`app/(auth)/auth/`:**
- Purpose: Login, signup, password reset flows
- Contains: Auth form pages, OAuth callback handling
- Key files: `page.tsx` (login form), `link-expired/page.tsx` (error state)

**`app/(marketing)/`:**
- Purpose: Public landing page for non-authenticated users
- Contains: Hero, features, testimonials, CTAs
- Key files: `page.tsx` (landing), landing component variants

**`app/api/`:**
- Purpose: RESTful HTTP endpoints organized by resource
- Pattern: Each endpoint folder contains `route.ts` with POST/GET/PATCH/DELETE handlers
- Structure: Resource → action → `route.ts`
- Auth: All routes use `withAuth()` middleware except `/auth/callback`

**`app/components/`:**
- Purpose: Reusable React components
- Structure: Flat + category subdirectories (gamification, charts, social, landing)
- Patterns:
  - Providers: Global state context components
  - Feature: Business domain components (tasks, focus, AI, etc.)
  - Category: Grouped by feature area
  - Utils: Small reusable UI components (modals, cards)

**`app/lib/`:**
- Purpose: Business logic, utilities, and type definitions
- Structure: Flat files + `supabase/` and `hooks/` subdirectories
- Key distinction:
  - Core logic: `gamification.ts`, `ai-router.ts`, `auth-middleware.ts`
  - Client: `hooks/` custom React hooks
  - Integrations: `supabase/`, `gemini.ts`, `groq.ts`
  - Utilities: `date-utils.ts`, `format-time.ts`, `api.ts`, etc.

**`supabase/migrations/`:**
- Purpose: Database schema version control
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Contains: CREATE TABLE, ALTER TABLE, RLS policies

## Key File Locations

**Entry Points:**
- `app/layout.tsx` - Root HTML layout, global CSS import
- `app/(app)/layout.tsx` - Authenticated app layout with 8 providers
- `middleware.ts` - Request middleware for auth and redirects
- `app/(app)/dashboard/page.tsx` - Default authenticated page (DashboardWrapper)

**Configuration:**
- `package.json` - Dependencies, build/dev/db scripts
- `tsconfig.json` - TypeScript strict mode, path aliases (@/*)
- `tailwind.config.ts` - CSS class generation
- `eslint.config.mjs` - Linting rules

**Core Logic:**
- `app/lib/auth-middleware.ts` - withAuth() wrapper, ApiErrors, response helpers
- `app/lib/gamification.ts` - XP values, level formulas, multipliers
- `app/lib/gamification-actions.ts` - awardXp() orchestration
- `app/lib/ai-router.ts` - Dual-provider AI routing
- `app/lib/types.ts` - All TypeScript type definitions

**State Management:**
- `app/components/ProfileProvider.tsx` - User profile context
- `app/components/FocusProvider.tsx` - Focus timer state
- `app/components/AIProvider.tsx` - Chat/insights state
- `app/(app)/layout.tsx` - Provider nesting (see provider list)

**API Infrastructure:**
- `app/lib/supabase/server.ts` - Server-side Supabase client
- `app/lib/supabase/middleware.ts` - Session refresh, redirects
- `app/api/tasks/route.ts` - Task CRUD pattern example

**Testing:**
- No test files present (testing not set up yet)
- Recommendation: Add `.test.ts` files alongside source files

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- Components: PascalCase, e.g., `DayTimeline.tsx`, `TaskCard.tsx`
- Utilities: camelCase, e.g., `date-utils.ts`, `api.ts`, `gamification.ts`
- Providers: PascalCase with "Provider" suffix, e.g., `ProfileProvider.tsx`
- API routes: `route.ts` (Next.js convention)
- Types: Defined in `types.ts` file with PascalCase names

**Directories:**
- Route groups: Parentheses, e.g., `(app)`, `(auth)`, `(marketing)`
- Resources: lowercase, e.g., `tasks`, `focus`, `achievements`
- Sub-resources: lowercase, e.g., `/tasks/toggle`, `/focus/complete`
- Features: lowercase, e.g., `components`, `lib`, `api`

**Functions & Variables:**
- Functions: camelCase, e.g., `awardXp()`, `buildUserContext()`
- Constants: UPPER_SNAKE_CASE, e.g., `XP_VALUES`, `MAX_LEVEL`
- Types: PascalCase, e.g., `UserProfile`, `Task`, `FocusSession`
- Component props: camelCase, e.g., `isRunning`, `onComplete`

**API Routes:**
- Pattern: `api/[resource]/[action]/route.ts`
- Examples:
  - `api/tasks/route.ts` (main CRUD)
  - `api/tasks/toggle/route.ts` (action)
  - `api/focus/complete/route.ts` (state transition)

## Where to Add New Code

**New Feature (e.g., "Daily Goals Reminders"):**
- API endpoint: `app/api/goals/route.ts` (GET/POST for CRUD)
- Components: `app/components/GoalCard.tsx`, `app/components/GoalModal.tsx`
- Business logic: `app/lib/goals.ts` (calculation/validation)
- Provider (if needed): `app/components/GoalProvider.tsx`
- Page: `app/(app)/goals/page.tsx` (feature page)
- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_goals.sql`
- Types: Add to `app/lib/types.ts` (Goal, GoalWithStatus, etc.)

**New Component/Module:**
- Reusable component: `app/components/ComponentName.tsx`
- Feature-specific: `app/components/[feature]/ComponentName.tsx`
- Category folder: Create `app/components/[category]/` if similar components exist
- Export from parent: `app/components/index.ts` for barrel exports (if used)

**Utilities:**
- Shared helpers: `app/lib/feature-name.ts` (e.g., `goals.ts`, `notifications.ts`)
- Date/time helpers: `app/lib/date-utils.ts`
- API utilities: `app/lib/api-utils.ts`
- Constants: `app/lib/constants.ts`
- Type-only file: Add to `app/lib/types.ts`

**Test Files:**
- Co-located: `[source].test.ts` alongside source file
- Example: `app/lib/gamification.test.ts` next to `gamification.ts`
- Future setup: Jest or Vitest config (not currently in place)

## Special Directories

**`app/(app)/`:**
- Purpose: Route group for authenticated pages only
- Generated: No, manually maintained
- Committed: Yes
- Note: Parentheses prevent URL path inclusion; all routes under `/(app)/` are still accessible as `/dashboard`, `/week`, etc.

**`app/(auth)/auth/`:**
- Purpose: Route group for authentication pages
- Generated: No
- Committed: Yes
- Note: Public routes available before authentication

**`app/(marketing)/`:**
- Purpose: Route group for public landing page
- Generated: No
- Committed: Yes
- Note: Separate from authenticated and auth routes

**`.next/`:**
- Purpose: Next.js build output directory
- Generated: Yes, during build
- Committed: No (.gitignore)

**`supabase/migrations/`:**
- Purpose: Database migration version control
- Generated: Manual creation via `npm run db:new`
- Committed: Yes
- Note: Each migration is timestamped and atomic

**`public/`:**
- Purpose: Static assets (images, icons, fonts)
- Generated: No (user-maintained)
- Committed: Yes

---

*Structure analysis: 2026-01-31*
