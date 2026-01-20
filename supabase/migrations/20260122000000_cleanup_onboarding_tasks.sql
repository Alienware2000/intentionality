-- =============================================================================
-- CLEANUP ONBOARDING TASKS MIGRATION
-- Removes all onboarding tasks and quests created by the old task-based system.
-- The new system uses metadata in user_profiles.onboarding_progress instead.
-- =============================================================================

-- Delete all onboarding tasks (tasks with onboarding_step populated)
DELETE FROM public.tasks WHERE onboarding_step IS NOT NULL;

-- Delete all onboarding quests (quests with quest_type = 'onboarding')
DELETE FROM public.quests WHERE quest_type = 'onboarding';

-- Add comment documenting the change
COMMENT ON COLUMN public.tasks.onboarding_step IS 'DEPRECATED: No longer used. Onboarding is now tracked in user_profiles.onboarding_progress';
COMMENT ON COLUMN public.quests.quest_type IS 'Type of quest: user (normal). DEPRECATED: onboarding quests are no longer created.';

-- Note: The columns (quest_type, onboarding_step) are left in place for backwards compatibility
-- They can be removed in a future migration if desired
