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

### Achievement System
Unlock bronze, silver, and gold achievements for reaching milestones. Track progress across categories like Task Master, Habit Builder, and Focus Champion.

### Daily Challenges
Complete 3 daily challenges (easy/medium/hard) for bonus XP. Complete all three for an additional bonus reward.

### Weekly Challenges
Take on weekly goals with progression tracking. Earn 100 XP for completing the weekly challenge.

### Pomodoro Focus Timer
Timed work sessions with flexible durations (5-90 min presets or custom). Earn XP for focused work with bonus rewards for longer sessions.

### Brain Dump
Quick capture via `Ctrl+K` / `Cmd+K`. Capture thoughts instantly and process them later from your inbox.

### Natural Language Input
Create tasks using natural language: "Finish essay tomorrow high priority at 3pm" automatically parses date, time, and priority.

### Daily Habits
Track recurring habits with streak counting and daily completion history.

### Daily Review
Reflect on your day, rate energy and mood, set intentions for tomorrow. Earn 15 XP for completing your daily review.

### Weekly Planning
Set weekly goals and intentions at the start of each week. Earn 25 XP for completing your weekly plan.

### Streak Freezes
Protect your streak on off days. Earn streak freezes through achievements or purchase with XP.

### AI Assistant (Kofi)
Your personal AI-powered productivity assistant. Chat with Kofi to manage tasks, get personalized insights, and process brain dumps automatically.

### Smart Recommendations
Get time-based suggestions for what to focus on next based on your schedule and priorities.

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
| AI (Primary) | Google Gemini 2.5 Flash-Lite (streaming chat, insights) |
| AI (Fallback) | Groq LLaMA 3.3 70B (automatic failover) |
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

   For AI Assistant (Kofi):
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   ```
   Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
   Get your Groq API key from [Groq Console](https://console.groq.com/keys).

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
│   ├── plan/                 # Weekly planning
│   ├── quests/               # Quests management
│   ├── review/               # Daily review
│   ├── settings/             # Settings & integrations
│   └── week/                 # Weekly view
├── (auth)/auth/              # Authentication pages
├── api/                      # API routes
│   ├── achievements/         # Achievement system
│   ├── challenges/           # Daily/weekly challenges
│   ├── daily-review/         # Daily reflection
│   ├── tasks/                # Task CRUD + toggle/move/range
│   ├── quests/               # Quest CRUD
│   ├── habits/               # Habits + completions
│   ├── schedule/             # Schedule blocks + completions
│   ├── focus/                # Pomodoro sessions
│   ├── brain-dump/           # Quick capture
│   ├── analytics/            # Aggregated stats
│   ├── calendar/             # Google Calendar + ICS sync
│   ├── ai/                   # AI assistant (chat, briefing, insights)
│   ├── gamification/         # Full gamification profile
│   ├── streak/               # Streak freeze management
│   ├── weekly-plan/          # Weekly planning
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

<details>
<summary><strong>AI Assistant (Kofi)</strong></summary>

Chat with AI via `Ctrl+Shift+K` or sidebar button:

```typescript
import { useAI } from "@/app/components/AIProvider";

