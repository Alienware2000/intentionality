-- =============================================================================
-- SOCIAL ENHANCEMENTS MIGRATION
-- Adds weekly cycles, group challenges, awards, and accountability features
-- to transform groups from passive leaderboards into engaging experiences.
--
-- Features:
-- 1. Weekly History - Archive past week results with winners
-- 2. Group Challenges - Cooperative weekly goals
-- 3. Challenge Templates - Pre-defined challenge types
-- 4. Streak Status - Track at-risk members for nudges
-- 5. Current Activity - "Working on" status for members
--
-- DESIGN PHILOSOPHY:
-- - Competition: Weekly resets with podium winners
-- - Cooperation: Group challenges where everyone benefits
-- - Accountability: Surface at-risk streaks, enable nudges
-- =============================================================================

-- =============================================================================
-- 1. GROUP WEEKLY HISTORY TABLE
-- Archive weekly results before reset (winners, totals, participation).
-- =============================================================================

CREATE TABLE group_weekly_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- Week boundaries
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  -- Podium: top 3 performers
  first_place_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_place_xp INTEGER NOT NULL DEFAULT 0,
  second_place_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  second_place_xp INTEGER DEFAULT 0,
  third_place_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  third_place_xp INTEGER DEFAULT 0,

  -- Group totals
  total_group_xp BIGINT NOT NULL DEFAULT 0,
  participant_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_group_week UNIQUE (group_id, week_start)
);

-- Indexes
CREATE INDEX idx_group_weekly_history_group ON group_weekly_history(group_id);
CREATE INDEX idx_group_weekly_history_group_week ON group_weekly_history(group_id, week_start DESC);
CREATE INDEX idx_group_weekly_history_first_place ON group_weekly_history(first_place_user_id) WHERE first_place_user_id IS NOT NULL;

-- RLS: Members can view history of their groups
ALTER TABLE group_weekly_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view weekly history"
  ON group_weekly_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_weekly_history.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. GROUP CHALLENGE TEMPLATES TABLE
-- Pre-defined challenge types with scaling targets.
-- =============================================================================

CREATE TABLE group_challenge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Challenge details
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('tasks', 'focus', 'habits', 'xp')),

  -- Target is per-member (multiplied by member count)
  target_per_member INTEGER NOT NULL,

  -- Rewards
  xp_reward_per_member INTEGER NOT NULL DEFAULT 25,

  -- Management
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed challenge templates
INSERT INTO group_challenge_templates (name, description, challenge_type, target_per_member, xp_reward_per_member) VALUES
  ('Task Titans', 'Complete tasks as a team!', 'tasks', 10, 25),
  ('Focus Force', 'Rack up focus minutes together!', 'focus', 60, 30),
  ('Habit Heroes', 'Build habits as a group!', 'habits', 5, 25),
  ('XP Explosion', 'Earn XP as a team!', 'xp', 100, 20),
  ('Deep Work Week', 'Long focus sessions add up!', 'focus', 90, 35),
  ('Consistency Champions', 'Complete habits every day!', 'habits', 7, 30),
  ('Task Masters', 'Crush those task lists!', 'tasks', 15, 30),
  ('Point Pursuers', 'Chase that XP together!', 'xp', 150, 25);

-- RLS: Templates are readable by all authenticated users
ALTER TABLE group_challenge_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are readable by all authenticated users"
  ON group_challenge_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- =============================================================================
-- 3. GROUP CHALLENGES TABLE
-- Weekly challenges assigned to groups.
-- =============================================================================

CREATE TABLE group_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- Week and template reference
  week_start DATE NOT NULL,
  template_id UUID REFERENCES group_challenge_templates(id) ON DELETE SET NULL,

  -- Challenge details (copied from template for history)
  name TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('tasks', 'focus', 'habits', 'xp')),

  -- Targets and progress
  target_value INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,

  -- Completion status
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Rewards
  xp_reward_per_member INTEGER NOT NULL DEFAULT 25,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_group_challenge_week UNIQUE (group_id, week_start)
);

-- Indexes
CREATE INDEX idx_group_challenges_group ON group_challenges(group_id);
CREATE INDEX idx_group_challenges_group_week ON group_challenges(group_id, week_start);
CREATE INDEX idx_group_challenges_active ON group_challenges(group_id, completed) WHERE completed = false;

-- RLS: Group members can view their challenges
ALTER TABLE group_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view challenges"
  ON group_challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_challenges.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 4. GROUP MEMBER STREAK STATUS TABLE
-- Track at-risk members for accountability nudges.
-- =============================================================================

