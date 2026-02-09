-- =============================================================================
-- FIX GROUP MEMBERS RLS RECURSION
-- Resolves PostgreSQL error 42P17: "infinite recursion detected in policy"
--
-- ROOT CAUSE:
-- The group_members SELECT policy references the group_members table itself,
-- causing infinite recursion when Supabase tries to return inserted rows.
--
-- SOLUTION:
-- 1. Create a SECURITY DEFINER helper function that bypasses RLS
-- 2. Replace self-referencing policies with function calls
-- 3. Add join_group_by_invite_code function to handle invite code lookups
-- =============================================================================

-- Step 1: Create helper function that bypasses RLS to check membership
-- SECURITY DEFINER runs with the privileges of the function owner (superuser)
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO authenticated;

-- Step 2: Drop the problematic recursive policy on group_members
DROP POLICY IF EXISTS "Users can view members of groups they're in" ON group_members;

-- Step 3: Create new non-recursive policy using the helper function
CREATE POLICY "Users can view members of groups they're in"
  ON group_members FOR SELECT
  USING (
    user_id = auth.uid()  -- Can always see own memberships
    OR is_group_member(group_id, auth.uid())  -- Or if member of same group
  );

-- Step 4: Fix the groups SELECT policy which has the same issue
DROP POLICY IF EXISTS "Users can view groups they're members of or public groups" ON groups;
DROP POLICY IF EXISTS "Users can view groups they can access" ON groups;

CREATE POLICY "Users can view groups they can access"
  ON groups FOR SELECT
  USING (
    is_public = true
    OR owner_id = auth.uid()
    OR is_group_member(id, auth.uid())
  );

-- =============================================================================
-- JOIN GROUP BY INVITE CODE FUNCTION
-- Allows users to join groups via invite code without RLS blocking the query
-- =============================================================================

CREATE OR REPLACE FUNCTION join_group_by_invite_code(p_invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_group RECORD;
  v_user_id UUID;
  v_membership_id UUID;
  v_actual_count INTEGER;
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

  -- Return success with group data
  RETURN jsonb_build_object(
    'ok', true,
    'group', jsonb_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'description', v_group.description,
      'invite_code', v_group.invite_code,
      'member_count', v_group.member_count + 1,  -- +1 for the new member
      'max_members', v_group.max_members,
      'is_public', v_group.is_public,
      'owner_id', v_group.owner_id,
      'created_at', v_group.created_at
    ),
    'membership_id', v_membership_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_group_by_invite_code(TEXT) TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION is_group_member(UUID, UUID) IS 'SECURITY DEFINER helper to check group membership without triggering RLS recursion';
COMMENT ON FUNCTION join_group_by_invite_code(TEXT) IS 'Join a group by invite code, bypassing RLS for the lookup';

-- =============================================================================
-- ADD NEW ACTIVITY TYPES FOR LEAVE/DELETE
-- =============================================================================

-- Add 'left_group' and 'group_deleted' to allowed activity types
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_activity_type_check CHECK (
  activity_type IN (
    'task_completed',
    'quest_completed',
    'level_up',
    'achievement_unlocked',
    'streak_milestone',
    'habit_streak',
    'joined_group',
    'left_group',
    'group_deleted',
    'focus_milestone'
  )
);
