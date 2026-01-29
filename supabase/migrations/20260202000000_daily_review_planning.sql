-- =============================================================================
-- DAILY REVIEW PLANNING ENHANCEMENT MIGRATION
-- Adds columns to track planning completion and XP for the daily review flow.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add planning tracking columns to daily_reflections
-- -----------------------------------------------------------------------------

-- Track whether planning step was completed
ALTER TABLE daily_reflections
ADD COLUMN IF NOT EXISTS planning_completed BOOLEAN DEFAULT false;

-- Track XP awarded for planning (separate from review XP)
ALTER TABLE daily_reflections
ADD COLUMN IF NOT EXISTS planning_xp_awarded INTEGER DEFAULT 0;

-- -----------------------------------------------------------------------------
-- 2. Add comments
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN daily_reflections.planning_completed IS 'Whether the user completed the planning step (created 3+ tasks for tomorrow)';
COMMENT ON COLUMN daily_reflections.planning_xp_awarded IS 'XP awarded for completing planning (separate from review XP)';

-- -----------------------------------------------------------------------------
-- Done!
-- -----------------------------------------------------------------------------
