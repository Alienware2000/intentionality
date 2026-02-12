# Intentionality Codebase Cleanup Tracker

**Created:** 2026-02-11
**Purpose:** Track cleanup progress across multiple sessions before public launch
**Status:** 🔄 In Progress

---

## Phase 1: Dead Code Removal (Zero-Risk)

### Unused API Endpoints

| Status | Endpoint | File | Notes |
|--------|----------|------|-------|
| ⬜ | `/api/achievements/check` | `app/api/achievements/check/route.ts` | 0 callers |
| ⬜ | `/api/activity-log` | `app/api/activity-log/route.ts` | 0 callers |
| ⬜ | `/api/schedule/completions` | `app/api/schedule/completions/route.ts` | 0 callers |
| ⬜ | `/api/tasks/from-priorities` | `app/api/tasks/from-priorities/route.ts` | 0 callers |
| ⬜ | `/api/invite` | `app/api/invite/route.ts` | 0 callers |

### Unused Library Files

| Status | File | Notes |
|--------|------|-------|
| ⬜ | `app/lib/social-errors.ts` | Entire file unused (52 lines) |

### Verification Checklist (Phase 1)
- ⬜ `npm run build` passes
- ⬜ `npm run lint` passes
- ⬜ Manual test: Dashboard loads
- ⬜ Manual test: Complete a task
- ⬜ Manual test: Run focus session

---

## Phase 2: Deprecated Function Removal

### gamification.ts (lines 203-258)

| Status | Function | Line | Notes |
|--------|----------|------|-------|
| ⬜ | `getNewStreakMilestone()` | 203-213 | @deprecated - XP transparency redesign |
| ⬜ | `calculateXpWithBonuses()` | 221-243 | @deprecated - XP transparency redesign |
| ⬜ | `getPermanentXpBonus()` | 250-258 | @deprecated - XP transparency redesign |

### challenges.ts

| Status | Item | Line | Notes |
|--------|------|------|-------|
| ⬜ | `DAILY_SWEEP_BONUS` | 20 | @deprecated constant |
| ⬜ | `PERFECT_DAY_BONUS` | 27 | @deprecated constant |
| ⬜ | `FIRST_ACTION_BONUS` | 34 | @deprecated constant |
| ⬜ | `isFirstActionOfDay()` | 442-462 | @deprecated function |
| ⬜ | `checkPerfectDay()` | 469-499 | @deprecated function |

### Verification Checklist (Phase 2)
- ⬜ `npm run build` passes
- ⬜ `npm run lint` passes
- ⬜ Manual test: Complete task (XP awarded correctly)
- ⬜ Manual test: Complete habit
- ⬜ Manual test: Streak updates correctly

---

## Phase 3: Unused Function Cleanup

### Partial File Cleanup

| Status | Function | File | Line | Notes |
|--------|----------|------|------|-------|
| ⬜ | `validateMaxLength()` | `app/lib/api-utils.ts` | 42-51 | Other exports are used |

### Verification Checklist (Phase 3)
- ⬜ `npm run build` passes
- ⬜ `npm run lint` passes

---

## Phase 4: Console Statement Audit

### Files to Review

| Status | File | Issue | Action |
|--------|------|-------|--------|
| ⬜ | `app/lib/ai-router.ts` | 4 console.error calls | Keep (error logging) |
| ⬜ | `app/components/AIProvider.tsx` | ~10 console statements | Review each |
| ⬜ | `app/lib/fetch-with-retry.ts` | 1 console.warn | Keep (debugging) |
| ⬜ | `app/lib/gamification-actions.ts` | console.error | Keep (error logging) |
| ⬜ | `app/lib/challenges.ts` | console.error calls | Keep (error logging) |

### Specific Removals

| Status | File | Line | Statement |
|--------|------|------|-----------|
| ⬜ | `app/components/AIProvider.tsx` | ~526 | `console.log("Insight action:", ...)` - Debug logging to remove |

### Verification Checklist (Phase 4)
- ⬜ `npm run build` passes
- ⬜ Open browser console during normal use - no debug logs

---

## Phase 5: Code Quality Improvements

### TODO Resolution

| Status | File | Line | TODO |
|--------|------|------|------|
| ⬜ | `app/components/AIProvider.tsx` | 437 | "TODO: Implement action execution via API" |

**Decision needed:** Implement missing action execution or remove TODO comment?

### Hardcoded Values

| Status | File | Issue | Recommendation |
|--------|------|-------|----------------|
| ⬜ | `app/lib/fetch-with-retry.ts` | Hardcoded delays (500ms, 100ms) | Extract to constants |
| ⬜ | Various files | Date formatting repeated | Centralize in date-utils.ts |

### Verification Checklist (Phase 5)
- ⬜ `npm run build` passes
- ⬜ `npm run lint` passes
- ⬜ Full regression test of major features

---

## Phase 6: Type Safety Improvements (Optional)

| Status | Area | Issue | Priority |
|--------|------|-------|----------|
| ⬜ | `parseJsonBody<T>` | No runtime validation | Medium |
| ⬜ | AI response types | Loose Record types | Low |
| ⬜ | Error handling | Inconsistent patterns | Low |

---

## Progress Summary

| Phase | Status | Items | Completed |
|-------|--------|-------|-----------|
| 1 - Dead Code | ⬜ Not Started | 6 | 0/6 |
| 2 - Deprecated | ⬜ Not Started | 8 | 0/8 |
| 3 - Unused Functions | ⬜ Not Started | 1 | 0/1 |
| 4 - Console Audit | ⬜ Not Started | 6 | 0/6 |
| 5 - Quality | ⬜ Not Started | 3 | 0/3 |
| 6 - Types | ⬜ Not Started | 3 | 0/3 |

---

## Session Log

### Session 1 (2026-02-11)
- **Actions:** Initial audit and planning
- **Status:** Plan created, CLEANUP.md initialized
- **Next:** Begin Phase 1 execution

---

## Notes

- **DO NOT DELETE:** `/api/daily-review/summary` - Used by ReviewClient.tsx
- **DO NOT DELETE:** `getUsageLevel()` - Used internally by `getUsageColorsFromPercentage()`
- Always run `npm run build` and `npm run lint` after each phase
- Commit after each phase with descriptive message
- Test critical flows: task completion, focus sessions, XP awards
