-- =============================================================================
-- BACKFILL USER TITLES
-- Updates the title column for existing users based on their current level.
-- Previously, the title was never updated when users leveled up.
-- =============================================================================

-- Backfill titles for existing users based on their current level
UPDATE user_profiles
SET title = CASE
  WHEN level >= 50 THEN 'Ascended'
  WHEN level >= 45 THEN 'Transcendent'
  WHEN level >= 40 THEN 'Mythic'
  WHEN level >= 35 THEN 'Legend'
  WHEN level >= 30 THEN 'Grandmaster'
  WHEN level >= 25 THEN 'Master'
  WHEN level >= 20 THEN 'Expert'
  WHEN level >= 15 THEN 'Adept'
  WHEN level >= 10 THEN 'Scholar'
  WHEN level >= 5 THEN 'Apprentice'
  ELSE 'Novice'
END
WHERE title IS NULL OR title != CASE
  WHEN level >= 50 THEN 'Ascended'
  WHEN level >= 45 THEN 'Transcendent'
  WHEN level >= 40 THEN 'Mythic'
  WHEN level >= 35 THEN 'Legend'
  WHEN level >= 30 THEN 'Grandmaster'
  WHEN level >= 25 THEN 'Master'
  WHEN level >= 20 THEN 'Expert'
  WHEN level >= 15 THEN 'Adept'
  WHEN level >= 10 THEN 'Scholar'
  WHEN level >= 5 THEN 'Apprentice'
  ELSE 'Novice'
END;
