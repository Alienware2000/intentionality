-- =============================================================================
-- FIX NOTIFICATION RLS POLICY
-- The original policy allowed anyone to insert any notification which is a
-- security issue. This restricts inserts so that:
-- 1. from_user_id must match the authenticated user, OR
-- 2. from_user_id can be NULL (system notifications)
-- =============================================================================

-- Drop the permissive insert policy
DROP POLICY IF EXISTS "Users can insert notifications for others" ON notifications;

-- Create a more restrictive insert policy
-- Users can only create notifications where they are the sender (from_user_id)
-- OR the notification is a system notification (from_user_id is NULL)
CREATE POLICY "Users can insert notifications as sender or system"
  ON notifications FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    OR from_user_id IS NULL
  );
