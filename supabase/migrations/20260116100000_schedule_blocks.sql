-- =============================================================================
-- SCHEDULE BLOCKS TABLE
-- Recurring time blocks for classes, gym, work, etc.
-- =============================================================================

-- Create schedule_blocks table
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIME NOT NULL,           -- e.g., '09:00'
  end_time TIME NOT NULL,             -- e.g., '10:30'
  days_of_week INTEGER[] NOT NULL,    -- [1,3,5] = Mon/Wed/Fri (1=Mon, 7=Sun)
  color TEXT NOT NULL DEFAULT '#6366f1',
  location TEXT,                      -- optional room/location
  start_date DATE,                    -- when this schedule starts (optional)
  end_date DATE,                      -- when this schedule ends (optional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  -- Ensure valid days (1-7)
  CONSTRAINT valid_days CHECK (days_of_week <@ ARRAY[1,2,3,4,5,6,7])
);

-- Index for user queries
CREATE INDEX idx_schedule_blocks_user_id ON schedule_blocks(user_id);

-- Enable RLS
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own schedule blocks"
  ON schedule_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule blocks"
  ON schedule_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule blocks"
  ON schedule_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule blocks"
  ON schedule_blocks FOR DELETE
  USING (auth.uid() = user_id);
