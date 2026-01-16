-- =============================================================================
-- BRAIN DUMP SYSTEM
-- Quick capture for thoughts and ideas to be processed later.
-- Supports both manual capture and AI-powered parsing into tasks/quests.
-- =============================================================================

-- Create brain_dump_entries table
CREATE TABLE brain_dump_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_result JSONB,  -- Stores AI parsing results or manual processing info
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries (unprocessed first, then by date)
CREATE INDEX idx_brain_dump_user ON brain_dump_entries(user_id, processed, created_at DESC);

-- Enable RLS
ALTER TABLE brain_dump_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own brain dump entries"
  ON brain_dump_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own brain dump entries"
  ON brain_dump_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own brain dump entries"
  ON brain_dump_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own brain dump entries"
  ON brain_dump_entries FOR DELETE
  USING (user_id = auth.uid());
