-- =============================================================================
-- AI LEARNING SYSTEM TABLES
-- Database schema for the intelligent learning system (Kofi AI).
--
-- Tables:
-- 1. user_learning_profiles - Persistent memory of user preferences and goals
-- 2. ai_interaction_outcomes - Tracks whether AI suggestions led to actions
-- 3. user_pattern_aggregates - Precomputed patterns from user behavior
--
-- LEARNING: Personalization Through Data
-- ---------------------------------------
-- LLMs have no memory between requests. To provide personalized advice:
-- 1. Store explicit preferences (goals, work style, quiet hours)
-- 2. Track implicit signals (dismissed insights, advice acceptance)
-- 3. Precompute patterns (best work times, completion rates)
--
-- This data is then injected into prompts to make the AI "remember" the user.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- USER LEARNING PROFILES TABLE
-- Stores persistent memory about each user's preferences and goals.
-- This is the "brain" of the AI's understanding of each user.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Explicit goals and preferences (user-stated or AI-extracted)
  stated_goals TEXT[] DEFAULT '{}',

  -- Work schedule preferences (0.0 to 1.0 productivity scores)
  preferred_work_hours JSONB DEFAULT '{"morning": null, "afternoon": null, "evening": null, "night": null}',

  -- Focus session preferences
  preferred_focus_duration INTEGER DEFAULT 25 CHECK (preferred_focus_duration >= 5 AND preferred_focus_duration <= 120),

  -- Work style classification
  work_style TEXT DEFAULT 'balanced' CHECK (work_style IN ('deep-work', 'task-switching', 'balanced')),

  -- Motivation drivers (what gets the user moving)
  motivation_drivers TEXT[] DEFAULT '{}',

  -- Stress indicators (what situations cause stress)
  stress_indicators TEXT[] DEFAULT '{}',

  -- Insight types the user has repeatedly dismissed (learned from behavior)
  disliked_insight_types TEXT[] DEFAULT '{}',

  -- Quiet hours - don't show insights during these times (format: ["21:00-07:00"])
  quiet_hours TEXT[] DEFAULT '{}',

  -- Learning opt-out toggle
  learning_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_user_learning_profiles_user_id
  ON user_learning_profiles(user_id);

-- RLS: Users can only access their own learning profile
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning profile"
  ON user_learning_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning profile"
  ON user_learning_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning profile"
  ON user_learning_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning profile"
  ON user_learning_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- AI INTERACTION OUTCOMES TABLE
-- Tracks whether AI suggestions led to user actions and outcomes.
-- Used to learn which types of advice are actually helpful.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_interaction_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The AI suggestion that was made
  suggestion_type TEXT NOT NULL, -- 'task_suggestion', 'focus_suggestion', 'habit_suggestion', etc.
  suggestion_content TEXT NOT NULL,

  -- Source context
  source_type TEXT NOT NULL CHECK (source_type IN ('chat', 'insight', 'briefing', 'brain_dump')),
  source_id UUID, -- Reference to the message/insight that contained the suggestion

  -- User response
  action_taken BOOLEAN DEFAULT false,
  action_taken_at TIMESTAMPTZ,

  -- If a task was created, track it
  task_created_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  -- Outcome tracking
  outcome_completed BOOLEAN, -- Was the resulting task completed?
  outcome_completed_at TIMESTAMPTZ,
  time_to_completion_hours FLOAT, -- How long did it take?

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching user's outcomes
CREATE INDEX IF NOT EXISTS idx_ai_interaction_outcomes_user_id
  ON ai_interaction_outcomes(user_id);

-- Index for analyzing outcome patterns
CREATE INDEX IF NOT EXISTS idx_ai_interaction_outcomes_suggestion_type
  ON ai_interaction_outcomes(suggestion_type, action_taken);

-- Index for recent outcomes (for learning)
CREATE INDEX IF NOT EXISTS idx_ai_interaction_outcomes_created_at
  ON ai_interaction_outcomes(created_at DESC);

