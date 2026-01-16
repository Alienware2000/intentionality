-- =============================================================================
-- HABITS TABLES
-- Daily habits with per-habit streak tracking
-- =============================================================================

-- Create habits table
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  xp_value INTEGER NOT NULL DEFAULT 10,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX idx_habits_user_id ON habits(user_id);

-- Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habits (direct ownership)
CREATE POLICY "Users can view their own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON habits FOR DELETE
  USING (auth.uid() = user_id);

-- Create habit_completions table
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_awarded INTEGER NOT NULL,

  -- Unique constraint prevents double-completion on same day
  UNIQUE (habit_id, completed_date)
);

-- Index for date-based queries
CREATE INDEX idx_habit_completions_habit_date ON habit_completions(habit_id, completed_date);

-- Enable RLS
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_completions (indirect ownership via habits)
CREATE POLICY "Users can view their own habit completions"
  ON habit_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own habit completions"
  ON habit_completions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own habit completions"
  ON habit_completions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM habits WHERE habits.id = habit_completions.habit_id AND habits.user_id = auth.uid()
  ));
