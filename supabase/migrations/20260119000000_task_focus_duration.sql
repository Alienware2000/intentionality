-- =============================================================================
-- TASK FOCUS DURATION MIGRATION
-- Adds default_work_duration field to tasks for per-task Pomodoro settings.
-- =============================================================================

-- Add default_work_duration column (nullable, 1-180 minutes)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS default_work_duration INTEGER DEFAULT NULL;

-- Add constraint to ensure valid duration range
ALTER TABLE tasks ADD CONSTRAINT tasks_default_work_duration_range
  CHECK (default_work_duration IS NULL OR (default_work_duration >= 1 AND default_work_duration <= 180));
