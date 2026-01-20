-- =============================================================================
-- PERSONAL ASSISTANT FEATURES MIGRATION
-- Adds tables and columns for:
-- - Onboarding progress tracking
-- - Daily reflections/reviews
-- - Weekly planning
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add onboarding_progress column to user_profiles
-- -----------------------------------------------------------------------------

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT NULL;

COMMENT ON COLUMN user_profiles.onboarding_progress IS 'Stores user onboarding checklist progress as JSONB';

-- -----------------------------------------------------------------------------
-- 2. Create daily_reflections table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  wins TEXT[] DEFAULT '{}',
  challenges TEXT[] DEFAULT '{}',
  tomorrow_priorities TEXT[] DEFAULT '{}',
  mood INTEGER CHECK (mood IS NULL OR (mood >= 1 AND mood <= 5)),
  energy INTEGER CHECK (energy IS NULL OR (energy >= 1 AND energy <= 5)),
  notes TEXT,
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE daily_reflections ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_reflections
CREATE POLICY "Users can view their own reflections"
  ON daily_reflections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reflections"
  ON daily_reflections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
  ON daily_reflections
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
  ON daily_reflections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_date
  ON daily_reflections(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_reflections_date
  ON daily_reflections(date);

COMMENT ON TABLE daily_reflections IS 'Stores daily review/reflection entries for users';

-- -----------------------------------------------------------------------------
-- 3. Create weekly_plans table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week
  goals TEXT[] DEFAULT '{}',
  focus_areas TEXT[] DEFAULT '{}',
  review_notes TEXT,
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_plans
CREATE POLICY "Users can view their own plans"
  ON weekly_plans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plans"
  ON weekly_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON weekly_plans
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON weekly_plans
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week
  ON weekly_plans(user_id, week_start);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_week_start
  ON weekly_plans(week_start);

COMMENT ON TABLE weekly_plans IS 'Stores weekly planning entries for users';

-- -----------------------------------------------------------------------------
-- 4. Add planning achievements to achievements table (if it exists)
-- -----------------------------------------------------------------------------

-- Check if achievements table exists and insert planning achievements
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'achievements') THEN
    -- Insert planning achievements if they don't exist
    INSERT INTO achievements (key, category, name, description, icon_name, bronze_threshold, bronze_xp, silver_threshold, silver_xp, gold_threshold, gold_xp, stat_key, sort_order)
    VALUES
      ('daily_reflector', 'special', 'Daily Reflector', 'Complete daily reviews consistently', 'BookOpen', 7, 50, 30, 150, 100, 500, 'daily_reviews_completed', 100),
      ('weekly_warrior', 'special', 'Weekly Warrior', 'Complete weekly planning sessions', 'ClipboardList', 4, 75, 12, 200, 52, 750, 'weekly_plans_completed', 101),
      ('goal_setter', 'special', 'Goal Setter', 'Complete weekly goals you set', 'Target', 10, 50, 50, 150, 200, 500, 'weekly_goals_completed', 102)
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Add planning stat columns to user_profiles (for achievement tracking)
-- -----------------------------------------------------------------------------

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS daily_reviews_completed INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS weekly_plans_completed INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS weekly_goals_completed INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS daily_review_streak INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS weekly_plan_streak INTEGER DEFAULT 0;

-- -----------------------------------------------------------------------------
-- Done!
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN user_profiles.daily_reviews_completed IS 'Total number of daily reviews completed';
COMMENT ON COLUMN user_profiles.weekly_plans_completed IS 'Total number of weekly plans completed';
COMMENT ON COLUMN user_profiles.weekly_goals_completed IS 'Total number of weekly goals achieved';
COMMENT ON COLUMN user_profiles.daily_review_streak IS 'Current consecutive days of daily reviews';
COMMENT ON COLUMN user_profiles.weekly_plan_streak IS 'Current consecutive weeks of planning';
