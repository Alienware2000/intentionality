-- =============================================================================
-- SOCIAL ROBUSTNESS FIXES MIGRATION
-- Additional database-level solutions for social features audit findings.
--
-- This migration fixes:
-- 1. Group capacity race condition (hard limit via trigger)
--
-- =============================================================================

-- =============================================================================
-- 1. GROUP CAPACITY RACE CONDITION
-- Problem: Soft capacity check in app code allows concurrent joins to exceed max_members.
-- Solution: Database trigger to enforce hard limit atomically.
-- =============================================================================

-- Function to check group capacity before allowing a new member
-- Uses actual COUNT(*) instead of cached member_count to prevent race conditions
CREATE OR REPLACE FUNCTION check_group_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_actual_count INTEGER;
  v_max_members INTEGER;
BEGIN
  -- Lock the group row first to serialize concurrent operations
  SELECT max_members INTO v_max_members
  FROM groups
  WHERE id = NEW.group_id
  FOR UPDATE;

  -- Check if group exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Count actual members (not the cached count which can be stale)
  SELECT COUNT(*) INTO v_actual_count
  FROM group_members
  WHERE group_id = NEW.group_id;

  -- For UPDATE operations, don't count the current row being moved
  IF TG_OP = 'UPDATE' AND OLD.group_id != NEW.group_id THEN
    -- User is moving from one group to another, count is already correct
    NULL;
  END IF;

  -- Check capacity
  IF v_actual_count >= v_max_members THEN
    RAISE EXCEPTION 'Group is at maximum capacity (% members)', v_max_members
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_group_capacity IS 'Enforces group max_members limit at database level using actual COUNT(*) to prevent race conditions';

-- Create trigger for INSERT and UPDATE (drop first to allow re-running migration)
DROP TRIGGER IF EXISTS enforce_group_capacity ON group_members;
CREATE TRIGGER enforce_group_capacity
  BEFORE INSERT OR UPDATE OF group_id ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION check_group_capacity();

COMMENT ON TRIGGER enforce_group_capacity ON group_members IS 'Prevents joining groups that are at maximum capacity, including via UPDATE';

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION check_group_capacity() TO authenticated;
