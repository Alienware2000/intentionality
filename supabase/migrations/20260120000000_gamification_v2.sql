-- =============================================================================
-- GAMIFICATION V2 MIGRATION
-- Comprehensive gamification system with achievements, challenges, and enhanced streaks.
-- =============================================================================

-- =============================================================================
-- ACHIEVEMENT DEFINITIONS TABLE
-- Stores all possible achievements with their tiers
-- =============================================================================

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('streak', 'tasks', 'focus', 'quests', 'habits', 'special')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  bronze_threshold INTEGER NOT NULL,
  bronze_xp INTEGER NOT NULL,
  silver_threshold INTEGER NOT NULL,
  silver_xp INTEGER NOT NULL,
  gold_threshold INTEGER NOT NULL,
  gold_xp INTEGER NOT NULL,
  stat_key TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER ACHIEVEMENTS TABLE
-- Tracks each user's progress on achievements
-- =============================================================================

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  current_tier TEXT CHECK (current_tier IN ('bronze', 'silver', 'gold')),
  bronze_unlocked_at TIMESTAMPTZ,
  silver_unlocked_at TIMESTAMPTZ,
  gold_unlocked_at TIMESTAMPTZ,
  progress_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);

-- RLS for user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- DAILY CHALLENGE TEMPLATES TABLE
-- Template definitions for daily challenges
-- =============================================================================

CREATE TABLE daily_challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('tasks', 'focus', 'habits', 'high_priority')),
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER DAILY CHALLENGES TABLE
-- Tracks user's assigned daily challenges and progress
-- =============================================================================

CREATE TABLE user_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES daily_challenge_templates(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, template_id, challenge_date)
);

CREATE INDEX idx_user_daily_challenges_user_date ON user_daily_challenges(user_id, challenge_date);

-- RLS for user_daily_challenges
ALTER TABLE user_daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily challenges"
  ON user_daily_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily challenges"
  ON user_daily_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily challenges"
  ON user_daily_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- WEEKLY CHALLENGE TEMPLATES TABLE
-- Template definitions for weekly challenges
-- =============================================================================

CREATE TABLE weekly_challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('tasks', 'focus', 'habits', 'streak', 'daily_challenges')),
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER WEEKLY CHALLENGES TABLE
-- Tracks user's assigned weekly challenges and progress
-- =============================================================================

