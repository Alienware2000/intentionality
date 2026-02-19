# Intentionality

**Stop procrastinating. Start progressing.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)

Quest-based productivity for students who want to get things done.
Turn your tasks into adventures, earn XP, and build focus habits.

--- 

## Features

- **Quest-Based Tasks** — Organize work under meaningful goals
- **XP & Leveling** — Earn points, level up, unlock achievements
- **Focus Timer** — Pomodoro sessions with XP bonuses
- **Kofi AI Assistant** — Chat-based task management and insights
- **Daily Habits** — Track streaks and build consistency
- **Brain Dump** — Quick capture with Ctrl+K
- **Analytics** — Visualize your productivity patterns
- **Calendar Sync** — Google Calendar, Canvas, ICS feeds

---

## Tech Stack

| Category | Technology | Why |
|----------|------------|-----|
| Framework | Next.js 16 | App Router + Turbopack for fast dev |
| Database | Supabase | PostgreSQL + Auth + Row Level Security |
| Language | TypeScript 5 | Full type safety |
| Styling | Tailwind CSS 4 | Rapid, consistent styling |
| AI (Primary) | Google Gemini | Fast, cost-effective streaming |
| AI (Fallback) | Groq LLaMA | Automatic failover |
| Animations | Framer Motion | Smooth micro-interactions |
| Charts | Recharts | XP history and activity heatmaps |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/intentionality.git
   cd intentionality
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   GEMINI_API_KEY=your_key  # Optional: for AI features
   ```

3. **Set up database**
   ```bash
   npm run db:push
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open** http://localhost:3000

---

## Project Structure

```
app/
├── (app)/          # Authenticated routes (dashboard, analytics, etc.)
├── (auth)/         # Authentication pages
├── api/            # API routes
├── components/     # React components
└── lib/            # Business logic & utilities
```

For detailed architecture, API reference, and database schema, see [CLAUDE.md](./CLAUDE.md).

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

Built with intention by students, for students.
