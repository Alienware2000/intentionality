# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- **API Routes:** `route.ts` in route directories (`/api/[feature]/[action]/route.ts`)
- **Components:** PascalCase with `.tsx` extension (`TaskCard.tsx`, `DayTimeline.tsx`, `ChatPanel.tsx`)
- **Utilities:** camelCase with `.ts` extension (`gamification.ts`, `date-utils.ts`, `cn.ts`)
- **Hooks:** `use` prefix followed by PascalCase (`useCurrentDate.ts`, `useDayTimeline.ts`, `useScrollReveal.ts`)
- **Types:** Defined inline in respective files or exported from `lib/types.ts`

**Functions:**
- Exported utilities: camelCase (`awardXp()`, `parseActionsFromResponse()`, `buildChatSystemPrompt()`, `fetchWithRetry()`)
- Component handlers: camelCase with descriptive action names (`onToggle`, `onEdit`, `onDelete`, `onConfirm`, `onCancel`)
- Helper functions: camelCase prefixed with verb (`calculateNewStreak()`, `formatContextForPrompt()`, `stripActionsFromResponse()`)

**Variables:**
- Constants: UPPER_SNAKE_CASE for immutable values (`XP_VALUES`, `MAX_LEVEL`, `LEVEL_TITLES`, `PLANNING_XP`)
- Object/Array names: camelCase or plural camelCase (`scheduledItems`, `unscheduledTasks`, `providerConfig`)
- Boolean flags: prefixed with `is`, `has`, `should`, or `can` (`isCompleted`, `hasActions`, `isNewDay`, `shouldRefresh`)
- Parameters: camelCase (`questId`, `userId`, `conversationId`, `maxLength`)

**Types:**
- Type names: PascalCase (`Task`, `Quest`, `UserProfile`, `AuthContext`)
- Union types: PascalCase (`Priority`, `QuestType`, `AIFeature`)
- Optional/generic type suffixes: append with descriptive names (`WithStatus`, `WithProgress`, `Body` for request types)
- Request body types: Named `{Feature}Body` or `{Action}Body` (e.g., `ChatRequestBody`, `SkipOnboardingBody`)

## Code Style

**Formatting:**
- ESLint 9 with Next.js rules (`eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`)
- No explicit Prettier config; defaults to ESLint's formatting
- Indentation: 2 spaces (enforced by ESLint)
- Line endings: LF (standard)

**Linting:**
- ESLint configuration: `eslint.config.mjs` (flat config format)
- Base configs: Next.js Core Web Vitals and TypeScript
- Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`
- Run with: `npm run lint`

**TypeScript:**
- Target: ES2017
- Strict mode enabled: `true`
- Path aliases: `@/*` maps to root directory
- JSX: React 19 JSX syntax (`react-jsx`)
- No emit on errors: `noEmit: true` (type checking only, no JS output)

## Import Organization

**Order:**
1. External packages (`next`, `react`, third-party libraries)
2. Type imports from external packages (`import type { ... } from "package"`)
3. Local utility imports from `@/app/lib/`
4. Local type imports from `@/app/lib/types`
5. Local component imports from `@/app/components/`
6. Asset imports (CSS, images)

**Path Aliases:**
- `@/` resolves to project root (`/app/`)
- Always use `@/app/lib/` for utilities and types
- Always use `@/app/components/` for component imports
- Never use relative paths like `../../../lib`

**Example:**
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { withAuth, ApiErrors } from "@/app/lib/auth-middleware";
import { parseJsonBody } from "@/app/lib/auth-middleware";
import { useProfile } from "./ProfileProvider";
import { cn } from "@/app/lib/cn";
```

## Error Handling

**Patterns:**
- **API Errors:** Use `ApiErrors` helper from `auth-middleware.ts`
  - `ApiErrors.badRequest(message)` → 400 status
  - `ApiErrors.notFound(message)` → 404 status
  - `ApiErrors.serverError(message)` → 500 status
- **Network Errors:** Use try/catch, log with `console.error()`, return appropriate error response
- **Validation:** Check falsy conditions early; return error before continuing
- **Async Errors:** Wrap async operations in try/catch for Supabase and API calls

**Example:**
```typescript
export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<CreateTaskBody>(request);
  if (!body?.title) {
    return ApiErrors.badRequest("title is required");
  }

  try {
    const { data, error } = await supabase.from("tasks").insert({ ...body, user_id: user.id });
    if (error) return ApiErrors.serverError(error.message);
    return successResponse({ data });
  } catch (error) {
    console.error("Failed to create task:", error);
    return ApiErrors.serverError("Failed to create task");
  }
});
```

**Special Case - 401 Retries:** Use `fetchWithRetry()` wrapper for client-side API calls to handle token refresh race conditions.

## Logging

**Framework:** `console` object (no structured logger)

**Patterns:**
- **Errors:** `console.error("Context:", error)` - Always include context describing what failed
- **Warnings:** `console.warn("Context:", error)` - For recoverable issues or retry attempts
- **Info:** Rarely used; prefer silent success when possible
- **No debug logs:** Remove or comment out verbose logs before committing

**Examples:**
```typescript
console.error("Supabase auth network error:", error);
console.warn("Fetch failed, retrying once:", error);
console.error('Failed to create conversation:', convError);
```

## Comments

**When to Comment:**
- **File Headers:** Every file starts with a header explaining its purpose using `=` dividers
- **Section Dividers:** Separate major sections with dividers for readability
- **Complex Logic:** Explain "why" not "what" when logic is non-obvious
- **LEARNING:** Use `LEARNING:` prefix for educational comments explaining design decisions
- **Gotchas:** Mark known limitations or edge cases with context

**Example:**
```typescript
// =============================================================================
// AUTHENTICATION MIDDLEWARE
// Provides a standardized way to protect API endpoints and access user data.
// =============================================================================

// Note: Using getUser() instead of getSession() for security
const { data: { user }, error: authError } = await supabase.auth.getUser();

// LEARNING: Streaming vs Standard Responses
// Most endpoints return NextResponse, but streaming endpoints need ReadableStream
```

**JSDoc/TSDoc:**
- Used sparingly for public APIs and exported functions
- Include `@param`, `@returns`, `@example` tags for clarity
- Type information is preferred over verbose descriptions

**Example:**
```typescript
/**
 * Wraps an API route handler with authentication.
 * Verifies the user is authenticated before calling the handler.
 *
 * @param handler - The route handler to wrap
 * @returns A function that handles the request with auth check
 */
