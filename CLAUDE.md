# Intentionality

A gamified student productivity dashboard ("Personal OS") built with Next.js and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (Google OAuth + email/password)
- **Styling**: Tailwind CSS with CSS custom properties
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Project Structure

```
app/
├── (app)/                    # Authenticated app routes
│   ├── page.tsx              # Dashboard (Command Center)
│   ├── layout.tsx            # App layout with ProfileProvider + FocusProvider
│   ├── quests/               # Quests management
│   │   └── QuestsClient.tsx  # Quest CRUD UI
│   └── week/                 # Weekly view
│       └── WeekClient.tsx    # Week calendar UI
├── (auth)/auth/              # Authentication pages
├── api/                      # API routes (16 endpoints)
│   ├── profile/              # User gamification profile
│   ├── quests/               # Quest CRUD
│   ├── tasks/                # Task CRUD
│   │   ├── route.ts          # GET/POST/PATCH/DELETE
│   │   ├── toggle/           # Toggle completion
│   │   ├── move/             # Change due date
│   │   ├── range/            # Date range query
│   │   └── for-today/        # Today + overdue
│   ├── habits/               # Daily habits
│   │   ├── route.ts          # CRUD
│   │   └── complete/         # Toggle completion
│   ├── schedule/             # Recurring schedule blocks
│   │   ├── route.ts          # CRUD
│   │   ├── complete/         # Toggle completion
│   │   └── completions/      # Get completions by date
│   ├── focus/                # Pomodoro focus sessions
│   │   ├── route.ts          # GET/POST
│   │   ├── complete/         # Finish session (awards XP)
│   │   └── abandon/          # Cancel session
│   └── day-timeline/         # Combined day view data
├── components/               # UI components
│   ├── ProfileProvider.tsx   # Profile state context
│   ├── FocusProvider.tsx     # Focus session context
│   ├── Sidebar.tsx           # Navigation with XP bar
│   ├── DayTimeline.tsx       # Unified day view (tasks + schedule)
│   ├── HabitsClient.tsx      # Habits management
│   └── ...                   # Other components
└── lib/
    ├── supabase/             # Supabase client (server + browser)
    ├── auth-middleware.ts    # API route auth helpers
    ├── constants.ts          # Shared constants
    ├── types.ts              # TypeScript types
    ├── gamification.ts       # XP/level calculations
    ├── date-utils.ts         # Date + time formatting
    ├── api.ts                # Fetch wrapper
    └── cn.ts                 # Class name utility
```

## Key Architecture Patterns

### API Route Authentication

All authenticated API routes use the `withAuth` middleware from `lib/auth-middleware.ts`:

```typescript
import { withAuth, parseJsonBody, ApiErrors, successResponse } from "@/app/lib/auth-middleware";

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<MyBody>(request);

  if (!body?.requiredField) {
    return ApiErrors.badRequest("Missing requiredField");
  }

  // RLS automatically filters by user
  const { data, error } = await supabase.from("table").select();

  if (error) return ApiErrors.serverError(error.message);

  return successResponse({ data });
});
```

### Profile State Management

Profile state (XP, level, streak) is managed via React Context. Components use `useProfile()`:

```typescript
import { useProfile } from "@/app/components/ProfileProvider";

function MyComponent() {
  const { profile, loading, refreshProfile } = useProfile();

  async function handleAction() {
    await fetch("/api/some-action");
    refreshProfile(); // Updates sidebar XP immediately
  }

  return <div>Level: {profile?.level}</div>;
}
```

### Shared Constants

Common values are centralized in `lib/constants.ts`:

```typescript
import { PRIORITY_BORDER_COLORS, PRIORITY_LABELS } from "@/app/lib/constants";

// Use in components:
<div className={PRIORITY_BORDER_COLORS[task.priority]}>
  {PRIORITY_LABELS[task.priority]}
</div>
```

### Date/Time Formatting

Use shared formatters from `lib/date-utils.ts`:

```typescript
import { formatTime, formatCountdown, getLocalDateString } from "@/app/lib/date-utils";

formatTime("14:30")       // "2:30 PM"
formatCountdown(90)       // "01:30"
getLocalDateString()      // "2024-01-15"
```

## Design System

Anime.js-inspired dark theme with dramatic contrast:

```css
--bg-base: #000000           /* Pure black background */
--bg-card: #111111           /* Card backgrounds */
--accent-primary: #ef4444    /* Red - main accent */
--accent-highlight: #ebffa5  /* Lime - achievements */
--accent-success: #22c55e    /* Green - completions */
--accent-streak: #f97316     /* Orange - streaks */
--priority-high: #ef4444     /* Red */
--priority-medium: #eab308   /* Yellow */
--priority-low: #6b7280      /* Grey */
```

**Design patterns:**
- Uppercase headers with red gradient underlines
- Priority indicated by left border color (red/yellow/grey)
- Monospace font for numbers, dates, XP values
- Minimal borders, high contrast

## Gamification

- **XP Values** (from `lib/gamification.ts`):
  - Low priority: 5 XP
  - Medium priority: 10 XP
  - High priority: 25 XP
  - Focus sessions: `Math.floor(minutes / 5) * 5` XP

- **Level Formula**: `level = floor(0.5 + sqrt(0.25 + xp/50))`
  - Level 1: 0 XP
  - Level 2: 50 XP
  - Level 5: 500 XP
  - Level 10: 2500 XP

- **Streaks**: Consecutive days with at least one completed task/habit

## Database Tables

All tables use RLS policies scoped to authenticated user.

| Table | Purpose |
|-------|---------|
| `user_profiles` | XP, level, streak, focus stats |
| `quests` | High-level goals (containers for tasks) |
| `tasks` | Individual tasks with due dates |
| `habits` | Daily recurring habits |
| `habit_completions` | Habit completion records by date |
| `schedule_blocks` | Recurring calendar blocks |
| `schedule_block_completions` | Block completions by date |
| `focus_sessions` | Pomodoro timer sessions |

## Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Code Conventions

1. **File Headers**: Each file has a header comment block explaining its purpose
2. **Type Safety**: All API bodies and responses are typed
3. **Error Handling**: Use `ApiErrors` helpers for consistent responses
4. **No Console Logs**: Use error states for user-facing errors
5. **Shared Utilities**: Import from `lib/` rather than duplicating
6. **JSDoc Tags**: `@future` marks code reserved for planned features
