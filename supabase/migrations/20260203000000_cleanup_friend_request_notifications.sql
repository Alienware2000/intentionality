-- =============================================================================
-- CLEANUP FRIEND REQUEST NOTIFICATIONS
-- Automatically deletes friend request notifications when the friendship status
-- changes from pending (accepted, rejected, or deleted).
-- =============================================================================

-- Trigger function to clean up friend request notifications
CREATE OR REPLACE FUNCTION cleanup_friend_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- On UPDATE: if status changed from pending, delete the notification
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status != 'pending' THEN
    DELETE FROM notifications
    WHERE type = 'friend_request'
      AND user_id = OLD.friend_id
      AND (metadata->>'friendship_id')::uuid = OLD.id;
  END IF;

  -- On DELETE: delete any friend request notification for this friendship
  IF TG_OP = 'DELETE' THEN
    DELETE FROM notifications
    WHERE type = 'friend_request'
      AND user_id = OLD.friend_id
      AND (metadata->>'friendship_id')::uuid = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on friendships table
CREATE TRIGGER trigger_cleanup_friend_request_notification
  AFTER UPDATE OR DELETE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_friend_request_notification();

-- One-time cleanup: Delete stale friend request notifications
-- (where the friendship is no longer pending or no longer exists)
DELETE FROM notifications n
WHERE n.type = 'friend_request'
  AND NOT EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.id = (n.metadata->>'friendship_id')::uuid
      AND f.status = 'pending'
  );