CREATE TABLE user_weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES weekly_challenge_templates(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_user_weekly_challenges_user_week ON user_weekly_challenges(user_id, week_start);

-- RLS for user_weekly_challenges
ALTER TABLE user_weekly_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly challenges"
  ON user_weekly_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly challenges"
  ON user_weekly_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly challenges"
  ON user_weekly_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- USER STREAK FREEZES TABLE
-- Tracks streak freeze inventory per user
-- =============================================================================

CREATE TABLE user_streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  available_freezes INTEGER DEFAULT 1 CHECK (available_freezes >= 0 AND available_freezes <= 3),
  last_freeze_earned DATE,
  last_freeze_used DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_streak_freezes
ALTER TABLE user_streak_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak freezes"
  ON user_streak_freezes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streak freezes"
  ON user_streak_freezes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak freezes"
  ON user_streak_freezes FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- USER ACTIVITY LOG TABLE
-- Tracks daily activity for calendar heatmap and stats
-- =============================================================================

CREATE TABLE user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  streak_maintained BOOLEAN DEFAULT false,
  freeze_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

CREATE INDEX idx_user_activity_log_user_date ON user_activity_log(user_id, activity_date);

-- RLS for user_activity_log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity log"
  ON user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
  ON user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity log"
  ON user_activity_log FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- UPDATE USER_PROFILES TABLE
-- Add new columns for lifetime stats and gamification tracking
-- =============================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS lifetime_tasks_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_high_priority_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_habits_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_quests_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_focus_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_perfect_weeks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_brain_dumps_processed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_early_bird_tasks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_night_owl_tasks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_long_focus_sessions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_streak_recoveries INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achievements_unlocked INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS permanent_xp_bonus DECIMAL(4,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Novice';

-- =============================================================================
-- SEED ACHIEVEMENT DATA
-- =============================================================================

INSERT INTO achievements (key, category, name, description, icon_name, bronze_threshold, bronze_xp, silver_threshold, silver_xp, gold_threshold, gold_xp, stat_key, sort_order) VALUES
  -- Streak achievements
  ('consistent', 'streak', 'Consistent', 'Maintain your streak', 'Flame', 7, 25, 30, 100, 100, 500, 'current_streak', 1),
  ('comeback', 'streak', 'Comeback', 'Recover from broken streaks', 'RefreshCw', 3, 15, 10, 50, 25, 150, 'lifetime_streak_recoveries', 2),

  -- Task achievements
  ('task_master', 'tasks', 'Task Master', 'Complete tasks', 'CheckCircle', 25, 25, 100, 100, 500, 500, 'lifetime_tasks_completed', 3),
  ('priority_handler', 'tasks', 'Priority Handler', 'Complete high-priority tasks', 'AlertTriangle', 10, 30, 50, 120, 200, 500, 'lifetime_high_priority_completed', 4),

  -- Focus achievements
  ('deep_worker', 'focus', 'Deep Worker', 'Accumulate focus time', 'Clock', 300, 25, 1500, 100, 6000, 500, 'lifetime_focus_minutes', 5),
  ('marathon', 'focus', 'Marathon', 'Complete long focus sessions (60+ min)', 'Timer', 3, 30, 10, 100, 25, 400, 'lifetime_long_focus_sessions', 6),

  -- Quest achievements
  ('adventurer', 'quests', 'Adventurer', 'Complete quests', 'Flag', 3, 50, 10, 200, 25, 600, 'lifetime_quests_completed', 7),

  -- Habit achievements
  ('habit_former', 'habits', 'Habit Former', 'Complete habit entries', 'Repeat', 21, 30, 66, 100, 200, 400, 'lifetime_habits_completed', 8),
  ('perfect_week', 'habits', 'Perfect Week', 'Complete all habits for a week', 'Trophy', 1, 40, 4, 150, 12, 500, 'lifetime_perfect_weeks', 9),

  -- Special achievements
  ('early_bird', 'special', 'Early Bird', 'Complete tasks before 7am', 'Sunrise', 5, 25, 25, 100, 100, 400, 'lifetime_early_bird_tasks', 10),
  ('night_owl', 'special', 'Night Owl', 'Complete tasks after 10pm', 'Moon', 5, 25, 25, 100, 100, 400, 'lifetime_night_owl_tasks', 11),
  ('inbox_zero', 'special', 'Inbox Zero', 'Process brain dump entries', 'Inbox', 25, 30, 100, 100, 500, 400, 'lifetime_brain_dumps_processed', 12);

-- =============================================================================
-- SEED DAILY CHALLENGE TEMPLATES
-- =============================================================================

INSERT INTO daily_challenge_templates (key, name, description, challenge_type, target_value, xp_reward, difficulty) VALUES
  -- Easy challenges (15-25 XP)
  ('complete_2_tasks', 'Task Starter', 'Complete 2 tasks', 'tasks', 2, 15, 'easy'),
  ('focus_15_min', 'Quick Focus', 'Focus for 15 minutes', 'focus', 15, 15, 'easy'),
  ('complete_habit', 'Habit Check', 'Complete at least 1 habit', 'habits', 1, 20, 'easy'),

  -- Medium challenges (30-50 XP)
  ('complete_4_tasks', 'Productive Day', 'Complete 4 tasks', 'tasks', 4, 35, 'medium'),
  ('focus_45_min', 'Deep Work', 'Focus for 45 minutes', 'focus', 45, 40, 'medium'),
  ('complete_all_habits', 'Habit Master', 'Complete all your habits', 'habits', -1, 50, 'medium'),
  ('high_priority_task', 'Priority First', 'Complete a high-priority task', 'high_priority', 1, 30, 'medium'),

  -- Hard challenges (60-100 XP)
  ('complete_6_tasks', 'Task Champion', 'Complete 6 tasks', 'tasks', 6, 60, 'hard'),
  ('focus_90_min', 'Ultra Focus', 'Focus for 90 minutes', 'focus', 90, 75, 'hard'),
  ('complete_2_high_priority', 'Priority Champion', 'Complete 2 high-priority tasks', 'high_priority', 2, 65, 'hard');

-- =============================================================================
-- SEED WEEKLY CHALLENGE TEMPLATES
-- =============================================================================

INSERT INTO weekly_challenge_templates (key, name, description, challenge_type, target_value, xp_reward) VALUES
  ('weekly_20_tasks', 'Weekly Warrior', 'Complete 20 tasks this week', 'tasks', 20, 150),
  ('weekly_5_hours_focus', 'Focus Champion', 'Accumulate 5 hours of focus time', 'focus', 300, 200),
  ('weekly_streak', 'Consistency King', 'Maintain your streak all week', 'streak', 7, 100),
  ('weekly_daily_challenges', 'Challenge Master', 'Complete all daily challenges for 5 days', 'daily_challenges', 5, 250);

-- =============================================================================
-- PUBLIC READ ACCESS FOR TEMPLATE TABLES
-- These are reference data, not user-specific
-- =============================================================================

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are readable by all authenticated users"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE daily_challenge_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily challenge templates are readable by all authenticated users"
  ON daily_challenge_templates FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE weekly_challenge_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Weekly challenge templates are readable by all authenticated users"
  ON weekly_challenge_templates FOR SELECT
  TO authenticated
  USING (true);