CREATE TABLE group_member_streak_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity tracking
  last_productive_action TIMESTAMPTZ,
  is_at_risk BOOLEAN DEFAULT false,

  -- Nudge tracking
  last_nudged_at TIMESTAMPTZ,
  nudge_count_today INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_group_member_streak UNIQUE (group_id, user_id)
);

-- Indexes
CREATE INDEX idx_group_member_streak_status_group ON group_member_streak_status(group_id);
CREATE INDEX idx_group_member_streak_status_user ON group_member_streak_status(user_id);
CREATE INDEX idx_group_member_streak_status_at_risk ON group_member_streak_status(group_id, is_at_risk) WHERE is_at_risk = true;

-- RLS: Group members can view streak status
ALTER TABLE group_member_streak_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view streak status"
  ON group_member_streak_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_member_streak_status.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own streak status"
  ON group_member_streak_status FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Group members can insert streak status"
  ON group_member_streak_status FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_member_streak_status.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. MODIFY GROUP_MEMBERS TABLE
-- Add current activity status for "working on" display.
-- =============================================================================

ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS current_activity TEXT,
ADD COLUMN IF NOT EXISTS current_activity_updated_at TIMESTAMPTZ;

-- =============================================================================
-- 6. ADD NEW NOTIFICATION TYPES
-- Update notifications table to support new social notification types.
-- =============================================================================

-- Drop and recreate the CHECK constraint to add new types
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- Existing types
  'friend_request',
  'friend_accepted',
  'group_invite',
  'group_joined',
  'nudge',
  'achievement_shared',
  'streak_milestone_friend',
  'level_up_friend',
  -- New types for social enhancements
  'weekly_winner',
  'group_challenge_complete',
  'group_nudge'
));

-- =============================================================================
-- 7. ADD NEW ACTIVITY TYPES
-- Update activity_feed table to support new activity types.
-- =============================================================================

-- Drop and recreate the CHECK constraint to add new types
ALTER TABLE activity_feed
DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

ALTER TABLE activity_feed
ADD CONSTRAINT activity_feed_activity_type_check CHECK (activity_type IN (
  -- Existing types
  'task_completed',
  'quest_completed',
  'level_up',
  'achievement_unlocked',
  'streak_milestone',
  'habit_streak',
  'joined_group',
  'focus_milestone',
  'group_deleted',
  -- New types for social enhancements
  'weekly_winner',
  'group_challenge_complete'
));

-- =============================================================================
-- 8. HELPER FUNCTIONS
-- =============================================================================

-- Function to get the current week's Monday (ISO week)
CREATE OR REPLACE FUNCTION get_current_week_start()
RETURNS DATE AS $$
BEGIN
  RETURN date_trunc('week', CURRENT_DATE)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update streak status timestamp
CREATE OR REPLACE FUNCTION update_streak_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_streak_status_timestamp
  BEFORE UPDATE ON group_member_streak_status
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_status_timestamp();

-- Function to reset daily nudge counts (called at midnight UTC)
CREATE OR REPLACE FUNCTION reset_daily_nudge_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE group_member_streak_status
  SET nudge_count_today = 0
  WHERE nudge_count_today > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment group member's weekly XP
