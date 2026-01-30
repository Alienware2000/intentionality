-- =============================================================================
-- ROLLBACK: Multi-round focus session columns
-- Removes columns added for multi-round Pomodoro feature that was reverted
-- =============================================================================

-- Drop columns if they exist (safe to run even if columns don't exist)
ALTER TABLE focus_sessions
DROP COLUMN IF EXISTS total_rounds,
DROP COLUMN IF EXISTS current_round,
DROP COLUMN IF EXISTS completed_rounds,
DROP COLUMN IF EXISTS short_break_duration,
DROP COLUMN IF EXISTS long_break_duration,
DROP COLUMN IF EXISTS target_end_time,
DROP COLUMN IF EXISTS current_mode;

-- Drop constraints if they exist
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_current_mode_check;
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_total_rounds_check;
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_current_round_check;
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_completed_rounds_check;
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_short_break_check;
ALTER TABLE focus_sessions DROP CONSTRAINT IF EXISTS focus_sessions_long_break_check;
