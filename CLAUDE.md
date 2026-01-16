# Intentionality

A gamified student productivity dashboard ("Personal OS") built with Next.js and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (Google OAuth + email/password)
- **Styling**: Tailwind CSS with CSS custom properties
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Charts**: Recharts (analytics visualizations)

## Project Structure

```
app/
├── (app)/                    # Authenticated app routes
│   ├── page.tsx              # Dashboard (Command Center)
│   ├── layout.tsx            # App layout with providers
│   ├── analytics/            # Analytics dashboard
│   │   └── AnalyticsClient.tsx
│   ├── inbox/                # Brain dump inbox
│   │   └── InboxClient.tsx
│   ├── quests/               # Quests management
│   │   └── QuestsClient.tsx
│   ├── settings/             # Settings & integrations
│   │   └── SettingsClient.tsx
│   └── week/                 # Weekly view
│       └── WeekClient.tsx
├── (auth)/auth/              # Authentication pages
├── api/                      # API routes
│   ├── analytics/            # Aggregated stats for charts
│   ├── brain-dump/           # Brain dump CRUD
│   ├── day-timeline/         # Combined day view data
│   ├── focus/                # Pomodoro focus sessions
│   │   ├── route.ts          # GET/POST
│   │   ├── complete/         # Finish session (awards XP)
│   │   └── abandon/          # Cancel session
│   ├── habits/               # Daily habits
│   │   ├── route.ts          # CRUD
│   │   └── complete/         # Toggle completion
│   ├── integrations/
│   │   └── canvas/           # Canvas LMS integration
│   │       ├── route.ts      # Connection management
│   │       ├── courses/      # Course selection
│   │       └── sync/         # Sync assignments to tasks
│   ├── profile/              # User gamification profile
│   ├── quests/               # Quest CRUD
│   ├── schedule/             # Recurring schedule blocks
│   │   ├── route.ts          # CRUD
│   │   ├── complete/         # Toggle completion
│   │   └── completions/      # Get completions by date
│   └── tasks/                # Task CRUD
│       ├── route.ts          # GET/POST/PATCH/DELETE
│       ├── toggle/           # Toggle completion
│       ├── move/             # Change due date
│       ├── range/            # Date range query
│       └── for-today/        # Today + overdue
├── components/               # UI components
│   ├── BrainDumpModal.tsx    # Quick capture modal (Ctrl+K)
│   ├── BrainDumpProvider.tsx # Global keyboard shortcut
│   ├── CelebrationOverlay.tsx # XP/level-up animations
│   ├── DayTimeline.tsx       # Unified day view (tasks + schedule)
│   ├── FocusProvider.tsx     # Focus session context
│   ├── HabitsClient.tsx      # Habits management
│   ├── ProfileProvider.tsx   # Profile state context
│   ├── QuickActions.tsx      # Dashboard quick action buttons
│   ├── Sidebar.tsx           # Navigation with XP bar
│   ├── ThemeProvider.tsx     # Dark/light mode context
│   ├── charts/               # Analytics chart components
│   │   ├── XpChart.tsx       # XP history area chart
│   │   └── ActivityHeatmap.tsx # GitHub-style activity grid
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
import { formatTime, formatCountdown, getTodayISO, formatDisplayDate } from "@/app/lib/date-utils";

formatTime("14:30")           // "2:30 PM"
formatCountdown(90)           // "01:30"
getTodayISO()                 // "2025-01-16"
formatDisplayDate("2025-01-16") // "Thursday, January 16, 2025"
```

### Brain Dump System

Quick capture via `Ctrl+K` / `Cmd+K` with global provider:

```typescript
import { useBrainDump } from "@/app/components/BrainDumpProvider";

function MyComponent() {
  const { openBrainDump, isOpen } = useBrainDump();

  return <button onClick={openBrainDump}>Quick Capture</button>;
}
```

Brain dump entries are stored in `brain_dump_entries` and can be viewed/converted to tasks in `/inbox`.

### Theme System

Dark/light mode toggle via `ThemeProvider`:

```typescript
import { useTheme } from "@/app/components/ThemeProvider";

function MyComponent() {
  const { theme, toggleTheme } = useTheme();

  return <button onClick={toggleTheme}>{theme === "dark" ? "🌙" : "☀️"}</button>;
}
```

Theme persists to localStorage and respects system preference on first load.

### Celebration System

XP gains and level-ups trigger celebratory animations via `CelebrationProvider`:

```typescript
import { useCelebration } from "@/app/components/CelebrationOverlay";

function MyComponent() {
  const { triggerXp, triggerLevelUp, triggerStreak } = useCelebration();

  // After completing a task:
  triggerXp(25);

  // On level up:
  triggerLevelUp(5);

  // On streak milestone:
  triggerStreak(7);
}
```

## Design System

Anime.js-inspired dark theme (default) with soft peach/cream light theme:

**Dark Theme:**
```css
--bg-base: #000000           /* Pure black background */
--bg-card: #111111           /* Card backgrounds */
--accent-primary: #ef4444    /* Red - main accent */
--accent-highlight: #ebffa5  /* Lime - achievements */
--accent-success: #22c55e    /* Green - completions */
--accent-streak: #f97316     /* Orange - streaks */
```

**Light Theme:**
```css
--bg-base: #f5e9ca           /* Light cream/vanilla */
--bg-card: #edd5a4           /* Light tan/wheat */
--accent-primary: #c76f3b    /* Burnt sienna */
--accent-highlight: #f6bd89  /* Peach */
--accent-success: #6b8e5a    /* Sage green */
--accent-streak: #d4854a     /* Warm amber */
```

**Priority Colors:**
```css
--priority-high: #ef4444     /* Red (dark) / #b85a3a (light) */
--priority-medium: #eab308   /* Yellow (dark) / #c9884d (light) */
--priority-low: #525252      /* Grey (dark) / #8a7355 (light) */
```

**Design patterns:**
- Uppercase headers with accent gradient underlines
- Priority indicated by left border color
- Monospace font for numbers, dates, XP values
- Minimal borders, high contrast
- Mobile-first responsive design

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
| `brain_dump_entries` | Quick capture inbox entries |
| `canvas_connections` | Canvas LMS OAuth credentials |
| `synced_assignments` | Canvas assignment sync tracking |

## Key Features

### Dashboard (Command Center)
- Overview stats with icons (habits, tasks, XP, streak, quests)
- Quick actions bar (Brain Dump, Inbox, Analytics links)
- Focus session launcher with XP preview
- Daily habits management
- Today's timeline (tasks + schedule blocks)

### Brain Dump (`/inbox`)
- Quick capture modal via `Ctrl+K` / `Cmd+K`
- Inbox page to view captured thoughts
- Convert entries to tasks with quest assignment

### Analytics (`/analytics`)
- XP history line chart (30 days)
- GitHub-style activity heatmap
- Completion rate stats
- Focus session trends

### Canvas Integration (`/settings`)
- Connect to Canvas LMS instance
- Select courses to sync
- Auto-import assignments as tasks
- Creates quests per course

### Theme Toggle
- Dark mode (default): Dramatic black with red accents
- Light mode: Soft peach/cream palette
- Toggle in sidebar
- System preference detection

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
