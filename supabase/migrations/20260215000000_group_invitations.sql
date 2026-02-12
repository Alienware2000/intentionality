-- =============================================================================
-- GROUP INVITATIONS MIGRATION
-- Adds direct invitations for groups (invite by username, not just code).
--
-- Tables:
-- 1. group_invitations - Direct invitations to join a group
--
-- This supplements the existing invite code system with targeted invitations.
-- =============================================================================

-- =============================================================================
-- 1. GROUP INVITATIONS TABLE
-- Direct invitations sent by owners/admins to specific users.
-- =============================================================================

CREATE TABLE group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Group reference
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  -- User being invited
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User who sent the invitation (must be owner or admin)
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Invitation status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Constraints
  CONSTRAINT unique_group_invitation UNIQUE (group_id, invited_user_id),
  CONSTRAINT no_self_invite CHECK (invited_user_id != invited_by)
);

-- Indexes for efficient lookups
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_invited_user ON group_invitations(invited_user_id);
CREATE INDEX idx_group_invitations_invited_by ON group_invitations(invited_by);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
CREATE INDEX idx_group_invitations_pending ON group_invitations(invited_user_id, status) WHERE status = 'pending';

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations they received
CREATE POLICY "Users can view invitations they received"
  ON group_invitations FOR SELECT
  USING (auth.uid() = invited_user_id);

-- Group owners/admins can view invitations for their groups
CREATE POLICY "Group admins can view group invitations"
  ON group_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_invitations.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- Group owners/admins can create invitations
CREATE POLICY "Group admins can create invitations"
  ON group_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by
    AND EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_invitations.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- Invited users can update their invitations (to accept/decline)
CREATE POLICY "Invited users can respond to invitations"
  ON group_invitations FOR UPDATE
  USING (auth.uid() = invited_user_id);

-- Group owners/admins can delete/cancel invitations
CREATE POLICY "Group admins can delete invitations"
  ON group_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_invitations.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- TRIGGER: Send notification when invitation is created
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_group_invitation()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  group_name TEXT;
BEGIN
  -- Get inviter's display name
  SELECT display_name INTO inviter_name
  FROM user_profiles
  WHERE user_id = NEW.invited_by;

  -- Get group name
  SELECT name INTO group_name
  FROM groups
  WHERE id = NEW.group_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, body, from_user_id, metadata)
  VALUES (
    NEW.invited_user_id,
    'group_invite',
    'Group Invitation',
    COALESCE(inviter_name, 'Someone') || ' invited you to join "' || COALESCE(group_name, 'a group') || '"',
    NEW.invited_by,
    jsonb_build_object(
      'invitation_id', NEW.id,
      'group_id', NEW.group_id,
      'group_name', group_name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_group_invitation
  AFTER INSERT ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_invitation();

-- =============================================================================
-- TRIGGER: Notify inviter when invitation is accepted/declined
-- =============================================================================

CREATE OR REPLACE FUNCTION notify_invitation_response()
RETURNS TRIGGER AS $$
DECLARE
  responder_name TEXT;
  group_name TEXT;
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  -- Only trigger when status changes from pending to accepted/declined
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined') THEN
    -- Get responder's display name
    SELECT display_name INTO responder_name
    FROM user_profiles
    WHERE user_id = NEW.invited_user_id;

    -- Get group name
    SELECT name INTO group_name
    FROM groups
    WHERE id = NEW.group_id;

    IF NEW.status = 'accepted' THEN
      notif_title := 'Invitation Accepted';
      notif_body := COALESCE(responder_name, 'Someone') || ' accepted your invitation to join "' || COALESCE(group_name, 'your group') || '"';
    ELSE
      notif_title := 'Invitation Declined';
      notif_body := COALESCE(responder_name, 'Someone') || ' declined your invitation to join "' || COALESCE(group_name, 'your group') || '"';
    END IF;

    -- Notify the inviter
    INSERT INTO notifications (user_id, type, title, body, from_user_id, metadata)
    VALUES (
      NEW.invited_by,
      'group_joined', -- Reusing existing notification type
      notif_title,
      notif_body,
      NEW.invited_user_id,
      jsonb_build_object(
        'invitation_id', NEW.id,
        'group_id', NEW.group_id,
        'group_name', group_name,
        'response', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_invitation_response
  AFTER UPDATE ON group_invitations
  FOR EACH ROW
  EXECUTE FUNCTION notify_invitation_response();

-- =============================================================================
-- HELPER FUNCTION: Check if user has pending invitation to group
-- =============================================================================

CREATE OR REPLACE FUNCTION has_pending_group_invitation(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_invitations
    WHERE group_id = p_group_id
    AND invited_user_id = p_user_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE group_invitations IS 'Direct invitations to join groups (supplements invite codes)';
COMMENT ON COLUMN group_invitations.invited_by IS 'User who sent the invitation (must be owner or admin)';
COMMENT ON COLUMN group_invitations.status IS 'pending, accepted, declined, or expired';
COMMENT ON COLUMN group_invitations.expires_at IS 'Invitations expire after 7 days by default';
