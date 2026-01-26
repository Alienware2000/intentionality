-- =============================================================================
-- SOCIAL FEATURES MIGRATION
-- Adds leaderboards, friendships, accountability groups, and social engagement.
--
-- Tables:
-- 1. user_privacy_settings - Controls what others can see about the user
-- 2. friendships - Two-way friend relationships with request flow
-- 3. groups - Accountability groups for mutual support
-- 4. group_members - Group membership with roles
-- 5. leaderboard_cache - Cached rankings for performance
-- 6. activity_feed - Public activities visible to friends/group members
-- 7. notifications - Social notifications (friend requests, nudges, etc.)
-- 8. nudges - Encouragement between friends (rate-limited)
--
-- DESIGN PHILOSOPHY:
-- - Privacy-first: Users opt-in to global visibility
-- - Two-way friendships: Mutual consent required (like Facebook)
-- - Leaderboard psychology: Weekly resets, friends-first, "urgent optimism"
-- - Keep it simple: Don't overwhelm users with features
-- =============================================================================

-- =============================================================================
-- 1. USER PRIVACY SETTINGS TABLE
-- Controls what information is visible to others.
-- Privacy-first approach: everything private by default.
-- =============================================================================

CREATE TABLE user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Global leaderboard visibility (opt-in, default false)
  show_on_global_leaderboard BOOLEAN DEFAULT false,

  -- What stats to show to friends/group members
  show_xp BOOLEAN DEFAULT true,
  show_level BOOLEAN DEFAULT true,
  show_streak BOOLEAN DEFAULT true,
  show_achievements BOOLEAN DEFAULT false,
  show_activity_feed BOOLEAN DEFAULT true,

  -- Friend request settings
  allow_friend_requests BOOLEAN DEFAULT true,

  -- Who can see profile (friends = only friends, public = anyone on global leaderboard)
  profile_visibility TEXT DEFAULT 'friends' CHECK (profile_visibility IN ('private', 'friends', 'public')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX idx_user_privacy_settings_user ON user_privacy_settings(user_id);

-- RLS: Users can only manage their own privacy settings
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own privacy settings"
  ON user_privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON user_privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON user_privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own privacy settings"
  ON user_privacy_settings FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 2. FRIENDSHIPS TABLE
-- Two-way friend system with request flow.
-- Friendship is stored once: requester is user_id, recipient is friend_id.
-- =============================================================================

CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who sent the request
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The user who received the request
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status of the friendship
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),

  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend_status ON friendships(friend_id, status);

-- RLS: Users can see friendships they're part of
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of"
  ON friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete friendships they're part of"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =============================================================================
-- 3. GROUPS TABLE
-- Accountability groups for mutual support and friendly competition.
-- =============================================================================

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Group details
  name TEXT NOT NULL,
  description TEXT,

  -- Owner (creator) of the group
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Invite code for joining (8 character alphanumeric)
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(gen_random_uuid()::text from 1 for 8)),

  -- Group settings
  max_members INTEGER DEFAULT 20 CHECK (max_members >= 2 AND max_members <= 50),
  is_public BOOLEAN DEFAULT false, -- Public groups can be discovered

  -- Group stats (denormalized for performance)
  member_count INTEGER DEFAULT 1,
  total_xp BIGINT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_groups_owner ON groups(owner_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_groups_is_public ON groups(is_public) WHERE is_public = true;

-- RLS: Complex rules for group visibility
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- NOTE: SELECT policy for groups is created AFTER group_members table (see below)

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their groups"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their groups"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);

-- =============================================================================
-- 4. GROUP MEMBERS TABLE
-- Tracks group membership with roles.
-- =============================================================================

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Group reference
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- Member reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role in the group
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

  -- Weekly XP contribution (reset weekly for group leaderboard)
  weekly_xp INTEGER DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
);

-- Indexes
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group_weekly_xp ON group_members(group_id, weekly_xp DESC);

-- RLS: Members can see other members in their groups
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of groups they're in"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
  ON group_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can leave, owners/admins can remove members
CREATE POLICY "Users can leave or be removed from groups"
  ON group_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- NOW we can create the groups SELECT policy that references group_members
CREATE POLICY "Users can view groups they're members of or public groups"
  ON groups FOR SELECT
  USING (
    is_public = true OR
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. LEADERBOARD CACHE TABLE
-- Cached rankings for performance (recomputed periodically).
-- =============================================================================

CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Leaderboard type
  leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('global', 'weekly', 'monthly')),

  -- Metric being ranked
  metric TEXT NOT NULL CHECK (metric IN ('xp', 'streak', 'level', 'tasks', 'focus')),

  -- User on the leaderboard
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ranking
  rank INTEGER NOT NULL,
  value BIGINT NOT NULL,

  -- For display (cached from user_profiles)
  display_name TEXT,

  -- When this entry was computed
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Period for weekly/monthly (start date)
  period_start DATE,

  -- Constraints
  CONSTRAINT unique_leaderboard_entry UNIQUE (leaderboard_type, metric, user_id, period_start)
);

