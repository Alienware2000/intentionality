# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Current Status:**
- **No test framework configured** - No Jest, Vitest, or Mocha setup found
- **No test files in codebase** - No `.test.ts`, `.spec.ts`, or `__tests__/` directories
- **No test scripts** - `package.json` has no `test`, `test:watch`, or `coverage` scripts

**Implications:**
- Codebase relies entirely on type checking (TypeScript strict mode)
- Manual testing and linting via `npm run lint` (ESLint only)
- No automated testing safety net for runtime errors

## Type Safety as Primary Defense

Since no runtime tests exist, the codebase relies heavily on:

**TypeScript Configuration (`tsconfig.json`):**
- Strict mode: `true` - Prevents implicit `any` types, null/undefined issues
- No emit: `true` - Type checking only, reports errors before runtime
- Resolves import paths with `@/*` alias for safety
- Target ES2017 with full DOM/ESNext lib support

**ESLint Configuration (`eslint.config.mjs`):**
- Base: `eslint-config-next/core-web-vitals` - Performance, accessibility, SEO rules
- Base: `eslint-config-next/typescript` - TypeScript-specific lint rules
- Run with: `npm run lint`

## Code Validation Patterns

Since automated tests don't exist, the codebase validates code through:

### Type Safety

**Strict Request/Response Typing:**
All API routes type their inputs and outputs:

```typescript
// Request body typing
type ChatRequestBody = {
  message: string;
  conversationId?: string;
  timezone?: string;
};

const body = await parseJsonBody<ChatRequestBody>(request);
if (!body?.message?.trim()) {
  return ApiErrors.badRequest('message is required');
}
```

**Handler Context Typing:**
```typescript
export type AuthContext = {
  user: User;
  supabase: SupabaseClient;
  request: NextRequest | Request;
};

export type AuthenticatedHandler = (
  ctx: AuthContext
) => Promise<NextResponse | Response> | NextResponse | Response;
```

**Component Props Typing:**
All components have explicit `Props` types:

```typescript
type Props = {
  task: Task;
  onToggle?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  className?: string;
};

export default function TaskCard({ task, onToggle, onEdit, className }: Props) { ... }
```

### Error Handling Validation

**API Error Helper Usage:**
All error conditions return from `ApiErrors` helpers:

```typescript
export const ApiErrors = {
  badRequest: (message: string): NextResponse =>
    NextResponse.json({ ok: false, error: message }, { status: 400 }),

  notFound: (message = "Not found"): NextResponse =>
    NextResponse.json({ ok: false, error: message }, { status: 404 }),

  serverError: (message = "Server error"): NextResponse =>
    NextResponse.json({ ok: false, error: message }, { status: 500 }),
};
```

**Usage Pattern:**
```typescript
export const POST = withAuth(async ({ request }) => {
  const body = await parseJsonBody<CreateTaskBody>(request);
  if (!body?.title) {
    return ApiErrors.badRequest("title is required");
  }

  try {
    const { data, error } = await supabase.from("tasks").insert({ ...body });
    if (error) return ApiErrors.serverError(error.message);
    return successResponse({ data });
  } catch (error) {
    console.error("Failed to create task:", error);
    return ApiErrors.serverError("Failed to create task");
  }
});
```

### Input Validation

**Utility Function Validation:**
```typescript
// api-utils.ts - validates extracted parameters
export function getParamFromUrl(request: Request, segmentName: string): string | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const segmentIndex = pathParts.findIndex((p) => p === segmentName);

  if (segmentIndex >= 0 && pathParts.length > segmentIndex + 1) {
    return pathParts[segmentIndex + 1];
  }

  return null;
}

export function validateMaxLength(
  value: string | undefined | null,
  maxLength: number,
  fieldName: string
): string | null {
  if (value && value.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less`;
  }
  return null;
}
```

## Testing Strategy Recommendations

If tests were to be added, they should follow these patterns:

### Test Framework Choice

**Recommended: Vitest**
- Reason: Native ESM support, TypeScript-first, matches Next.js 16 standards
- Config would go in: `vitest.config.ts`
- Test files: `*.test.ts` or `*.spec.ts` colocated with source

### Suggested Test Structure

**API Route Tests:**
```typescript
// app/api/tasks/route.test.ts (hypothetical)
import { POST } from './route';
import { describe, it, expect, beforeEach } from 'vitest';

