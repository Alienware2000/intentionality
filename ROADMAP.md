# Intentionality Roadmap

> A Yale-focused productivity tool that integrates with the university ecosystem to become genuinely useful for students.

## Vision

Transform Intentionality from a generic gamified productivity app into **the** productivity tool Yale students actually use - by deeply integrating with Yale's academic infrastructure and solving problems no other tool solves.

---

## Current State (January 2025)

### What We Have
- Clean Next.js 16 architecture with Supabase backend
- User authentication (Google OAuth + email)
- Gamification system (XP, levels, streaks)
- Task management with priorities and due dates
- Habits tracking with daily completions
- Schedule blocks for recurring events
- Pomodoro focus timer with XP rewards
- Anime-inspired dark theme UI

### What's Missing for Real Adoption
- **High friction** - All data entry is manual
- **No integrations** - It's an island, doesn't connect to anything students already use
- **No Yale-specific value** - Could be for anyone, which means it's for no one
- **No social layer** - Solo productivity apps have terrible retention

---

## The Yale Advantage

Generic productivity app = competing with Notion, Todoist, Habitica, etc.

**Yale-specific productivity tool** = solving problems no one else is solving.

### Target Integration Points
1. **Canvas** - Assignment sync (highest impact)
2. **CourseTable** - Schedule import
3. **Yale CAS** - Native authentication
4. **Yale Calendar** - Academic deadlines

---

## Canvas LMS API Integration

### Overview
Canvas has a comprehensive REST API that allows students to access their own data with a personal access token.

### Key Endpoints for Intentionality

```
GET /api/v1/courses
- List all enrolled courses
- Returns: course_id, name, course_code, term

GET /api/v1/courses/:course_id/assignments
- List all assignments for a course
- Returns: id, name, description, due_at, points_possible, submission_types

GET /api/v1/users/:user_id/courses/:course_id/assignments
- Assignments with submission status
- Shows: submitted, graded, missing, late

GET /api/v1/calendar_events
- Calendar events across courses
- Includes: assignments, events, due dates
```

### Authentication Options

#### Option 1: Personal Access Token (Simplest)
- Students generate token in Canvas Settings > Approved Integrations
- Token stored securely in Intentionality
- Pros: Simple, no OAuth setup needed
- Cons: Manual setup, tokens expire (required for students)

#### Option 2: OAuth2 Developer Key (Better UX)
- Requires approval from Yale ITS
- Users click "Connect Canvas" and authorize
- Pros: Better UX, automatic token refresh
- Cons: Requires institutional approval

### Implementation Plan

#### Phase 1: Personal Access Token Flow
```typescript
// User settings page
1. User goes to Settings > Integrations
2. Instructions to get Canvas token:
   - Go to canvas.yale.edu
   - Account > Settings > Approved Integrations
   - Generate new token
   - Paste into Intentionality
3. Store encrypted token in user_profiles table
4. Test connection and show enrolled courses
```

#### Phase 2: Assignment Sync
```typescript
// Sync logic
1. Fetch all active courses
2. For each course, fetch assignments
3. Filter to assignments with due dates in future
4. Map to Intentionality task format:
   - name → task title
   - due_at → due_date
   - course_name → quest (auto-create)
   - points_possible → priority heuristic (high points = high priority)
5. Create/update tasks, avoiding duplicates (track canvas_assignment_id)
6. Mark as completed when Canvas shows submitted
```

#### Phase 3: Automatic Sync
- Background job syncs every 6 hours
- Push notification when new assignments detected
- Option for manual "Sync Now" button

### Database Schema Additions

```sql
-- Add to user_profiles
ALTER TABLE user_profiles ADD COLUMN canvas_token_encrypted TEXT;
ALTER TABLE user_profiles ADD COLUMN canvas_token_expires_at TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN canvas_last_sync TIMESTAMP;

-- Track Canvas-sourced tasks
ALTER TABLE tasks ADD COLUMN canvas_assignment_id TEXT;
ALTER TABLE tasks ADD COLUMN canvas_course_id TEXT;
ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'manual'; -- 'manual' | 'canvas'

-- Track courses as quests
ALTER TABLE quests ADD COLUMN canvas_course_id TEXT;
ALTER TABLE quests ADD COLUMN source TEXT DEFAULT 'manual';
```

