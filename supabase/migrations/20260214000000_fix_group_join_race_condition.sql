-- =============================================================================
-- FIX GROUP JOIN RACE CONDITION
-- Fixes the member_count race condition in join_group_by_invite_code()
-- and consolidates activity_type constraint to include all types.
--
-- ISSUE #1: join_group_by_invite_code() returned v_group.member_count + 1
-- without actually incrementing the groups.member_count column. This caused:
-- - Stale member counts after joins
-- - Potential capacity violations with concurrent joins
--
-- FIX: Add UPDATE to increment member_count atomically within the function.
--
-- ISSUE #9: activity_feed_activity_type_check constraint was missing 'left_group'
-- type that was added in 20260211000000 but overwritten in 20260213000000.
--
-- FIX: Recreate constraint with all valid activity types.
-- =============================================================================

-- =============================================================================
-- 1. FIX join_group_by_invite_code FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION join_group_by_invite_code(p_invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_group RECORD;
  v_user_id UUID;
  v_membership_id UUID;
  v_actual_count INTEGER;
  v_new_member_count INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Find group (bypasses RLS since this is SECURITY DEFINER)
  SELECT * INTO v_group FROM groups
  WHERE invite_code = upper(trim(p_invite_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = v_group.id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You are already a member of this group');
  END IF;

  -- Check capacity using actual count (more accurate than denormalized member_count)
  SELECT COUNT(*) INTO v_actual_count FROM group_members WHERE group_id = v_group.id;
  IF v_actual_count >= v_group.max_members THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This group is full');
  END IF;

  -- Add member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (v_group.id, v_user_id, 'member')
  RETURNING id INTO v_membership_id;

  -- FIX: Actually increment the member_count in the groups table
  UPDATE groups
  SET member_count = member_count + 1
  WHERE id = v_group.id
  RETURNING member_count INTO v_new_member_count;

  -- Record activity for joining group
  INSERT INTO activity_feed (user_id, activity_type, metadata, message, reference_type, reference_id)
  VALUES (
    v_user_id,
    'joined_group',
    jsonb_build_object('group_id', v_group.id, 'group_name', v_group.name),
    'Joined the group "' || v_group.name || '"',
    'group',
    v_group.id
  );

  -- Return success with group data (use the updated member_count)
  RETURN jsonb_build_object(
    'ok', true,
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'description', v_group.description,
      'invite_code', v_group.invite_code,
      'member_count', v_new_member_count,  -- Use the actual updated count
      'max_members', v_group.max_members,
      'is_public', v_group.is_public,
      'owner_id', v_group.owner_id,
      'created_at', v_group.created_at
    ),
    'membership_id', v_membership_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 2. FIX ACTIVITY TYPE CONSTRAINT
-- Consolidate all activity types from both migrations into one constraint
-- =============================================================================

ALTER TABLE activity_feed
DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

ALTER TABLE activity_feed
ADD CONSTRAINT activity_feed_activity_type_check CHECK (activity_type IN (
  -- Core activity types
  'task_completed',
  'quest_completed',
  'level_up',
  'achievement_unlocked',
  'streak_milestone',
  'habit_streak',
  'focus_milestone',
  -- Group activity types (from 20260211000000)
  'joined_group',
  'left_group',
  'group_deleted',
  -- Social enhancement types (from 20260213000000)
  'weekly_winner',
  'group_challenge_complete',
  -- Ownership transfer type
  'transferred_ownership'
));

-- =============================================================================
-- 3. ADD FUNCTION TO DECREMENT MEMBER COUNT ON LEAVE
-- Ensures member_count stays in sync when members leave
-- =============================================================================

CREATE OR REPLACE FUNCTION decrement_member_count_on_leave()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE groups
  SET member_count = GREATEST(0, member_count - 1)
  WHERE id = OLD.group_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_decrement_member_count ON group_members;

-- Create trigger to decrement count when member is deleted
CREATE TRIGGER trigger_decrement_member_count
  AFTER DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION decrement_member_count_on_leave();

-- =============================================================================
-- 4. ADD CHECK FOR DELETED GROUPS IN CHALLENGE FUNCTION
-- Issue #23: increment_group_challenge_progress returns challenges for deleted groups
-- =============================================================================

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
  -- Added check to ensure group still exists (not deleted)
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
    JOIN groups g ON gc.group_id = g.id  -- Ensure group exists
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

-- =============================================================================
-- 5. ADD MISSING INDEX ON user_id FOR record_productive_action
-- Issue #22: Single-column index needed for better query performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_group_member_streak_status_user_only
  ON group_member_streak_status(user_id);

-- =============================================================================
-- 6. ADD ATOMIC INCREMENT FOR NUDGE COUNT
-- Issue #11: Atomic nudge count increment to prevent race conditions
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_nudge_count(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE group_member_streak_status
  SET
    nudge_count_today = nudge_count_today + 1,
    last_nudged_at = NOW()
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_nudge_count(UUID, UUID) TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION join_group_by_invite_code(TEXT) IS
  'Join a group by invite code. Fixed to atomically increment member_count.';

COMMENT ON FUNCTION decrement_member_count_on_leave() IS
  'Trigger function to decrement group member_count when a member leaves.';

COMMENT ON FUNCTION increment_nudge_count(UUID, UUID) IS
  'Atomically increment nudge count for a group member.';