describe('POST /api/tasks', () => {
  it('returns 400 if title is missing', async () => {
    const request = new Request('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ priority: 'low' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('creates task and returns 200', async () => {
    // Mock Supabase client
    // Create request with valid body
    // Call handler
    // Assert response shape and data
  });
});
```

**Utility Function Tests:**
```typescript
// app/lib/gamification.test.ts (hypothetical)
import { getLevelFromXp, calculateNewStreak } from './gamification';
import { describe, it, expect } from 'vitest';

describe('gamification utilities', () => {
  it('calculates level from XP correctly', () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(50)).toBe(1);
    expect(getLevelFromXp(2000)).toBe(10);
  });

  it('handles streak calculations correctly', () => {
    const result = calculateNewStreak('2026-01-30', 5, '2026-01-31');
    expect(result.newStreak).toBe(6);
    expect(result.isNewDay).toBe(true);
    expect(result.streakBroken).toBe(false);
  });
});
```

**Component Tests:**
```typescript
// app/components/TaskCard.test.tsx (hypothetical)
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from './TaskCard';
import { describe, it, expect, vi } from 'vitest';

describe('TaskCard', () => {
  it('displays task title and priority', () => {
    const task = { id: '1', title: 'Write proposal', priority: 'high' };
    const onToggle = vi.fn();

    render(<TaskCard task={task} onToggle={onToggle} />);

    expect(screen.getByText('Write proposal')).toBeInTheDocument();
  });

  it('calls onToggle when checkbox is clicked', () => {
    const task = { id: '1', title: 'Write proposal', completed: false };
    const onToggle = vi.fn();

    const { getByRole } = render(<TaskCard task={task} onToggle={onToggle} />);

    fireEvent.click(getByRole('checkbox'));

    expect(onToggle).toHaveBeenCalledWith('1');
  });
});
```

### What Should Be Tested

**High Priority (Core Logic):**
- Gamification calculations: XP award, level progression, streak logic
- AI action parsing: Extracting `[ACTION:...]` tags from responses
- Task completion workflow: Transitions, XP updates, challenge completions
- Auth middleware: JWT validation, 401 handling, retry logic

**Medium Priority (Feature Logic):**
- API validation: Request body parsing, parameter extraction
- Date utilities: ISO date formatting, streak calculation, timeline grouping
- Component interactions: Toggle, modal open/close, form submission
- Hook state: Profile updates, task mutations, celebration triggers

**Lower Priority:**
- UI component rendering: Snapshot tests, className variations
- Animation components: Framer motion state (harder to test, lower value)
- Providers: Context value propagation (can be integration tested)

## Linting & Type Checking

**Current Validation:**
- `npm run lint` - Runs ESLint across all files
- TypeScript compilation: `tsc --noEmit` (implicit when running Next.js)
- Both should be run before committing

**Manual Testing Approach:**
Since automated tests don't exist, follow this manual checklist:

1. **Type Safety:** Verify TypeScript reports no errors
2. **Linting:** Run `npm run lint` with no warnings
3. **Happy Path:** Test main user workflows (create task, complete task, start focus)
4. **Error Cases:** Test invalid inputs (missing fields, network errors)
5. **Edge Cases:** Test boundary conditions (max length, empty arrays, null values)
6. **Integration:** Test across features (task creation → XP → level up)

## Setup for Adding Tests

To add testing to this codebase:

1. **Install Vitest and testing libraries:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui
   ```

2. **Create vitest.config.ts:**
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./vitest.setup.ts'],
     },
   });
   ```

3. **Add test scripts to package.json:**
   ```json
   {
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

4. **Create test files** colocated with source files or in `app/__tests__/` directory

5. **Mock Supabase client** in setup file for API tests:
   ```typescript
   import { vi } from 'vitest';

   global.fetch = vi.fn();
   // Mock createSupabaseServerClient, etc.
   ```

---

*Testing analysis: 2026-01-31*
