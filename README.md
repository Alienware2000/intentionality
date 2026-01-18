# Intentionality

**A Gamified Student Productivity Dashboard**

Your personal operating system for academic success. Intentionality combines quest-based task management, XP progression, focus timers, and calendar integrations into a unified productivity experience.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Feature Deep Dive](#feature-deep-dive)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Design System](#design-system)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### Quest-Based Task Management
Organize tasks under high-level goals (quests). Track progress, prioritize work, and see the bigger picture.

### Gamification System
Earn XP for completing tasks, maintain streaks, level up, and celebrate achievements with animated overlays.

### Pomodoro Focus Timer
Timed work sessions with configurable durations. Earn XP for focused work (0.6 XP per minute).

### Brain Dump
Quick capture via `Ctrl+K` / `Cmd+K`. Capture thoughts instantly and process them later from your inbox.

### Daily Habits
Track recurring habits with streak counting and daily completion history.

### Analytics Dashboard
Visualize your productivity with XP history charts and GitHub-style activity heatmaps.

### Calendar Integration
Import events from Google Calendar (OAuth), Canvas LMS, Outlook, and any ICS feed. Smart import modes for tasks vs schedule blocks.

### Dual Themes
Dark mode (anime-inspired black with red accents) and light mode (warm cream/peach palette).

---

## Screenshots

<!-- Add screenshots of key screens here -->
<!-- Recommended screens: Dashboard, Analytics, Week View, Focus Timer, Settings -->

```
Screenshots coming soon...
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (PostgreSQL with Row Level Security) |
| Auth | Supabase Auth (Google OAuth + Email/Password) |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Language | TypeScript 5 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase account ([supabase.com](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/intentionality.git
   cd intentionality
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   For Google Calendar integration (optional):
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

4. **Set up the database**

   Run migrations to create the required tables:
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Architecture

### Directory Structure

```
app/
├── (app)/                    # Authenticated app routes
│   ├── page.tsx              # Dashboard (Command Center)
│   ├── analytics/            # Analytics dashboard
│   ├── inbox/                # Brain dump inbox
│   ├── quests/               # Quests management
│   ├── settings/             # Settings & integrations
│   └── week/                 # Weekly view
├── (auth)/auth/              # Authentication pages
├── api/                      # API routes
│   ├── tasks/                # Task CRUD + toggle/move/range
│   ├── quests/               # Quest CRUD
│   ├── habits/               # Habits + completions
│   ├── schedule/             # Schedule blocks + completions
│   ├── focus/                # Pomodoro sessions
│   ├── brain-dump/           # Quick capture
│   ├── analytics/            # Aggregated stats
│   ├── calendar/             # Google Calendar + ICS sync
│   └── profile/              # User profile + gamification
├── components/               # React components
└── lib/                      # Utilities and helpers
```

### Key Patterns

<details>
<summary><strong>API Route Authentication</strong></summary>

All authenticated API routes use the `withAuth` middleware:

```typescript
import { withAuth, ApiErrors, successResponse } from "@/app/lib/auth-middleware";

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await request.json();

  // RLS automatically filters by user
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...body, user_id: user.id });

  if (error) return ApiErrors.serverError(error.message);
  return successResponse({ data });
});
```

</details>

<details>
<summary><strong>Profile State Management</strong></summary>

Profile state (XP, level, streak) is managed via React Context:

```typescript
import { useProfile } from "@/app/components/ProfileProvider";

function MyComponent() {
  const { profile, refreshProfile } = useProfile();

  async function handleTaskComplete() {
    await fetch("/api/tasks/toggle", { method: "POST", body: ... });
    refreshProfile(); // Updates sidebar XP immediately
  }
}
```

</details>

<details>
<summary><strong>Theme System</strong></summary>

Dark/light mode via `ThemeProvider`:

```typescript
import { useTheme } from "@/app/components/ThemeProvider";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme === "dark" ? "🌙" : "☀️"}</button>;
}
```

</details>

<details>
<summary><strong>Brain Dump Global Shortcut</strong></summary>

Quick capture via `Ctrl+K` / `Cmd+K`:

```typescript
import { useBrainDump } from "@/app/components/BrainDumpProvider";

