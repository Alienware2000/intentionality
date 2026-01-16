-- =============================================================================
-- TASK SCHEDULED TIME
-- Add optional time field to tasks for timeline ordering.
-- =============================================================================

-- Add scheduled_time column (nullable TIME)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_time TIME DEFAULT NULL;

-- Index for efficient timeline queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_time ON tasks(due_date, scheduled_time);
