-- =============================================================================
-- TASK XP AWARDED TRACKING
-- Adds a column to store the actual XP awarded when completing a task.
-- This allows accurate XP deduction when uncompleting tasks.
-- =============================================================================

-- Add last_xp_awarded to tasks table to track actual XP awarded
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_xp_awarded INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN tasks.last_xp_awarded IS 'Actual XP awarded when task was completed (includes bonuses). Used for accurate deduction when uncompleting.';
