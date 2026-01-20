-- =============================================================================
-- ONBOARDING QUEST MIGRATION
-- Adds quest_type and archived_at columns to quests table,
-- and onboarding_step column to tasks table for the quest-based onboarding system.
-- =============================================================================

-- Add quest_type column to quests table
-- Values: 'user' (normal), 'onboarding' (system)
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS quest_type TEXT NOT NULL DEFAULT 'user';

-- Add archived_at for soft-archiving quests
ALTER TABLE public.quests
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add onboarding_step to tasks for mapping onboarding steps to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT NULL;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_quests_quest_type ON public.quests(quest_type);
CREATE INDEX IF NOT EXISTS idx_quests_archived ON public.quests(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_onboarding_step ON public.tasks(onboarding_step) WHERE onboarding_step IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.quests.quest_type IS 'Type of quest: user (normal), onboarding (system)';
COMMENT ON COLUMN public.quests.archived_at IS 'Timestamp when quest was archived (soft delete)';
COMMENT ON COLUMN public.tasks.onboarding_step IS 'Onboarding step this task represents (for onboarding quest tasks only)';
