-- =============================================================================
-- ADD REJECTED STATUS TO FRIENDSHIPS
-- Adds "rejected" status to keep audit trail of declined friend requests
-- instead of deleting them. This helps prevent re-request spam and provides
-- better analytics on friend request behavior.
-- =============================================================================

-- Drop the existing constraint
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_status_check;

-- Add the new constraint with "rejected" status
ALTER TABLE friendships ADD CONSTRAINT friendships_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'));

-- Create an index on rejected status for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_friendships_rejected
  ON friendships(friend_id, status)
  WHERE status = 'rejected';
