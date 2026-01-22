-- =============================================================================
-- AI OPTIMIZATIONS MIGRATION
-- Adds tables for briefing cache and usage tracking to support dual-provider
-- AI system and optimize API usage.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- AI Briefing Cache
-- Cache daily briefings to avoid regenerating the same-day briefings.
-- Reduces API calls and improves response time.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_briefing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content JSONB NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one cached briefing per user per day
  UNIQUE(user_id, date)
);

-- Index for quick lookups by user and date
CREATE INDEX IF NOT EXISTS idx_ai_briefing_cache_user_date
  ON ai_briefing_cache(user_id, date);

-- RLS Policy: Users can only see their own cached briefings
ALTER TABLE ai_briefing_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own briefing cache"
  ON ai_briefing_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefing cache"
  ON ai_briefing_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all (for cleanup jobs)
CREATE POLICY "Service role can manage all briefing cache"
  ON ai_briefing_cache FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- AI Usage Log
-- Track AI API usage per user/feature for daily limits and analytics.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for counting usage by user, feature, and date
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_feature_date
  ON ai_usage_log(user_id, feature, created_at);

-- Index for analytics by provider
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_provider
  ON ai_usage_log(provider, created_at);

-- RLS Policy: Users can only see their own usage
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage log"
  ON ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage log"
  ON ai_usage_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all (for analytics)
CREATE POLICY "Service role can manage all usage logs"
  ON ai_usage_log FOR ALL
  USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- Cleanup: Remove old usage logs (older than 30 days)
-- Run this periodically via cron or edge function
-- -----------------------------------------------------------------------------

-- Comment: To clean up old records, run:
-- DELETE FROM ai_usage_log WHERE created_at < NOW() - INTERVAL '30 days';
-- DELETE FROM ai_briefing_cache WHERE date < CURRENT_DATE - INTERVAL '7 days';
