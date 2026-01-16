# Intentionality Roadmap

> A Yale-focused productivity tool that integrates with the university ecosystem to become genuinely useful for students.

## Vision

Transform Intentionality from a generic gamified productivity app into **the** productivity tool Yale students actually use - by deeply integrating with Yale's academic infrastructure and solving problems no other tool solves.

---

## Current State (January 2026)

### What We Have
- Clean Next.js 16 architecture with Supabase backend
- User authentication (Google OAuth + email)
- Gamification system (XP, levels, streaks, celebrations)
- Task management with priorities and due dates
- Habits tracking with daily completions
- Schedule blocks for recurring events
- Pomodoro focus timer with XP rewards
- Brain dump quick capture (Ctrl+K)
- Analytics dashboard with XP history and activity heatmap
- Dark/light theme support
- **ICS Calendar Feed Import** - Working integration for Canvas, Google Calendar, Outlook
- **Google Calendar OAuth** - Full OAuth flow (requires env setup)

### Integration Status

| Integration | Status | Notes |
|-------------|--------|-------|
| Canvas PAT API | Abandoned | Yale's CAS/SSO blocks personal access tokens |
| Canvas ICS Feed | Working | Users export calendar feed URL from Canvas |
| Google Calendar OAuth | Working | Requires Google Cloud credentials |
| Google Calendar ICS | Working | Alternative via feed URL |
| Outlook/365 ICS | Working | Via published calendar link |

### Current Pain Points
- **Feed URL discovery is tedious** - Users need to navigate multiple menus to find their calendar feed URLs
- **No automatic sync** - Users must manually click "Sync Now"
- **No mobile optimization** - Desktop-first design

---

## Lessons Learned

### Canvas API Integration (Failed)
We attempted Canvas LMS API integration using Personal Access Tokens (PAT). This approach failed because:

1. **Yale uses CAS/SSO authentication** - Many universities using CAS disable the "New Access Token" feature in Canvas settings
2. **Token generation blocked** - Students couldn't find or generate tokens
3. **Institutional barriers** - OAuth2 Developer Key requires Yale ITS approval (long process)

### Pivot to ICS Feeds
The workaround that works:
- Canvas exports a calendar feed URL containing all assignments
- This URL is public (contains a secret token in the URL itself)
- No authentication needed - just fetch and parse
- Works with any calendar that exports ICS (Google, Outlook, Apple)

**Trade-offs:**
- Less granular than API (can't mark assignments complete)
- One-way sync only
- Requires user to find the feed URL (UX friction)

---

## The Yale Advantage

Generic productivity app = competing with Notion, Todoist, Habitica, etc.

**Yale-specific productivity tool** = solving problems no one else is solving.

### Integration Points (Revised)
1. **Canvas ICS Feed** - Import assignments (current, working)
2. **CourseTable** - Schedule import (potential)
3. **Yale CAS** - Native authentication (future)
4. **Yale Academic Calendar** - Automated deadline reminders (future)

---

## Technical Roadmap

### Phase 1: Polish & Friction Reduction (Current)
- [x] ICS feed import working
- [x] Google Calendar OAuth working
- [x] Guided setup for feed URL discovery
- [ ] Improve onboarding flow
- [ ] Add visual screenshots/GIFs in setup guides
- [ ] Mobile-responsive improvements

### Phase 2: Automatic Sync & Reliability
- [ ] Background sync for ICS feeds (every 6 hours)
- [ ] Sync status notifications
- [ ] Better error handling and retry logic
- [ ] Feed health monitoring

### Phase 3: Yale Ecosystem
- [ ] CourseTable outreach and potential integration
- [ ] Yale CAS authentication option
- [ ] Academic calendar integration (Credit/D/Fail deadlines, etc.)
- [ ] Shopping period features

### Phase 4: Social Layer
- [ ] User presence system
- [ ] Study groups by course
- [ ] Accountability partners
- [ ] Friend system

---

## UX Improvements Needed

### Feed Setup Experience
The current flow requires users to:
1. Navigate to their calendar app (Canvas/Google/Outlook)
2. Find settings
3. Locate the ICS feed URL option
4. Copy the URL
5. Paste into Intentionality

**Ideas to reduce friction:**
1. **Step-by-step guides with screenshots** - Visual instructions for each platform
2. **Direct links** - Open the exact settings page in a new tab
3. **Video walkthroughs** - 30-second clips showing the process
4. **Browser extension** - Auto-detect and copy feed URLs (advanced)
5. **QR code flow** - For mobile-to-desktop transfer

### Mobile Experience
- Add responsive design for settings page
- Bottom navigation for mobile
- Touch-friendly sync buttons

---

## Validation Milestones

### Milestone 1: Personal Use
- [x] Use Intentionality daily for 1 full month
- [x] ICS import working for Canvas assignments
- [ ] Document remaining friction points

### Milestone 2: Friends & Family
- [ ] Get 10 friends actively using it weekly
- [ ] Conduct user interviews
- [ ] Iterate based on feedback

### Milestone 3: Organic Growth
- [ ] 50+ weekly active users without paid acquisition
- [ ] Users referring other users

### Milestone 4: Yale Recognition
- [ ] Featured by Yale Computer Society
- [ ] Listed on Yale APIs Index (yaleapis.com)
- [ ] Potential CourseTable partnership

---

## Success Metrics

### Usage
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Tasks created per user per week
- Calendar feed sync adoption rate

### Engagement
- 7-day retention
- 30-day retention
- Streak length distribution
- Focus session completion rate

### Value
- % of calendar events successfully imported
- Task completion rate
- User testimonials

---

## Questions to Resolve

1. **CourseTable**: Should we reach out now or wait until we have more users?
2. **Monetization**: Is this ever intended to make money, or purely portfolio/utility?
3. **Team**: Solo project, or recruit collaborators?
4. **Automatic sync**: Implement with cron jobs or serverless functions?

---

## Resources & Links

### Canvas
- [Canvas Calendar Feed Help](https://community.canvaslms.com/t5/Student-Guide/How-do-I-subscribe-to-the-Calendar-feed-using-an-external/ta-p/535)
- [Yale Canvas Help](https://help.canvas.yale.edu/)

### Yale
- [Yale API Portal](https://developers.yale.edu/)
- [Yale APIs Index](https://yaleapis.com/)

### CourseTable
- [CourseTable Website](https://coursetable.com/)
- [CourseTable GitHub](https://github.com/coursetable/coursetable)
- [Yale Computer Society](https://yalecomputersociety.org)

### ICS/iCalendar
- [iCalendar RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545)
- [Google Calendar ICS Export](https://support.google.com/calendar/answer/37111)

---

## Notes & Ideas

### 2026-01-17
- Removed Canvas PAT integration (blocked by CAS/SSO)
- Improved ICS feed onboarding with expandable platform guides
- Added direct links to calendar settings for Canvas, Google, Outlook

---

*Last updated: January 2026*
