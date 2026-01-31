# Technology Stack

**Analysis Date:** 2026-01-31

## Languages

**Primary:**
- TypeScript 5 - All application code, type-safe development
- JavaScript (ES2017 target) - Runtime compilation target

**Configuration:**
- Node.js compatible - Configured for ES2017 with JSX support

## Runtime

**Environment:**
- Node.js (latest stable) - Server runtime for Next.js

**Package Manager:**
- npm - Project uses npm
- Lockfile: npm-shrinkwrap/package-lock (present via git)

## Frameworks

**Core:**
- Next.js 16.1.0 - Full-stack React framework with App Router
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- PostCSS with @tailwindcss/postcss 4 - CSS processing pipeline

**State Management & Provider Patterns:**
- React Context API - Global state (ProfileProvider, FocusProvider, BrainDumpProvider, AIProvider, ThemeProvider, CelebrationProvider, OnboardingProvider)

**Animation:**
- Framer Motion 12.26.2 - React animation library
- Anime.js 3.2.2 - JavaScript animation engine
- Lucide React 0.562.0 - Icon library

**Data Visualization:**
- Recharts 3.6.0 - React charting library

**Utilities:**
- clsx 2.1.1 - Conditional class name combining
- tailwind-merge 3.4.0 - Tailwind class conflict resolution

## Databases & Data

**Primary Database:**
- Supabase (PostgreSQL) - Production database
- PostgreSQL 17 - Database engine (configured in supabase/config.toml)
- Row Level Security (RLS) - All tables scoped to authenticated users

**Supabase Clients:**
- @supabase/supabase-js 2.90.1 - Browser/client-side SDK
- @supabase/ssr 0.8.0 - Server-side authentication with Next.js cookie handling

**Database Schema:**
Located in `supabase/migrations/` with tables for:
- User authentication (via Supabase Auth)
- Tasks and quests
- Habits and focus sessions
- Gamification (XP, levels, streaks, achievements)
- Calendar integrations (ICS subscriptions, Google Calendar OAuth)
- Brain dump entries
- AI conversations and learning profiles
- Social features (friends, groups, leaderboards)

## Development Tools

**Linting:**
- ESLint 9 - Code quality enforcement
- eslint-config-next 16.1.0 - Next.js-specific ESLint configuration

**Type Checking:**
- TypeScript 5 - Static type checking (strict mode enabled)

**Build & Dev Server:**
- Turbopack (Next.js bundler) - Fast development and production builds
- Dev Server: `npm run dev` runs with --turbo flag for faster bundling

## Build Configuration

**Next.js Config:** `next.config.ts` (minimal, standard configuration)

**TypeScript Config:** `tsconfig.json`
- Target: ES2017
- Module: ESNext
- Strict mode: Enabled
- Path aliases: `@/*` maps to root directory
- JSX: react-jsx (automatic JSX transform)

**PostCSS Config:** `postcss.config.mjs`
- Uses @tailwindcss/postcss plugin

## Environment Configuration

**Environment Variables (Public):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (exposed to client)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (safe for client)

**Environment Variables (Private - Server Only):**
- `GEMINI_API_KEY` - Google Gemini 2.5 Flash-Lite API key
- `GROQ_API_KEY` - Groq LLaMA 3.3 70B API key
- `SUPABASE_ACCESS_TOKEN` - CLI authentication for database migrations

**Configuration Files:**
- `.env` - Base environment variables
- `.env.local` - Local overrides (git-ignored)
- `supabase/config.toml` - Supabase CLI configuration

## Platform Requirements

**Development:**
- Node.js with npm
- Supabase CLI v2.72.7 (for database migrations and local dev)
- Modern browser (Chrome, Firefox, Safari, Edge)

**Production:**
- Deployment target: Vercel (Next.js native) or any Node.js hosting
- PostgreSQL 17 compatible database (via Supabase)

## Key Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.0 | Framework |
| react | 19.2.3 | UI library |
| react-dom | 19.2.3 | DOM rendering |
| typescript | 5 | Type safety |
| tailwindcss | 4 | Styling |
| @supabase/supabase-js | 2.90.1 | Database client |
| @supabase/ssr | 0.8.0 | Auth middleware |
| framer-motion | 12.26.2 | Animations |
| recharts | 3.6.0 | Charts |
| animejs | 3.2.2 | JavaScript animations |
| lucide-react | 0.562.0 | Icons |

## Database Access Pattern

**Server-side (Route Handlers, Server Components):**
- Uses `createSupabaseServerClient()` from `app/lib/supabase/server.ts`
- Handles cookie-based JWT authentication via Next.js middleware

**Client-side (Browser Components):**
- Uses browser client from `app/lib/supabase/client.ts`
- Uses @supabase/ssr for session management

**Authentication Flow:**
- Supabase Auth handles JWT tokens
- Middleware in `app/lib/supabase/middleware.ts` manages token refresh
- RLS policies enforce row-level security on all tables

---

*Stack analysis: 2026-01-31*