### Yale Canvas Specifics
- Yale Canvas URL: `canvas.yale.edu`
- API Base: `https://canvas.yale.edu/api/v1/`
- Yale ITS contact for OAuth approval: [Yale API Portal](https://developers.yale.edu/)

### Resources
- [Canvas REST API Documentation](https://canvas.instructure.com/doc/api/)
- [Assignments API](https://canvas.instructure.com/doc/api/assignments.html)
- [Canvas Student Token Management](https://community.canvaslms.com/t5/Student-Guide/How-do-I-manage-API-access-tokens-as-a-student/ta-p/273)
- [Yale API Portal](https://developers.yale.edu/)

---

## CourseTable Integration

### Overview
CourseTable is the de-facto course planning tool for Yale students. Integrating with it would allow schedule import and potentially collaboration.

### API Access
- Undocumented API at `api.coursetable.com`
- Catalog data: `https://api.coursetable.com/api/static/catalogs/{termCode}.json`
- Requires CourseTable login for full access
- Open source: [github.com/coursetable/coursetable](https://github.com/coursetable/coursetable)

### Integration Ideas
1. **Import schedule from CourseTable worksheet**
2. **Link courses to CourseTable for reviews/info**
3. **Shopping period planning tools**

### Approach
- Reach out to CourseTable team (they're students too)
- Propose collaboration or API partnership
- Could potentially become an "official" CourseTable companion tool

### Contact
- GitHub: [github.com/coursetable](https://github.com/coursetable)
- Yale Computer Society: [yalecomputersociety.org](https://yalecomputersociety.org)

---

## Yale-Specific Features

### Academic Calendar Integration
- Credit/D/Fail deadline reminders
- Add/drop deadline tracking
- Reading period optimization
- Finals schedule planning

### Shopping Period Tools
- Track courses you're shopping
- Compare time conflicts
- Quick notes on first impressions
- Decision deadline countdown

### Study Features
- Finals week scheduler (allocate study time by exam weight)
- Reading period planner
- Problem set collaboration finder

---

## Social/Accountability Layer (Future)

### Ideas
- Study groups by course
- "Who's studying now" presence
- Accountability partners
- Course-specific leaderboards (opt-in)
- Streak competitions with friends

### Privacy Considerations
- All social features opt-in
- No public grade/performance data
- Focus on presence and accountability, not competition

---

## Technical Roadmap

### Phase 1: Foundation (Current → 2 weeks)
- [ ] Polish current features based on personal use
- [ ] Fix any bugs from daily usage
- [ ] Add Canvas integration settings page UI
- [ ] Implement Canvas token storage (encrypted)

### Phase 2: Canvas MVP (2-4 weeks)
- [ ] Canvas connection flow
- [ ] Fetch and display courses
- [ ] Sync assignments as tasks
- [ ] Auto-create course quests
- [ ] Manual sync button
- [ ] Track canvas_assignment_id to prevent duplicates

### Phase 3: Smart Sync (4-6 weeks)
- [ ] Automatic background sync
- [ ] Detect assignment updates
- [ ] Mark tasks complete when submitted in Canvas
- [ ] Sync notifications

### Phase 4: Yale Ecosystem (6-10 weeks)
- [ ] CourseTable outreach and potential integration
- [ ] Yale CAS authentication option
- [ ] Academic calendar integration
- [ ] Shopping period features

### Phase 5: Social (10+ weeks)
- [ ] User presence system
- [ ] Study groups
- [ ] Accountability partners
- [ ] Friend system

---

## Validation Milestones

### Milestone 1: Personal Use
- Use Intentionality daily for 1 full month
- Document friction points and improvements

### Milestone 2: Friends & Family
- Get 10 friends actively using it weekly
- Conduct user interviews
- Iterate based on feedback

### Milestone 3: Canvas Integration Live
- Successfully sync assignments for 5+ users
- Measure: Do they keep using it after sync?

### Milestone 4: Organic Growth
- 50+ weekly active users without paid acquisition
- Users referring other users

### Milestone 5: Yale Recognition
- Featured by Yale Computer Society
- Listed on Yale APIs Index (yaleapis.com)
- Potential CourseTable partnership

---

## Success Metrics

### Usage
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Tasks created per user per week
- Canvas sync adoption rate

### Engagement
- 7-day retention
- 30-day retention
- Streak length distribution
- Focus session completion rate

### Value
- % of Canvas assignments tracked in app
- Task completion rate
- User testimonials

---

## Questions to Resolve

1. **OAuth vs Token**: Should we pursue OAuth approval from Yale ITS, or start with personal tokens?
2. **CourseTable**: Should we reach out now or wait until Canvas integration is solid?
3. **Monetization**: Is this ever intended to make money, or purely portfolio/utility?
4. **Team**: Solo project, or recruit collaborators?

---

## Resources & Links

### Canvas
- [Canvas LMS API Docs](https://canvas.instructure.com/doc/api/)
- [Instructure Developer Portal](https://developerdocs.instructure.com/services/canvas)
- [Yale Canvas Help](https://help.canvas.yale.edu/)

### Yale
- [Yale API Portal](https://developers.yale.edu/)
- [How to Get API Access at Yale](https://developers.yale.edu/how-info/how-do-i-get-access-apis)
- [Yale APIs Index](https://yaleapis.com/)

### CourseTable
- [CourseTable Website](https://coursetable.com/)
- [CourseTable GitHub](https://github.com/coursetable/coursetable)
- [Ferry Crawler](https://github.com/coursetable/ferry)
- [Yale Computer Society](https://yalecomputersociety.org)

---

## Notes & Ideas

*Add notes here as you work on the project*

-

---

*Last updated: January 2025*