function QuickActions() {
  const { openBrainDump } = useBrainDump();
  return <button onClick={openBrainDump}>Quick Capture</button>;
}
```

</details>

---

## Feature Deep Dive

### Gamification System

| Priority | XP Reward |
|----------|-----------|
| Low | 5 XP |
| Medium | 10 XP |
| High | 25 XP |

**Level Formula:** `level = floor(0.5 + sqrt(0.25 + xp/50))`

| Level | Total XP Required |
|-------|-------------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 300 |
| 5 | 1,000 |
| 10 | 4,500 |

**Streaks:** Consecutive days with at least one completed task or habit. Streaks reset if you miss a day.

**Celebrations:** XP gains, level-ups, and streak milestones trigger animated overlays.

### Task & Quest Management

- **Quests** are containers for related tasks (e.g., "CS 201 Final Project")
- **Tasks** have priority (low/medium/high), due date, and optional scheduled time
- Soft deletion: Completed tasks are hidden but retained; deleting a completed task deducts XP

### Focus Timer (Pomodoro)

- Configurable durations: 15, 25, 45, 60, 90 minutes
- XP calculation: `Math.round(minutes * 0.6)` (e.g., 25 min = 15 XP)
- Abandon without penalty, complete to earn XP
- Work mode only (break timer coming soon)

### Habits System

- Daily recurring habits with independent tracking
- Completions recorded per date
- Streak calculation based on consecutive completion days

### Brain Dump

- Global keyboard shortcut: `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- Entries stored in inbox for later processing
- Convert to task: Assign priority, due date, and quest

### Calendar Integration

| Source | Method | Features |
|--------|--------|----------|
| Google Calendar | OAuth | Full sync, calendar selection |
| Canvas LMS | ICS Feed | Import assignments as tasks |
| Outlook/365 | ICS Feed | Published calendar import |
| Any Calendar | ICS File | Upload .ics file |

**Import Modes:**
- **Tasks** - Import as tasks with due dates
- **Schedule Blocks** - Import as calendar blocks
- **Smart** - Auto-detect based on event type

### Analytics

- **XP History Chart** - 30-day area chart showing daily XP earned
- **Activity Heatmap** - GitHub-style grid showing completion activity
- **Completion Stats** - Tasks, habits, and focus session metrics

---

## API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks` | Update task |
| DELETE | `/api/tasks` | Delete task |
| POST | `/api/tasks/toggle` | Toggle completion (awards/deducts XP) |
| POST | `/api/tasks/move` | Change due date |
| GET | `/api/tasks/for-today` | Today's tasks + overdue |
| GET | `/api/tasks/range` | Tasks in date range |
| POST | `/api/tasks/restore` | Restore deleted task |

### Quests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quests` | List all quests |
| POST | `/api/quests` | Create quest |
| PATCH | `/api/quests` | Update quest |
| DELETE | `/api/quests` | Delete quest |

### Habits

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | List habits with today's completion |
| POST | `/api/habits` | Create habit |
| PATCH | `/api/habits` | Update habit |
| DELETE | `/api/habits` | Delete habit |
| POST | `/api/habits/complete` | Toggle daily completion |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule` | List schedule blocks |
| POST | `/api/schedule` | Create block |
| PATCH | `/api/schedule` | Update block |
| DELETE | `/api/schedule` | Delete block |
| POST | `/api/schedule/complete` | Toggle daily completion |
| GET | `/api/schedule/completions` | Get completions by date |

### Focus

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/focus` | Get active session |
| POST | `/api/focus` | Start session |
| POST | `/api/focus/complete` | Complete session (awards XP) |
| POST | `/api/focus/abandon` | Cancel session |

