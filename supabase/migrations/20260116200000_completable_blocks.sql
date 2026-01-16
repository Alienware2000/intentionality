-- =============================================================================
-- COMPLETABLE SCHEDULE BLOCKS
-- Allow certain schedule blocks (gym, study sessions) to be checked off with XP
-- =============================================================================

-- Add completable fields to schedule_blocks
ALTER TABLE schedule_blocks
ADD COLUMN is_completable BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN xp_value INTEGER DEFAULT 10;

-- Create schedule_block_completions table (like habit_completions)
CREATE TABLE schedule_block_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES schedule_blocks(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_awarded INTEGER NOT NULL,

  -- Prevent double completion per day
  UNIQUE (block_id, completed_date)
);

-- Index for date-based queries
CREATE INDEX idx_sbc_block_date ON schedule_block_completions(block_id, completed_date);

-- Enable RLS
ALTER TABLE schedule_block_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (ownership via schedule_blocks)
CREATE POLICY "Users can view their own schedule block completions"
  ON schedule_block_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM schedule_blocks
    WHERE schedule_blocks.id = schedule_block_completions.block_id
    AND schedule_blocks.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own schedule block completions"
  ON schedule_block_completions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM schedule_blocks
    WHERE schedule_blocks.id = schedule_block_completions.block_id
    AND schedule_blocks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own schedule block completions"
  ON schedule_block_completions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM schedule_blocks
    WHERE schedule_blocks.id = schedule_block_completions.block_id
    AND schedule_blocks.user_id = auth.uid()
  ));
