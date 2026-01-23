-- =============================================================================
-- HABIT SCHEDULES MIGRATION
-- Adds frequency and active_days columns to habits table for customizable
-- streak schedules (e.g., weekdays only, weekends only, custom days).
-- =============================================================================

-- Add frequency column with preset options
ALTER TABLE habits
ADD COLUMN frequency TEXT NOT NULL DEFAULT 'daily'
CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'custom'));

-- Add active_days column as array of days (1=Monday, 7=Sunday)
-- Constraint ensures: only valid days 1-7, at least one day selected
ALTER TABLE habits
ADD COLUMN active_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6,7]
CHECK (active_days <@ ARRAY[1,2,3,4,5,6,7] AND array_length(active_days, 1) > 0);

-- Add index for potential filtering by frequency
CREATE INDEX idx_habits_frequency ON habits (frequency);

COMMENT ON COLUMN habits.frequency IS 'Preset schedule: daily, weekdays, weekends, or custom';
COMMENT ON COLUMN habits.active_days IS 'Array of active days (1=Monday, 7=Sunday). Used for streak calculations.';