function AIButton() {
  const { openChat, sendMessage } = useAI();
  return <button onClick={openChat}>Ask Kofi</button>;
}
```

</details>

---

## Feature Deep Dive

### Gamification System

#### XP Values
| Action | XP Reward |
|--------|-----------|
| Low priority task | 5 XP |
| Medium priority task | 10 XP |
| High priority task | 25 XP |
| Daily review | 15 XP |
| Weekly planning | 25 XP |
| Focus sessions | ~1 XP per minute + bonuses |

#### Level Formula (V2)
`XP for level = floor(50 * level^1.5)` cumulative per level

| Level | Total XP | Title |
|-------|----------|-------|
| 1 | 0 | Novice |
| 5 | ~900 | Scholar |
| 10 | ~4,250 | Expert |
| 20 | ~20,650 | Grandmaster |
| 50 | ~204,600 | Ascended |

#### Streak Multipliers
| Streak Days | Multiplier |
|-------------|------------|
| 0-2 | 1.0x |
| 3-6 | 1.05x |
| 7-13 | 1.1x |
| 14-29 | 1.2x |
| 30+ | 1.5x |

**Celebrations:** XP gains, level-ups, and streak milestones trigger animated overlays.

### Achievement System

Multi-tier achievements (bronze/silver/gold) with progressive unlocks:
- **Task Master**: Complete tasks (10/50/200)
- **Habit Builder**: Maintain habit streaks (7/30/100 days)
- **Focus Champion**: Complete focus sessions (10/50/200)
- **XP Legend**: Earn total XP (1K/10K/100K)

### Daily Challenges

3 daily challenges refreshed at midnight:
- **Easy**: Quick wins (complete 1 habit, etc.) - 10 XP
- **Medium**: Moderate effort (complete 3 tasks, etc.) - 25 XP
- **Hard**: Stretch goals (45+ min focus, etc.) - 50 XP
- **Bonus**: Complete all 3 for +25 XP extra

### Weekly Challenges

One weekly goal with progression tracking:
- Complete for 100 XP bonus
- Examples: "Complete 20 tasks", "Log 5 hours focus time"

### Task & Quest Management

- **Quests** are containers for related tasks (e.g., "CS 201 Final Project")
- **Tasks** have priority (low/medium/high), due date, and optional scheduled time
- Soft deletion: Completed tasks are hidden but retained; deleting a completed task deducts XP

### Focus Timer (Pomodoro)

- **Preset durations:** 5, 10, 15, 25, 45, 60, 90 minutes
- **Custom duration:** 1-180 min work time, 0-60 min break time
- **Task-specific focus:** Start a focus session directly from any task
- **XP calculation:** Base rate of 0.6 XP per minute + milestone bonuses:
  - 30+ minutes: +5 XP bonus
  - 60+ minutes: +10 XP bonus
  - 90+ minutes: +15 XP bonus
- Abandon without penalty, complete to earn XP
- Work → Break → Claim XP flow

### Habits System

- Daily recurring habits with independent tracking
- Completions recorded per date
- Streak calculation based on consecutive completion days

### Brain Dump

- Global keyboard shortcut: `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- NLP parsing preview shows detected date, time, and priority
- Entries stored in inbox for later processing
- Convert to task: Assign priority, due date, and quest
- **AI Processing**: Click "AI Process" to automatically extract tasks with dates and priorities

### AI Assistant (Kofi)

Your personal AI-powered productivity assistant with dual-provider architecture.

#### Provider Architecture
| Provider | Role | Model |
|----------|------|-------|
| Google Gemini | Primary | Gemini 2.5 Flash-Lite |
| Groq | Fallback | LLaMA 3.3 70B |

Automatic failover ensures Kofi remains available even when one provider is down.

#### Features
| Feature | Description |
|---------|-------------|
| **Chat Interface** | Slide-out panel (`Ctrl+Shift+K`) for conversational task management |
| **AI Briefing** | Personalized daily briefing with AI-generated insights on dashboard |
| **Proactive Insights** | Toast notifications for streak risks, optimal focus times, workload warnings |
| **Brain Dump Processing** | Automatically extract tasks from free-form text with dates and priorities |
| **Context-Aware** | Understands your tasks, habits, streaks, and patterns |
| **Learning System** | Learns your goals, work style, and preferences over time |

#### Learning System
Kofi learns about you through multiple channels:

| Learning Type | Description |
|---------------|-------------|
| **LLM Extraction** | Extracts goals, preferences, and context from your conversations |
| **Explicit Signals** | Parses statements like "My goal is to finish my thesis" |
| **Implicit Signals** | Tracks dismissed insights and advice acceptance rates |
| **Pattern Analysis** | Computes best work times and completion rates from history |

#### Rate Limits
| Limit Type | Value |
|------------|-------|
| Gemini requests | 15/min |
| Groq requests | 30/min |
| Daily chat messages | 50 |
| Daily brain dump processing | 20 |
| Daily proactive insights | 48 |
| Daily briefing requests | 5 |

#### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` | Open/close AI chat panel |
| `Ctrl+K` → "AI Process" | Process brain dump with AI |