-- Indexes for efficient leaderboard queries
CREATE INDEX idx_leaderboard_cache_type_metric_rank ON leaderboard_cache(leaderboard_type, metric, rank);
CREATE INDEX idx_leaderboard_cache_type_metric_period ON leaderboard_cache(leaderboard_type, metric, period_start);
CREATE INDEX idx_leaderboard_cache_user ON leaderboard_cache(user_id);

-- RLS: Leaderboard is readable by all authenticated users
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is readable by all authenticated users"
  ON leaderboard_cache FOR SELECT
  TO authenticated
  USING (true);

-- Only system can insert/update/delete (via functions)
-- No INSERT/UPDATE/DELETE policies for regular users

-- =============================================================================
-- 6. ACTIVITY FEED TABLE
-- Records activities that friends/group members can see.
-- =============================================================================

CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who performed the activity
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Type of activity
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'task_completed',
    'quest_completed',
    'level_up',
    'achievement_unlocked',
    'streak_milestone',
    'habit_streak',
    'joined_group',
    'focus_milestone'
  )),

  -- Activity details (flexible JSON)
  metadata JSONB DEFAULT '{}',

  -- Human-readable message
  message TEXT NOT NULL,

  -- Optional reference to related entity
  reference_type TEXT,
  reference_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_user_created ON activity_feed(user_id, created_at DESC);

-- RLS: Users can see their own activities and activities of friends/group members
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities"
  ON activity_feed FOR SELECT
  USING (auth.uid() = user_id);

-- Separate policy for viewing friends' activities (added via function)
CREATE POLICY "Users can view friends activities"
  ON activity_feed FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = activity_feed.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = activity_feed.user_id))
    )
  );

-- Policy for viewing group members' activities
CREATE POLICY "Users can view group members activities"
  ON activity_feed FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = activity_feed.user_id
    )
  );

CREATE POLICY "Users can insert own activities"
  ON activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 7. NOTIFICATIONS TABLE
-- Social notifications for friend requests, nudges, achievements, etc.
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient of the notification
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'group_invite',
    'group_joined',
    'nudge',
    'achievement_shared',
    'streak_milestone_friend',
    'level_up_friend'
  )),

  -- Notification content
  title TEXT NOT NULL,
  body TEXT,

  -- Who triggered the notification (optional)
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Additional data
  metadata JSONB DEFAULT '{}',

  -- Read status
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS: Users can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications for others"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Controlled by application logic

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 8. NUDGES TABLE
-- Encouragement messages between friends (rate-limited: 1 per friend per day).
-- =============================================================================

CREATE TABLE nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Recipient
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Optional message
  message TEXT,

  -- Nudge type
  nudge_type TEXT DEFAULT 'encouragement' CHECK (nudge_type IN (
    'encouragement',
    'streak_reminder',
    'challenge',
    'celebration'
  )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_nudge CHECK (from_user_id != to_user_id)
);

-- Rate limit: 1 nudge per sender-recipient pair per day
-- Note: Enforcement done at application level to avoid timezone immutability issues

-- Indexes
CREATE INDEX idx_nudges_from_user ON nudges(from_user_id);
CREATE INDEX idx_nudges_to_user ON nudges(to_user_id);
CREATE INDEX idx_nudges_created_at ON nudges(created_at DESC);

-- RLS: Users can see nudges they sent or received
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nudges they sent or received"
  ON nudges FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send nudges"
  ON nudges FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND ((user_id = user1_id AND friend_id = user2_id)
      OR (user_id = user2_id AND friend_id = user1_id))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users are in the same group
