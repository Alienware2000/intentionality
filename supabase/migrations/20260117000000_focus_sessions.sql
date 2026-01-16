-- =============================================================================
-- FOCUS SESSIONS (POMODORO TIMER)
-- Built-in timer for deep work with XP rewards.
-- =============================================================================

-- Create focus_sessions table
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT,
  work_duration INTEGER NOT NULL DEFAULT 25,    -- minutes
  break_duration INTEGER NOT NULL DEFAULT 5,    -- minutes
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  xp_awarded INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id, created_at DESC);
CREATE INDEX idx_focus_sessions_status ON focus_sessions(user_id, status);

-- Enable RLS
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own focus sessions"
  ON focus_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own focus sessions"
  ON focus_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own focus sessions"
  ON focus_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own focus sessions"
  ON focus_sessions FOR DELETE
  USING (user_id = auth.uid());

-- Add focus stats to user_profiles
ALTER TABLE user_profiles
ADD COLUMN total_focus_minutes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN focus_sessions_completed INTEGER NOT NULL DEFAULT 0;