#### Chat Commands
Ask Kofi anything about your productivity:
- "What should I focus on today?"
- "Create a task to submit essay by Friday"
- "How's my streak looking?"
- "What's my workload like this week?"

#### Proactive Insight Types
| Type | Trigger |
|------|---------|
| Streak Risk | Evening with no completions and active streak |
| Optimal Focus Time | Your historically productive hours |
| Workload Warning | Too many tasks scheduled |
| Break Reminder | After long focus sessions |
| Progress Celebration | Weekly milestones achieved |

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
- **Daily/Weekly Challenges** - Challenge progress and completion

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

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/chat` | Get conversations list |
| POST | `/api/ai/chat` | Send message (streaming response) |
| DELETE | `/api/ai/chat` | Delete conversation |
| GET | `/api/ai/briefing` | Get AI-generated daily briefing |
| GET | `/api/ai/insights` | Get pending proactive insights |
| POST | `/api/ai/insights` | Generate new insights |
| PATCH | `/api/ai/insights` | Mark insight shown/dismissed |
| POST | `/api/ai/process` | Process brain dump text with AI |
| GET | `/api/ai/context` | Get user context for AI |
| GET | `/api/ai/learn` | Get user learning profile |
| POST | `/api/ai/learn` | Create learning profile |
| PATCH | `/api/ai/learn` | Update learning profile |
| DELETE | `/api/ai/learn` | Delete learning profile |
| POST | `/api/ai/learn/compute` | Trigger pattern computation |

### Achievements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/achievements` | List all achievements with progress |
| POST | `/api/achievements/check` | Check and unlock achievements |

### Challenges

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/challenges/daily` | Get today's daily challenges |
| GET | `/api/challenges/weekly` | Get current weekly challenge |
| POST | `/api/challenges/progress` | Update challenge progress |

### Daily Review & Weekly Planning

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/daily-review` | Submit daily reflection |
| GET | `/api/daily-review/summary` | Get review summary |
| POST | `/api/weekly-plan` | Submit weekly plan |
| GET | `/api/weekly-plan/summary` | Get plan summary |

### Gamification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gamification/profile` | Get full gamification profile |
| POST | `/api/streak/freeze` | Use a streak freeze |
| GET | `/api/activity-log` | Get activity log |

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
| `achievements` | Achievement definitions |
| `user_achievements` | User achievement progress |
| `daily_challenge_templates` | Daily challenge definitions |
| `user_daily_challenges` | User's daily challenges |
| `weekly_challenge_templates` | Weekly challenge definitions |
| `user_weekly_challenges` | User's weekly challenges |
| `user_streak_freezes` | Streak freeze usage |
| `user_activity_log` | Daily activity tracking |
| `daily_reflections` | Daily review entries |
| `weekly_plans` | Weekly planning entries |
| `imported_events` | Calendar imports |
| `ai_conversations` | AI chat conversation threads |
| `ai_messages` | Messages within AI conversations |
| `ai_insights` | Proactive AI-generated insights |
| `user_ai_preferences` | User AI communication preferences |
| `user_learning_profiles` | AI learning: goals, work style, preferences |
| `ai_interaction_outcomes` | Tracks suggestion effectiveness |
| `user_pattern_aggregates` | Computed behavior patterns |
| `ai_briefing_cache` | Cached daily briefings |
| `ai_usage_log` | Daily usage tracking for rate limits |

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
6. **Touch Targets** - Minimum 44px on mobile for accessibility

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the full roadmap.

### Current Focus
- Polish & friction reduction
- Mobile-responsive improvements
- Performance optimizations

### Recently Completed
- AI Assistant (Kofi) with chat, briefing, and proactive insights
- AI-powered brain dump processing
- AI Learning System with LLM-based signal extraction
- Dual-provider AI architecture (Gemini + Groq fallback)
- Rate limiting and usage tracking

### Planned Features
- Background sync for calendar feeds
- CourseTable integration (Yale course schedules)
- Social features (study groups, accountability partners)
- Enhanced AI capabilities (voice input, more actions)

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with intention by students, for students.