-- RLS: Users can only access their own outcomes
ALTER TABLE ai_interaction_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outcomes"
  ON ai_interaction_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outcomes"
  ON ai_interaction_outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outcomes"
  ON ai_interaction_outcomes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own outcomes"
  ON ai_interaction_outcomes FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- USER PATTERN AGGREGATES TABLE
-- Precomputed statistics from user behavior.
-- Updated by a scheduled function to avoid computing on every request.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_pattern_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Task completion patterns
  avg_tasks_per_day FLOAT DEFAULT 0,
  avg_completion_rate FLOAT DEFAULT 0, -- 0.0 to 1.0
  best_completion_day INTEGER, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  worst_completion_day INTEGER,

  -- Focus session patterns
  avg_focus_sessions_per_day FLOAT DEFAULT 0,
  preferred_focus_hours INTEGER[] DEFAULT '{}', -- Hours when user typically focuses (0-23)
  avg_focus_duration_minutes FLOAT DEFAULT 25,

  -- AI advice effectiveness
  ai_advice_acceptance_rate FLOAT DEFAULT 0, -- How often user acts on AI suggestions
  most_successful_advice_types JSONB DEFAULT '{}', -- {"focus_suggestion": 0.8, "task_creation": 0.6}
  least_successful_advice_types JSONB DEFAULT '{}',

  -- Insight engagement
  insight_engagement_rate FLOAT DEFAULT 0, -- How often insights are not immediately dismissed
  insight_action_rate FLOAT DEFAULT 0, -- How often users act on insights
  insights_dismissed_by_type JSONB DEFAULT '{}', -- {"habit_reminder": 5, "workload_warning": 2}

  -- Time-based patterns
  most_active_hours INTEGER[] DEFAULT '{}', -- Hours with most task completions
  quiet_period_detected TEXT, -- e.g., "21:00-07:00" (learned from activity)

  -- Computed metrics
  days_analyzed INTEGER DEFAULT 0, -- How many days of data went into these calculations
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_user_pattern_aggregates_user_id
  ON user_pattern_aggregates(user_id);

-- RLS: Users can only access their own pattern aggregates
ALTER TABLE user_pattern_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns"
  ON user_pattern_aggregates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON user_pattern_aggregates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON user_pattern_aggregates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
  ON user_pattern_aggregates FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- TRIGGER: Update updated_at timestamp
-- -----------------------------------------------------------------------------

-- Apply trigger to new tables
DROP TRIGGER IF EXISTS update_user_learning_profiles_updated_at ON user_learning_profiles;
CREATE TRIGGER update_user_learning_profiles_updated_at
  BEFORE UPDATE ON user_learning_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_pattern_aggregates_updated_at ON user_pattern_aggregates;
CREATE TRIGGER update_user_pattern_aggregates_updated_at
  BEFORE UPDATE ON user_pattern_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- FUNCTION: Update outcome when task is completed
-- Automatically updates ai_interaction_outcomes when a linked task is completed.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_ai_outcome_on_task_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when task is marked as completed
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    UPDATE ai_interaction_outcomes
    SET
      outcome_completed = true,
      outcome_completed_at = NOW(),
      time_to_completion_hours = EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600
    WHERE task_created_id = NEW.id
      AND outcome_completed IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS trigger_update_ai_outcome ON tasks;
CREATE TRIGGER trigger_update_ai_outcome
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_outcome_on_task_complete();

