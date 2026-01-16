-- =============================================================================
-- CALENDAR IMPORTS
-- Stores calendar feed subscriptions (ICS URLs, Google Calendar connections)
-- =============================================================================

-- Calendar feed subscriptions (ICS URLs)
CREATE TABLE IF NOT EXISTS calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- User-friendly name
  feed_url TEXT NOT NULL,                      -- ICS feed URL
  feed_type TEXT NOT NULL DEFAULT 'ics',       -- 'ics', 'google'
  import_as TEXT NOT NULL DEFAULT 'smart',     -- 'tasks', 'schedule', 'smart'
  target_quest_id UUID REFERENCES quests(id) ON DELETE SET NULL, -- For task imports
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,                             -- Last sync error message
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Google Calendar connections (OAuth)
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  email TEXT,                                  -- Google account email
  selected_calendars JSONB DEFAULT '[]',       -- Array of calendar IDs to sync
  import_as TEXT NOT NULL DEFAULT 'smart',     -- 'tasks', 'schedule', 'smart'
  target_quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)                              -- One Google connection per user
);

-- Track imported events to avoid duplicates
CREATE TABLE IF NOT EXISTS imported_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,                   -- 'ics_subscription', 'ics_upload', 'google'
  source_id UUID,                              -- subscription_id or google_connection_id
  external_uid TEXT NOT NULL,                  -- UID from ICS or Google event ID
  created_as TEXT NOT NULL,                    -- 'task' or 'schedule_block'
  created_id UUID NOT NULL,                    -- ID of created task or schedule_block
  event_hash TEXT,                             -- Hash of event data to detect changes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_type, external_uid)
);

-- RLS Policies
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_events ENABLE ROW LEVEL SECURITY;

-- Calendar subscriptions policies
CREATE POLICY "Users can manage their own calendar subscriptions"
  ON calendar_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Google calendar connections policies
CREATE POLICY "Users can manage their own Google calendar connections"
  ON google_calendar_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Imported events policies
CREATE POLICY "Users can manage their own imported events"
  ON imported_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_calendar_subscriptions_user ON calendar_subscriptions(user_id);
CREATE INDEX idx_calendar_subscriptions_active ON calendar_subscriptions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_google_calendar_connections_user ON google_calendar_connections(user_id);
CREATE INDEX idx_imported_events_user ON imported_events(user_id);
CREATE INDEX idx_imported_events_lookup ON imported_events(user_id, source_type, external_uid);
