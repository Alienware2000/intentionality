-- =============================================================================
-- CANVAS LMS INTEGRATION
-- Stores Canvas connection credentials and tracks synced assignments.
-- =============================================================================

-- Create canvas_connections table
CREATE TABLE canvas_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  instance_url TEXT NOT NULL,                    -- e.g., "canvas.university.edu"
  access_token TEXT NOT NULL,                    -- OAuth access token (encrypted at rest by Supabase)
  refresh_token TEXT,                            -- OAuth refresh token
  token_expires_at TIMESTAMPTZ,                  -- When access token expires
  selected_courses JSONB DEFAULT '[]',           -- Array of course IDs to sync
  last_synced_at TIMESTAMPTZ,                    -- Last successful sync timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on user_id (one Canvas connection per user)
CREATE UNIQUE INDEX idx_canvas_connections_user ON canvas_connections(user_id);

-- Create synced_assignments table
-- Tracks which Canvas assignments have been imported as tasks
CREATE TABLE synced_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_assignment_id TEXT NOT NULL,            -- Canvas assignment ID
  canvas_course_id TEXT NOT NULL,                -- Canvas course ID
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- Linked task (null if deleted)
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE, -- Quest for this course
  assignment_name TEXT NOT NULL,                 -- Original assignment name
  due_at TIMESTAMPTZ,                            -- Original Canvas due date
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding synced assignments
CREATE INDEX idx_synced_assignments_user ON synced_assignments(user_id);
CREATE UNIQUE INDEX idx_synced_assignments_unique ON synced_assignments(user_id, canvas_assignment_id);

-- Enable RLS
ALTER TABLE canvas_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canvas_connections
CREATE POLICY "Users can view their own canvas connection"
  ON canvas_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own canvas connection"
  ON canvas_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own canvas connection"
  ON canvas_connections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own canvas connection"
  ON canvas_connections FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for synced_assignments
CREATE POLICY "Users can view their own synced assignments"
  ON synced_assignments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own synced assignments"
  ON synced_assignments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own synced assignments"
  ON synced_assignments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own synced assignments"
  ON synced_assignments FOR DELETE
  USING (user_id = auth.uid());
