"use client";

// =============================================================================
// TODAY CLIENT COMPONENT
// Task management for today with side-by-side layout:
// - Left column (md+): Task list
// - Right column (md+): Schedule calendar (compact mode)
// - Mobile (<md): Stacked vertically (tasks first, schedule below)
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ISODateString, Quest, ScheduleBlock, DayOfWeek, AchievementWithProgress } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { useDayTimeline } from "@/app/lib/hooks/useDayTimeline";
import { useProfile } from "./ProfileProvider";
import { useCelebration } from "./CelebrationOverlay";
import { useOnboarding } from "./OnboardingProvider";
import DayTimeline from "./DayTimeline";
import CalendarDayView from "./CalendarDayView";
import AddScheduleModal from "./AddScheduleModal";
import { cn } from "@/app/lib/cn";
import { CalendarDays, CheckSquare } from "lucide-react";

type Props = {
  date: ISODateString;
  onTaskAction?: () => void;
};

type QuestsResponse = { ok: true; quests: Quest[] };

export default function TodayClient({ date, onTaskAction }: Props) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [questsError, setQuestsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Schedule modal state for calendar view
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDefaults, setScheduleDefaults] = useState<{
    start_time: string;
    end_time: string;
    days_of_week: DayOfWeek[];
  } | null>(null);

  const { refreshProfile } = useProfile();
  const { showXpGain, showLevelUp, showStreakMilestone, showChallengeComplete, showAchievement } = useCelebration();
  const { markStepComplete } = useOnboarding();

  // Handle task toggle celebrations
  // XP TRANSPARENCY: Each XP source is celebrated separately
  const handleTaskToggle = useCallback(
    (result: {
      xpGained?: number;
      leveledUp?: boolean;
      newLevel?: number;
      newStreak?: number;
      challengeXp?: number;
      achievementXp?: number;
      challengesCompleted?: { daily: Array<{ template?: { name?: string } }>; weekly: { template?: { name?: string } } | null };
      achievementsUnlocked?: AchievementWithProgress[];
    }) => {
      // 1. Show base task XP
      if (result.xpGained) {
        showXpGain(result.xpGained);
        markStepComplete("complete_task");
      }

      // 2. Show challenge completion celebration (with XP)
      if (result.challengeXp && result.challengeXp > 0 && result.challengesCompleted) {
        // Show toast for each completed daily challenge
        for (const challenge of result.challengesCompleted.daily) {
          const name = challenge.template?.name ?? "Daily Challenge";
          showChallengeComplete(name, result.challengeXp);
        }
        // Show toast for weekly challenge if completed
        if (result.challengesCompleted.weekly) {
          const name = result.challengesCompleted.weekly.template?.name ?? "Weekly Challenge";
          showChallengeComplete(name, result.challengeXp);
        }
      }

      // 3. Show achievement unlock celebration (with modal)
      if (result.achievementXp && result.achievementXp > 0 && result.achievementsUnlocked) {
        for (const achievement of result.achievementsUnlocked) {
          // Determine the tier from userProgress
          const tier = achievement.userProgress?.current_tier ?? "bronze";
          showAchievement(achievement, tier);
        }
      }

      // 4. Level up and streak celebrations
      if (result.leveledUp && result.newLevel) showLevelUp(result.newLevel);
      if (result.newStreak) showStreakMilestone(result.newStreak);
    },
    [showXpGain, showLevelUp, showStreakMilestone, showChallengeComplete, showAchievement, markStepComplete]
  );

  // Timeline data - shared between list and calendar views
  const timelineData = useDayTimeline(date, {
    onProfileUpdate: refreshProfile,
    onTaskToggle: handleTaskToggle,
    includeOverdue: true,
  });

  const {
    scheduledItems,
    loading: timelineLoading,
    error: timelineError,
    refresh: refreshTimeline,
    toggleScheduleBlock,
  } = timelineData;

  // Extract schedule blocks for CalendarDayView
  const calendarBlocks = useMemo(() => {
    return scheduledItems
      .filter((item): item is { type: "schedule_block"; data: ScheduleBlock; completed: boolean } =>
        item.type === "schedule_block"
      )
      .map((item) => ({ block: item.data, completed: item.completed }));
  }, [scheduledItems]);

  // Fetch quests
  const loadQuests = useCallback(async () => {
    try {
      const data = await fetchApi<QuestsResponse>("/api/quests");
      setQuests(data.quests);
    } catch (e) {
      setQuestsError(getErrorMessage(e));
    } finally {
      setQuestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refreshTimeline();
    onTaskAction?.();
  }, [onTaskAction, refreshTimeline]);

  // Handle add block from calendar click
  const handleAddBlockFromCalendar = useCallback(
    (defaults: { start_time: string; end_time: string; days_of_week: DayOfWeek[] }) => {
      setScheduleDefaults(defaults);
      setScheduleModalOpen(true);
    },
    []
  );

  // Handle schedule modal close
  const handleScheduleModalClose = useCallback(() => {
    setScheduleModalOpen(false);
    setScheduleDefaults(null);
  }, []);

  // Handle schedule saved
  const handleScheduleSaved = useCallback(async () => {
    await refreshTimeline();
    onTaskAction?.();
  }, [refreshTimeline, onTaskAction]);

  // Handle delete block
  const handleDeleteBlock = useCallback(async (blockId: string) => {
    try {
      await fetchApi("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      });
      await refreshTimeline();
      onTaskAction?.();
    } catch {
      // Silent fail - block stays
    }
  }, [refreshTimeline, onTaskAction]);

  const loading = questsLoading || timelineLoading;
  const error = questsError || timelineError;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse bg-[var(--skeleton-bg)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--accent-primary)]">Error: {error}</p>
    );
  }

  return (
    <>
      {/* Side-by-side layout on md+, stacked on mobile */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column: Tasks (list view only) */}
        <div className="flex-1 min-w-0">
          {/* Tasks section header - matches Schedule header */}
          <div className="flex items-center gap-2 mb-6">
            <CheckSquare size={14} className="text-[var(--text-muted)]" />
            <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
              Tasks
            </h3>
          </div>

          <DayTimeline
            date={date}
            showOverdue={true}
            showAddTask={true}
            quests={quests}
            onRefresh={handleRefresh}
            externalData={timelineData}
            hideCalendarView={true}
            showViewToggle={false}
            hideBlocksInList={true}
          />
        </div>

        {/* Right column: Schedule calendar (full width on mobile, fixed width on md+) */}
        <div className="w-full md:w-72 lg:w-80 xl:w-96 shrink-0">
          <div className="sticky top-4">
            {/* Schedule section header */}
            <div className="flex items-center gap-2 mb-6">
              <CalendarDays size={14} className="text-[var(--text-muted)]" />
              <h3 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                Schedule
              </h3>
            </div>

            {/* Calendar container */}
            <div className={cn(
              "rounded-xl border border-[var(--border-subtle)]",
              "glass-card-elevated",
              "overflow-hidden",
              "hover:border-[rgba(var(--accent-primary-rgb),0.2)]",
              "transition-all duration-300"
            )}>
              <CalendarDayView
                date={date}
                blocks={calendarBlocks}
                onToggleBlock={toggleScheduleBlock}
                onAddBlock={handleAddBlockFromCalendar}
                onDeleteBlock={handleDeleteBlock}
                compact={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Schedule Modal (shared for calendar interactions) */}
      <AddScheduleModal
        isOpen={scheduleModalOpen}
        onClose={handleScheduleModalClose}
        onSaved={handleScheduleSaved}
        defaultValues={scheduleDefaults}
      />
    </>
  );
}