### Brain Dump

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brain-dump` | List inbox entries |
| POST | `/api/brain-dump` | Create entry |
| DELETE | `/api/brain-dump` | Delete entry |

### Profile & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| GET | `/api/analytics` | Aggregated stats for charts |
| GET | `/api/day-timeline` | Combined day view data |

### Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar/google` | Check connection status |
| DELETE | `/api/calendar/google` | Disconnect |
| GET | `/api/calendar/google/auth` | Start OAuth flow |
| GET | `/api/calendar/google/callback` | OAuth callback |
| GET | `/api/calendar/google/calendars` | List available calendars |
| POST | `/api/calendar/google/sync` | Sync events |
| POST | `/api/calendar/upload` | Upload ICS file |
| POST | `/api/calendar/subscriptions` | Add feed URL |
| POST | `/api/calendar/sync` | Sync all feeds |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `user_profiles` | XP, level, streak, focus statistics |
| `quests` | High-level goals (task containers) |
| `tasks` | Individual tasks with due dates |
| `habits` | Daily recurring habits |
| `habit_completions` | Habit completion records by date |
| `schedule_blocks` | Recurring calendar blocks |
| `schedule_block_completions` | Block completions by date |
| `focus_sessions` | Pomodoro timer sessions |
| `brain_dump_entries` | Quick capture inbox entries |
| `google_calendar_connections` | Google OAuth credentials |
| `calendar_subscriptions` | ICS feed URLs |

All tables use Row Level Security (RLS) policies scoped to the authenticated user.

---

## Design System

### Color Palette

<details>
<summary><strong>Dark Theme (Default)</strong></summary>

```css
--bg-base: #000000           /* Pure black background */
--bg-card: #111111           /* Card backgrounds */
--accent-primary: #ef4444    /* Red - main accent */
--accent-highlight: #ebffa5  /* Lime - achievements */
--accent-success: #22c55e    /* Green - completions */
--accent-streak: #f97316     /* Orange - streaks */
```

</details>

<details>
<summary><strong>Light Theme</strong></summary>

```css
--bg-base: #f5e9ca           /* Light cream/vanilla */
--bg-card: #edd5a4           /* Light tan/wheat */
--accent-primary: #c76f3b    /* Burnt sienna */
--accent-highlight: #f6bd89  /* Peach */
--accent-success: #6b8e5a    /* Sage green */
--accent-streak: #d4854a     /* Warm amber */
```

</details>

### Priority Colors

| Priority | Dark Theme | Light Theme |
|----------|------------|-------------|
| High | `#ef4444` (Red) | `#b85a3a` (Terra cotta) |
| Medium | `#eab308` (Yellow) | `#c9884d` (Gold) |
| Low | `#525252` (Grey) | `#8a7355` (Taupe) |

### Typography

- **Primary Font:** Geist Sans (via `next/font`)
- **Monospace:** Geist Mono (for numbers, dates, XP values)

### Design Patterns

- Uppercase headers with accent gradient underlines
- Priority indicated by left border color
- Minimal borders, high contrast
- Mobile-first responsive design
- Framer Motion for micro-interactions

---

## Development

### Available Scripts

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint

# Database commands (requires Supabase CLI)
npm run db:new     # Create new migration
npm run db:push    # Push migrations to database
npm run db:pull    # Pull remote schema
npm run db:status  # List migration status
npm run db:reset   # Reset database (destructive)
```

### Code Conventions

1. **File Headers** - Each file has a header comment explaining its purpose
2. **Type Safety** - All API bodies and responses are typed
3. **Error Handling** - Use `ApiErrors` helpers for consistent responses
4. **Shared Utilities** - Import from `lib/` rather than duplicating
5. **No Console Logs** - Use error states for user-facing errors

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full roadmap.

### Current Focus
- Polish & friction reduction
- Mobile-responsive improvements
- Better onboarding flow

### Planned Features
- Background sync for calendar feeds
- CourseTable integration (Yale course schedules)
- Social features (study groups, accountability partners)
- AI-powered brain dump processing

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with intention by students, for students.