CREATE OR REPLACE FUNCTION are_in_same_group(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = user1_id AND gm2.user_id = user2_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update group stats when member count changes
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups
    SET member_count = member_count + 1, updated_at = NOW()
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups
    SET member_count = member_count - 1, updated_at = NOW()
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_group_member_count
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

-- Function to create a notification when a friend request is sent
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    -- Get sender's display name
    SELECT display_name INTO sender_name
    FROM user_profiles
    WHERE user_id = NEW.user_id;

    -- Create notification
    INSERT INTO notifications (user_id, type, title, body, from_user_id, metadata)
    VALUES (
      NEW.friend_id,
      'friend_request',
      'New Friend Request',
      COALESCE(sender_name, 'Someone') || ' wants to be your friend!',
      NEW.user_id,
      jsonb_build_object('friendship_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();

-- Function to notify when friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get accepter's display name
    SELECT display_name INTO accepter_name
    FROM user_profiles
    WHERE user_id = NEW.friend_id;

    -- Notify the original requester
    INSERT INTO notifications (user_id, type, title, body, from_user_id, metadata)
    VALUES (
      NEW.user_id,
      'friend_accepted',
      'Friend Request Accepted',
      COALESCE(accepter_name, 'Your friend') || ' accepted your friend request!',
      NEW.friend_id,
      jsonb_build_object('friendship_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_friend_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted();

-- Function to create notification when nudge is sent
CREATE OR REPLACE FUNCTION notify_nudge()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  nudge_title TEXT;
BEGIN
  -- Get sender's display name
  SELECT display_name INTO sender_name
  FROM user_profiles
  WHERE user_id = NEW.from_user_id;

  -- Set title based on nudge type
  nudge_title := CASE NEW.nudge_type
    WHEN 'encouragement' THEN 'You got a nudge!'
    WHEN 'streak_reminder' THEN 'Streak Check!'
    WHEN 'challenge' THEN 'Challenge Received!'
    WHEN 'celebration' THEN 'Celebration!'
    ELSE 'You got a nudge!'
  END;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, body, from_user_id, metadata)
  VALUES (
    NEW.to_user_id,
    'nudge',
    nudge_title,
    COALESCE(sender_name, 'A friend') || ' nudged you: ' || COALESCE(NEW.message, 'Keep going!'),
    NEW.from_user_id,
    jsonb_build_object('nudge_id', NEW.id, 'nudge_type', NEW.nudge_type)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_nudge
  AFTER INSERT ON nudges
  FOR EACH ROW
  EXECUTE FUNCTION notify_nudge();

-- =============================================================================
-- LEADERBOARD COMPUTATION FUNCTIONS
-- =============================================================================

-- Function to refresh global leaderboard cache
CREATE OR REPLACE FUNCTION refresh_global_leaderboard(
  p_metric TEXT DEFAULT 'xp',
  p_type TEXT DEFAULT 'global'
)
RETURNS VOID AS $$
DECLARE
  v_period_start DATE;
BEGIN
  -- Determine period start for weekly/monthly
  IF p_type = 'weekly' THEN
    v_period_start := date_trunc('week', CURRENT_DATE)::DATE;
  ELSIF p_type = 'monthly' THEN
    v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  ELSE
    v_period_start := NULL;
  END IF;

  -- Delete old entries for this leaderboard type/metric
  DELETE FROM leaderboard_cache
  WHERE leaderboard_type = p_type
    AND metric = p_metric
    AND (period_start = v_period_start OR (period_start IS NULL AND v_period_start IS NULL));

  -- Insert new rankings
  INSERT INTO leaderboard_cache (leaderboard_type, metric, user_id, rank, value, display_name, period_start, computed_at)
  SELECT
    p_type,
    p_metric,
    up.user_id,
    ROW_NUMBER() OVER (ORDER BY
      CASE p_metric
        WHEN 'xp' THEN up.xp_total
        WHEN 'streak' THEN up.current_streak
        WHEN 'level' THEN up.level
        WHEN 'tasks' THEN up.lifetime_tasks_completed
        WHEN 'focus' THEN up.lifetime_focus_minutes
      END DESC
    ),
    CASE p_metric
      WHEN 'xp' THEN up.xp_total
      WHEN 'streak' THEN up.current_streak
      WHEN 'level' THEN up.level
      WHEN 'tasks' THEN up.lifetime_tasks_completed
      WHEN 'focus' THEN up.lifetime_focus_minutes
    END,
    up.display_name,
    v_period_start,
    NOW()
  FROM user_profiles up
  JOIN user_privacy_settings ups ON up.user_id = ups.user_id
  WHERE ups.show_on_global_leaderboard = true
  LIMIT 100; -- Top 100 only
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_user_privacy_settings_updated_at ON user_privacy_settings;
CREATE TRIGGER update_user_privacy_settings_updated_at
  BEFORE UPDATE ON user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE user_privacy_settings IS 'User privacy preferences for social features';
COMMENT ON TABLE friendships IS 'Two-way friend relationships with request flow';
COMMENT ON TABLE groups IS 'Accountability groups for mutual support and competition';
COMMENT ON TABLE group_members IS 'Group membership with roles (owner, admin, member)';
COMMENT ON TABLE leaderboard_cache IS 'Cached rankings for performance (refreshed periodically)';
COMMENT ON TABLE activity_feed IS 'Public activities visible to friends and group members';
COMMENT ON TABLE notifications IS 'Social notifications (friend requests, nudges, milestones)';
COMMENT ON TABLE nudges IS 'Encouragement between friends (rate-limited: 1 per day per pair)';

COMMENT ON COLUMN friendships.user_id IS 'The user who sent the friend request';
COMMENT ON COLUMN friendships.friend_id IS 'The user who received the friend request';
COMMENT ON COLUMN groups.invite_code IS 'Unique 8-character code for joining the group';
COMMENT ON COLUMN nudges.nudge_type IS 'Type of nudge: encouragement, streak_reminder, challenge, celebration';
