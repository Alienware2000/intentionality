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
├── (app)/              # Authenticated app routes
│   ├── page.tsx        # Dashboard (Command Center)
│   ├── quests/         # Quests management
│   └── week/           # Weekly view
├── (auth)/auth/        # Authentication pages
├── api/                # API routes
│   ├── profile/        # User gamification profile
│   ├── quests/         # Quest CRUD
│   └── tasks/          # Task CRUD, toggle, move, range queries
├── components/         # Reusable components
│   ├── Sidebar.tsx     # Navigation with XP bar
│   ├── TaskCard.tsx    # Task item with priority
│   ├── StatCard.tsx    # Stats display
│   ├── XpBar.tsx       # XP progress bar
│   └── StreakBadge.tsx # Streak indicator
└── lib/
    ├── supabase/       # Supabase client (server + browser)
    ├── types.ts        # TypeScript types
    ├── gamification.ts # XP/level calculations
    ├── date-utils.ts   # Date helpers
    ├── api.ts          # Fetch wrapper
    └── cn.ts           # Class name utility
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
```

**Design patterns:**
- Uppercase headers with red gradient underlines
- Priority indicated by left border color (red/yellow/grey)
- Monospace font for numbers, dates, XP values
- Minimal borders, high contrast

## Gamification

- **XP**: Awarded on task completion (5/10/25 for low/medium/high priority)
- **Levels**: Quadratic scaling - `level = floor(0.5 + sqrt(0.25 + xp/50))`
- **Streaks**: Consecutive days with completed tasks

## Database Tables

- `quests` - High-level goals (user_id, title)
- `tasks` - Individual tasks (quest_id, title, due_date, priority, xp_value, completed)
- `user_profiles` - Gamification data (xp_total, level, current_streak, longest_streak)

All tables use RLS policies scoped to authenticated user.

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
