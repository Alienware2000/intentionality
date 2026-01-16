-- =============================================================================
-- SOFT DELETE FOR TASKS
-- Adds deleted_at column for soft delete functionality.
-- Tasks with deleted_at set are excluded from normal queries.
-- =============================================================================

-- Add deleted_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient filtering of non-deleted tasks
CREATE INDEX IF NOT EXISTS tasks_deleted_at_idx ON tasks (deleted_at) WHERE deleted_at IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN tasks.deleted_at IS 'Soft delete timestamp. NULL means active, set means deleted.';