export function withAuth(handler: AuthenticatedHandler) { ... }
```

## Function Design

**Size:**
- Functions should be focused and single-purpose
- Average size: 20-50 lines for utilities, 10-30 lines for hooks
- Complex operations broken into helper functions

**Parameters:**
- Prefer objects over multiple positional arguments
- Use destructuring in function signatures: `({ userId, baseXp, actionType })`
- Provide type definitions for all parameters
- Use optional fields with `?` for non-required parameters

**Return Values:**
- Return typed objects for multiple values: `{ success, message, data }`
- Use discriminated unions for complex return types
- Return null/undefined only for optional values (not for error cases—use ApiErrors instead)
- Async functions always return typed Promises

**Example:**
```typescript
export async function awardXp(options: AwardXpOptions): Promise<XpAwardResult> {
  const { supabase, userId, baseXp, actionType, isHighPriority = false } = options;
  // ...
  return { xpAwarded, newLevel, leveledUp, achievementsUnlocked };
}
```

## Module Design

**Exports:**
- Named exports for all public APIs (no default exports for utilities)
- Type exports with `export type` prefix
- Group related functions/types in same module
- Use barrel files (index.ts) only for component directories

**Example:**
```typescript
// ✓ Good
export type AuthContext = { ... };
export const ApiErrors = { ... };
export function withAuth(handler) { ... };
export async function parseJsonBody(request) { ... };

// ✗ Avoid
export default withAuth; // No default exports for utilities
```

**Barrel Files:**
- Used in component directories: `app/components/[Feature]/index.tsx`
- Not used in utility directories; import directly from files
- Keep barrel files minimal; just re-export main component

## React Patterns

**Components:**
- All interactive components: `"use client"` at top
- Server components: No directive (default)
- Props type: Use inline `type Props = {}` (not interface)
- Component naming: PascalCase function export

**Example:**
```typescript
"use client";

import { motion } from "framer-motion";

type Props = {
  task: Task;
  onToggle?: (taskId: string) => void;
  className?: string;
};

export default function TaskCard({ task, onToggle, className }: Props) {
  // ...
}
```

**Hooks:**
- Custom hooks in `app/lib/hooks/`
- All custom hooks are client components (`"use client"`)
- Hook names follow `use{Feature}` pattern
- Return typed objects for multiple values
- Document with JSDoc including `@example`

**Providers:**
- Context providers in `app/components/[ProviderName].tsx`
- Always have `use{Provider}` hook export
- Hook returns typed context data
- Type: `const { ... } = use{Provider}()` in consuming components

## State Management

**Approach:**
- React Context for global state (ProfileProvider, FocusProvider, AIProvider)
- Local component state with `useState` for UI state
- Optimistic updates: update UI immediately, sync to backend after
- Call `refreshProfile()` after mutations that affect gamification stats

**Pattern:**
```typescript
// Local update immediately
setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));

// Sync to backend
await toggleTaskApi(taskId);

// Refresh profile if XP/level changed
refreshProfile();
```

## File Headers

Every file must start with a header comment block explaining its purpose:

```typescript
// =============================================================================
// [FILENAME]
// Brief description of what this file does.
// [Optional additional context about key responsibilities]
// =============================================================================
```

---

*Convention analysis: 2026-01-31*
