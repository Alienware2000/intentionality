-- =============================================================================
-- WEEKLY GOAL TRACKING MIGRATION
-- Adds ability to link tasks to weekly goals for progress tracking.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add weekly_goal_index and week_start columns to tasks
-- -----------------------------------------------------------------------------

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS weekly_goal_index INTEGER CHECK (weekly_goal_index IS NULL OR weekly_goal_index >= 0);

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS week_start DATE;

COMMENT ON COLUMN tasks.weekly_goal_index IS 'Index of the weekly goal this task contributes to (0-based, nullable)';
COMMENT ON COLUMN tasks.week_start IS 'The week (Monday date) this task is linked to for goal tracking';

-- Create index for efficient goal progress queries
CREATE INDEX IF NOT EXISTS idx_tasks_weekly_goal
  ON tasks(week_start, weekly_goal_index)
  WHERE weekly_goal_index IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Add goal_completion_rate to weekly_plans
-- -----------------------------------------------------------------------------

ALTER TABLE weekly_plans
ADD COLUMN IF NOT EXISTS goal_completion_rates JSONB DEFAULT '[]';

COMMENT ON COLUMN weekly_plans.goal_completion_rates IS 'Array of completion rates per goal: [{goalIndex: 0, completedTasks: 2, totalTasks: 5, rate: 0.4}]';

-- -----------------------------------------------------------------------------
-- Done!
-- -----------------------------------------------------------------------------
