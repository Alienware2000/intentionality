-- =============================================================================
-- ANTI-XP FARMING GUARDRAILS
-- Prevents gaming the XP system through priority manipulation and focus skipping.
--
-- Changes:
-- 1. Flat XP for tasks: All priorities now earn 15 XP (was 5/10/25)
-- 2. Flat XP for habits: All priorities now earn 15 XP (was 5/10/25)
-- 3. Pro-rated focus XP: Add actual_work_minutes column to track real time
-- =============================================================================

-- Update all existing tasks to flat 15 XP
UPDATE tasks SET xp_value = 15 WHERE xp_value IS NOT NULL;

-- Update all existing habits to flat 15 XP
UPDATE habits SET xp_value = 15 WHERE xp_value IS NOT NULL;

-- Add actual_work_minutes column to focus_sessions for pro-rated XP tracking
-- This stores the server-calculated actual work time (anti-tampering)
ALTER TABLE focus_sessions
ADD COLUMN IF NOT EXISTS actual_work_minutes INTEGER;

-- Add comment explaining the column
COMMENT ON COLUMN focus_sessions.actual_work_minutes IS
  'Actual minutes worked (server-calculated from timestamps). Used for pro-rated XP.';