-- Called from gamification-actions.ts when XP is awarded
CREATE OR REPLACE FUNCTION increment_group_member_weekly_xp(
  p_group_id UUID,
  p_user_id UUID,
  p_xp INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE group_members
  SET weekly_xp = weekly_xp + p_xp
  WHERE group_id = p_group_id AND user_id = p_user_id;

  -- Also update the group's total_xp
  UPDATE groups
  SET total_xp = total_xp + p_xp
  WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment group challenge progress
-- Called from gamification-actions.ts when XP is awarded
CREATE OR REPLACE FUNCTION increment_group_challenge_progress(
  p_user_id UUID,
  p_challenge_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS TABLE(
  challenge_id UUID,
  group_id UUID,
  completed BOOLEAN,
  xp_reward INTEGER
) AS $$
DECLARE
  v_week_start DATE;
  v_challenge RECORD;
  v_all_members UUID[];
BEGIN
  v_week_start := get_current_week_start();

  -- Find all groups the user is in with active challenges of this type
  FOR v_challenge IN
    SELECT
      gc.id,
      gc.group_id,
      gc.current_progress,
      gc.target_value,
      gc.xp_reward_per_member,
      gc.completed AS was_completed
    FROM group_challenges gc
    JOIN group_members gm ON gc.group_id = gm.group_id
    WHERE gm.user_id = p_user_id
      AND gc.week_start = v_week_start
      AND gc.challenge_type = p_challenge_type
      AND gc.completed = false
  LOOP
    -- Increment progress
    UPDATE group_challenges
    SET current_progress = current_progress + p_increment
    WHERE id = v_challenge.id;

    -- Check if now completed
    IF (v_challenge.current_progress + p_increment) >= v_challenge.target_value THEN
      -- Mark as completed
      UPDATE group_challenges
      SET completed = true, completed_at = NOW()
      WHERE id = v_challenge.id;

      -- Return this challenge as completed
      challenge_id := v_challenge.id;
      group_id := v_challenge.group_id;
      completed := true;
      xp_reward := v_challenge.xp_reward_per_member;
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update at-risk status for group members
-- A member is at-risk if they haven't had productive action in 18+ hours
CREATE OR REPLACE FUNCTION update_at_risk_status(p_group_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE group_member_streak_status
  SET is_at_risk = CASE
    WHEN last_productive_action IS NULL THEN true
    WHEN last_productive_action < NOW() - INTERVAL '18 hours' THEN true
    ELSE false
  END
  WHERE (p_group_id IS NULL OR group_id = p_group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record productive action (clears at-risk status)
CREATE OR REPLACE FUNCTION record_productive_action(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update all group memberships for this user
  UPDATE group_member_streak_status
  SET
    last_productive_action = NOW(),
    is_at_risk = false
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. CREATE STREAK STATUS ENTRIES FOR EXISTING MEMBERS
-- Backfill streak status for existing group members.
-- =============================================================================

INSERT INTO group_member_streak_status (group_id, user_id, last_productive_action, is_at_risk)
SELECT
  gm.group_id,
  gm.user_id,
  up.last_active_date::TIMESTAMPTZ,
  CASE
    WHEN up.last_active_date IS NULL THEN true
    WHEN up.last_active_date::TIMESTAMPTZ < NOW() - INTERVAL '18 hours' THEN true
    ELSE false
  END
FROM group_members gm
LEFT JOIN user_profiles up ON gm.user_id = up.user_id
ON CONFLICT (group_id, user_id) DO NOTHING;

-- =============================================================================
-- 10. TRIGGER TO CREATE STREAK STATUS ON JOIN
-- Automatically create streak status when a user joins a group.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_streak_status_on_join()
RETURNS TRIGGER AS $$
DECLARE
  v_last_active TIMESTAMPTZ;
BEGIN
  -- Get user's last active date
  SELECT last_active_date::TIMESTAMPTZ INTO v_last_active
  FROM user_profiles
  WHERE user_id = NEW.user_id;

  -- Create streak status entry
  INSERT INTO group_member_streak_status (
    group_id,
    user_id,
    last_productive_action,
    is_at_risk
  ) VALUES (
    NEW.group_id,
    NEW.user_id,
    v_last_active,
    v_last_active IS NULL OR v_last_active < NOW() - INTERVAL '18 hours'
  )
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_streak_status_on_join
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION create_streak_status_on_join();

-- =============================================================================
-- 11. TRIGGER TO DELETE STREAK STATUS ON LEAVE
-- Clean up streak status when a user leaves a group.
-- =============================================================================

CREATE OR REPLACE FUNCTION delete_streak_status_on_leave()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM group_member_streak_status
  WHERE group_id = OLD.group_id AND user_id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_delete_streak_status_on_leave
  AFTER DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION delete_streak_status_on_leave();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE group_weekly_history IS 'Archived weekly results with podium winners for each group';
COMMENT ON TABLE group_challenge_templates IS 'Pre-defined challenge types for weekly group challenges';
COMMENT ON TABLE group_challenges IS 'Active weekly challenges for groups with progress tracking';
COMMENT ON TABLE group_member_streak_status IS 'Tracks member activity for at-risk detection and nudging';

COMMENT ON COLUMN group_weekly_history.first_place_user_id IS 'Winner of the week, receives +25 XP bonus';
COMMENT ON COLUMN group_weekly_history.second_place_user_id IS 'Runner-up, receives +15 XP bonus';
COMMENT ON COLUMN group_weekly_history.third_place_user_id IS 'Third place, receives +10 XP bonus';

COMMENT ON COLUMN group_challenge_templates.target_per_member IS 'Target value per member, multiplied by group size for actual target';
COMMENT ON COLUMN group_challenges.current_progress IS 'Total progress from all group members combined';
COMMENT ON COLUMN group_challenges.completed IS 'When true, all members receive xp_reward_per_member XP';

COMMENT ON COLUMN group_member_streak_status.is_at_risk IS 'True if member has not had productive action in 18+ hours';
COMMENT ON COLUMN group_member_streak_status.nudge_count_today IS 'Limits nudges to 1 per sender per recipient per day';

COMMENT ON COLUMN group_members.current_activity IS 'What the member is currently working on (e.g., "Studying for finals")';