-- -----------------------------------------------------------------------------
-- FUNCTION: Compute user pattern aggregates
-- Called periodically to update pattern statistics.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_user_patterns(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  days_to_analyze INTEGER := 30;
  start_date DATE := CURRENT_DATE - days_to_analyze;

  -- Variables for calculations
  v_avg_tasks_per_day FLOAT;
  v_avg_completion_rate FLOAT;
  v_best_day INTEGER;
  v_worst_day INTEGER;
  v_preferred_focus_hours INTEGER[];
  v_avg_focus_duration FLOAT;
  v_ai_acceptance_rate FLOAT;
  v_insight_engagement_rate FLOAT;
  v_most_active_hours INTEGER[];
  v_insights_dismissed JSONB;
BEGIN
  -- Calculate average tasks per day
  SELECT COALESCE(COUNT(*)::FLOAT / NULLIF(days_to_analyze, 0), 0)
  INTO v_avg_tasks_per_day
  FROM tasks t
  JOIN quests q ON t.quest_id = q.id
  WHERE q.user_id = target_user_id
    AND t.due_date >= start_date
    AND t.deleted_at IS NULL;

  -- Calculate average completion rate
  SELECT COALESCE(
    AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END),
    0
  )
  INTO v_avg_completion_rate
  FROM tasks t
  JOIN quests q ON t.quest_id = q.id
  WHERE q.user_id = target_user_id
    AND t.due_date >= start_date
    AND t.deleted_at IS NULL;

  -- Find best completion day (day with highest completion rate)
  SELECT EXTRACT(DOW FROM due_date)::INTEGER
  INTO v_best_day
  FROM tasks t
  JOIN quests q ON t.quest_id = q.id
  WHERE q.user_id = target_user_id
    AND t.due_date >= start_date
    AND t.deleted_at IS NULL
  GROUP BY EXTRACT(DOW FROM due_date)
  ORDER BY AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END) DESC
  LIMIT 1;

  -- Find worst completion day
  SELECT EXTRACT(DOW FROM due_date)::INTEGER
  INTO v_worst_day
  FROM tasks t
  JOIN quests q ON t.quest_id = q.id
  WHERE q.user_id = target_user_id
    AND t.due_date >= start_date
    AND t.deleted_at IS NULL
  GROUP BY EXTRACT(DOW FROM due_date)
  ORDER BY AVG(CASE WHEN completed THEN 1.0 ELSE 0.0 END) ASC
  LIMIT 1;

  -- Find preferred focus hours (top 3 hours with most completed sessions)
  SELECT ARRAY_AGG(hour ORDER BY count DESC)
  INTO v_preferred_focus_hours
  FROM (
    SELECT EXTRACT(HOUR FROM started_at)::INTEGER as hour, COUNT(*) as count
    FROM focus_sessions
    WHERE user_id = target_user_id
      AND status = 'completed'
      AND started_at >= start_date
    GROUP BY EXTRACT(HOUR FROM started_at)
    ORDER BY count DESC
    LIMIT 3
  ) sub;

  -- Calculate average focus duration
  SELECT COALESCE(AVG(work_duration), 25)
  INTO v_avg_focus_duration
  FROM focus_sessions
  WHERE user_id = target_user_id
    AND status = 'completed'
    AND started_at >= start_date;

  -- Calculate AI advice acceptance rate
  SELECT COALESCE(
    AVG(CASE WHEN action_taken THEN 1.0 ELSE 0.0 END),
    0
  )
  INTO v_ai_acceptance_rate
  FROM ai_interaction_outcomes
  WHERE user_id = target_user_id
    AND created_at >= start_date;

  -- Calculate insight engagement rate (not immediately dismissed)
  SELECT COALESCE(
    1.0 - (
      COUNT(*) FILTER (WHERE dismissed_at IS NOT NULL AND dismissed_at < created_at + INTERVAL '10 seconds')::FLOAT
      / NULLIF(COUNT(*), 0)
    ),
    0
  )
  INTO v_insight_engagement_rate
  FROM ai_insights
  WHERE user_id = target_user_id
    AND created_at >= start_date;

  -- Find most active hours (top 3 hours with most task completions)
  SELECT ARRAY_AGG(hour ORDER BY count DESC)
  INTO v_most_active_hours
  FROM (
    SELECT EXTRACT(HOUR FROM completed_at)::INTEGER as hour, COUNT(*) as count
    FROM tasks t
    JOIN quests q ON t.quest_id = q.id
    WHERE q.user_id = target_user_id
      AND t.completed = true
      AND t.completed_at >= start_date
    GROUP BY EXTRACT(HOUR FROM completed_at)
    ORDER BY count DESC
    LIMIT 3
  ) sub;

  -- Count dismissed insights by type
  SELECT COALESCE(
    jsonb_object_agg(insight_type, dismiss_count),
    '{}'::jsonb
  )
  INTO v_insights_dismissed
  FROM (
    SELECT insight_type, COUNT(*) as dismiss_count
    FROM ai_insights
    WHERE user_id = target_user_id
      AND dismissed_at IS NOT NULL
      AND created_at >= start_date
    GROUP BY insight_type
  ) sub;

  -- Upsert the pattern aggregates
  INSERT INTO user_pattern_aggregates (
    user_id,
    avg_tasks_per_day,
    avg_completion_rate,
    best_completion_day,
    worst_completion_day,
    preferred_focus_hours,
    avg_focus_duration_minutes,
    ai_advice_acceptance_rate,
    insight_engagement_rate,
    most_active_hours,
    insights_dismissed_by_type,
    days_analyzed,
    last_computed_at
  ) VALUES (
    target_user_id,
    v_avg_tasks_per_day,
    v_avg_completion_rate,
    v_best_day,
    v_worst_day,
    COALESCE(v_preferred_focus_hours, '{}'),
    v_avg_focus_duration,
    v_ai_acceptance_rate,
    v_insight_engagement_rate,
    COALESCE(v_most_active_hours, '{}'),
    v_insights_dismissed,
    days_to_analyze,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    avg_tasks_per_day = EXCLUDED.avg_tasks_per_day,
    avg_completion_rate = EXCLUDED.avg_completion_rate,
    best_completion_day = EXCLUDED.best_completion_day,
    worst_completion_day = EXCLUDED.worst_completion_day,
    preferred_focus_hours = EXCLUDED.preferred_focus_hours,
    avg_focus_duration_minutes = EXCLUDED.avg_focus_duration_minutes,
    ai_advice_acceptance_rate = EXCLUDED.ai_advice_acceptance_rate,
    insight_engagement_rate = EXCLUDED.insight_engagement_rate,
    most_active_hours = EXCLUDED.most_active_hours,
    insights_dismissed_by_type = EXCLUDED.insights_dismissed_by_type,
    days_analyzed = EXCLUDED.days_analyzed,
    last_computed_at = EXCLUDED.last_computed_at,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- COMMENTS
-- Document the tables for future reference.
-- -----------------------------------------------------------------------------
COMMENT ON TABLE user_learning_profiles IS 'Persistent memory of user preferences, goals, and learned behaviors for AI personalization';
COMMENT ON TABLE ai_interaction_outcomes IS 'Tracks whether AI suggestions led to actions and successful outcomes';
COMMENT ON TABLE user_pattern_aggregates IS 'Precomputed behavioral patterns for efficient AI context building';

COMMENT ON COLUMN user_learning_profiles.stated_goals IS 'User-stated goals like "Graduate with honors", "Ship side project"';
COMMENT ON COLUMN user_learning_profiles.preferred_work_hours IS 'Productivity scores by time period: {"morning": 0.8, "afternoon": 0.5, ...}';
COMMENT ON COLUMN user_learning_profiles.work_style IS 'User work preference: deep-work (long blocks), task-switching (varied), balanced';
COMMENT ON COLUMN user_learning_profiles.motivation_drivers IS 'What motivates the user: achievement, mastery, deadline, social, etc.';
COMMENT ON COLUMN user_learning_profiles.disliked_insight_types IS 'Insight types the user repeatedly dismisses (learned from behavior)';
COMMENT ON COLUMN user_learning_profiles.quiet_hours IS 'Time ranges when AI should not show insights: ["21:00-07:00"]';

COMMENT ON COLUMN ai_interaction_outcomes.time_to_completion_hours IS 'Hours between suggestion and task completion (if applicable)';
COMMENT ON COLUMN user_pattern_aggregates.ai_advice_acceptance_rate IS 'Fraction of AI suggestions the user acts on (0.0 to 1.0)';
COMMENT ON COLUMN user_pattern_aggregates.insights_dismissed_by_type IS 'Count of dismissed insights by type for learning preferences';
