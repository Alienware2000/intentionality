"use client";

// =============================================================================
// QUESTS CLIENT COMPONENT
// Displays user quests with tasks, progress tracking, and CRUD operations.
// Enhanced with glassmorphism, animated progress bars, and micro-interactions.
// =============================================================================

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, MoreVertical, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id, Quest, Task, Priority } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import { useProfile } from "@/app/components/ProfileProvider";
import { useOnboarding } from "@/app/components/OnboardingProvider";
import OnboardingQuestCard from "@/app/components/OnboardingQuestCard";
import { useCelebration } from "@/app/components/CelebrationOverlay";
import { useToast } from "@/app/components/Toast";
import ConfirmModal from "@/app/components/ConfirmModal";
import EditTaskModal from "@/app/components/EditTaskModal";
import PriorityPill from "@/app/components/ui/PriorityPill";
import { getTodayISO } from "@/app/lib/date-utils";

// Animation variants for staggered entrance - snappy
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
};

type QuestsResponse = { ok: true; quests: Quest[] };
type TasksResponse = { ok: true; tasks: Task[] };

export default function QuestsClient() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Edit/Delete state for quests
  const [editingQuestId, setEditingQuestId] = useState<Id | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingQuestId, setDeletingQuestId] = useState<Id | null>(null);

  // Menu state for mobile/tablet three-dot menus
  const [openQuestMenu, setOpenQuestMenu] = useState<Id | null>(null);
  const [openTaskMenu, setOpenTaskMenu] = useState<Id | null>(null);

  // Expansion state
  const [expandedQuestId, setExpandedQuestId] = useState<Id | null>(null);

  // Task creation form state
  const [addingTaskToQuest, setAddingTaskToQuest] = useState<Id | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState(getTodayISO());
  const [addingTask, setAddingTask] = useState(false);

  // Task edit/delete state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<Id | null>(null);

  const { refreshProfile } = useProfile();
  const { markStepComplete } = useOnboarding();
  const { showXpGain, showLevelUp, showQuestComplete } = useCelebration();
  const { showToast } = useToast();

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;

    try {
      const data = await fetchApi<{ ok: true; quest: Quest }>("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      setNewTitle("");
      setQuests((q) => [...q, data.quest]);
      // Mark onboarding step complete
      markStepComplete("create_quest");
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  function startEditing(quest: Quest) {
    setEditingQuestId(quest.id);
    setEditTitle(quest.title);
  }

  function cancelEditing() {
    setEditingQuestId(null);
    setEditTitle("");
  }

  async function handleEditQuest(questId: Id) {
    const title = editTitle.trim();
    if (!title) return;

    try {
      await fetchApi("/api/quests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, title }),
      });

      setQuests((qs) =>
        qs.map((q) => (q.id === questId ? { ...q, title } : q))
      );
      cancelEditing();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  async function handleDeleteQuest(questId: Id) {
    try {
      await fetchApi("/api/quests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });

      setQuests((qs) => qs.filter((q) => q.id !== questId));
      setTasks((ts) => ts.filter((t) => t.quest_id !== questId));
      setDeletingQuestId(null);
      refreshProfile();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  // -------------------------------------------------------------------------
  // Task CRUD handlers
  // -------------------------------------------------------------------------

  function resetTaskForm() {
    setAddingTaskToQuest(null);
    setNewTaskTitle("");
    setNewTaskPriority("medium");
    setNewTaskDueDate(getTodayISO());
  }

  async function handleAddTask(questId: Id) {
    const title = newTaskTitle.trim();
    if (!title) return;

    setAddingTask(true);
    try {
      const data = await fetchApi<{ ok: true; task: Task }>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quest_id: questId,
          title,
          due_date: newTaskDueDate,
          priority: newTaskPriority,
        }),
      });

      setTasks((ts) => [...ts, data.task]);
      resetTaskForm();
      // Mark onboarding step complete
      markStepComplete("add_task");
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setAddingTask(false);
    }
  }

  async function handleToggleTask(taskId: Id) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    const wasCompleted = task.completed;
    setTasks((ts) =>
      ts.map((t) =>
        t.id === taskId
          ? { ...t, completed: !wasCompleted, completed_at: wasCompleted ? null : new Date().toISOString() }
          : t
      )
    );

    try {
      const data = await fetchApi<{
        ok: true;
        xpGained?: number;
        newLevel?: number;
        questCompleted?: boolean;
        questTitle?: string;
      }>("/api/tasks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      refreshProfile();

      // Dispatch event for sidebar refresh
      window.dispatchEvent(new CustomEvent("intentionality:task-toggled"));

      // Show celebrations for completing a task
      if (!wasCompleted && data.xpGained) {
        showXpGain(data.xpGained);
        // Mark onboarding step complete
        markStepComplete("complete_task");
      }
      if (data.newLevel) {
        showLevelUp(data.newLevel);
      }
      if (data.questCompleted && data.questTitle) {
        showQuestComplete(data.questTitle);
      }
    } catch (e) {
      // Rollback on error
      setTasks((ts) =>
        ts.map((t) =>
          t.id === taskId
            ? { ...t, completed: wasCompleted, completed_at: task.completed_at }
            : t
        )
      );
      alert(getErrorMessage(e));
    }
  }

  async function handleEditTask(
    taskId: string,
    updates: { title?: string; due_date?: string; priority?: Priority; scheduled_time?: string | null; default_work_duration?: number | null }
  ) {
    try {
      await fetchApi("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });

      setTasks((ts) =>
        ts.map((t) =>
          t.id === taskId ? { ...t, ...updates } : t
        )
      );
      setEditingTask(null);
    } catch (e) {
      alert(getErrorMessage(e));
    }
  }

  async function handleDeleteTask(taskId: Id) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setTasks((ts) => ts.filter((t) => t.id !== taskId));
    setDeletingTaskId(null);

    try {
      await fetchApi("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      // Show undo toast
      showToast({
        message: "Task deleted",
        type: "default",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await fetchApi("/api/tasks/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId }),
              });
              setTasks((ts) => [...ts, task]);
            } catch {
              showToast({ message: "Failed to restore task", type: "error" });
            }
          },
        },
        duration: 6000,
      });

      refreshProfile();
    } catch (e) {
      // Rollback on error
      setTasks((ts) => [...ts, task]);
      alert(getErrorMessage(e));
    }
  }

  const loadData = useCallback(async () => {
    try {
      // Fetch all tasks - we need them all to show quest progress accurately
      // Using a wide date range to get all tasks
      const [questsData, tasksData] = await Promise.all([
        fetchApi<QuestsResponse>("/api/quests"),
        fetchApi<TasksResponse>("/api/tasks/range?start=2020-01-01&end=2030-01-01"),
      ]);

      setQuests(questsData.quests);
      setTasks(tasksData.tasks);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close menus on outside click
  useEffect(() => {
    if (!openQuestMenu && !openTaskMenu) return;
    const handleClick = () => {
      setOpenQuestMenu(null);
      setOpenTaskMenu(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openQuestMenu, openTaskMenu]);

  const tasksByQuest = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!map[task.quest_id]) map[task.quest_id] = [];
      map[task.quest_id].push(task);
    }
    return map;
  }, [tasks]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse bg-[var(--skeleton-bg)] rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[var(--accent-primary)]">Error: {error}</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Quest Form */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex gap-2 p-4 rounded-xl",
          "bg-[var(--bg-card)] glass-card",
          "border border-[var(--border-subtle)]"
        )}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex-shrink-0">
          <Target size={18} className="text-[var(--accent-primary)]" />
        </div>
        <input
          placeholder="New quest title..."
          className={cn(
            "flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]",
            "px-4 py-2.5 text-sm text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]",
            "outline-none focus:border-[var(--accent-primary)]",
            "transition-colors"
          )}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <motion.button
          onClick={handleCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-2",
            "rounded-lg bg-[var(--accent-primary)] text-white",
            "px-4 py-2.5 text-sm font-medium",
            "hover:bg-[var(--accent-primary)]/90",
            "glow-primary transition-all"
          )}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Create</span>
        </motion.button>
      </motion.div>

      {/* Virtual Onboarding Quest */}
      <OnboardingQuestCard />

      {/* Quests List */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {quests.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className={cn(
              "py-12 text-center rounded-xl",
              "bg-[var(--bg-card)] glass-card",
              "border border-[var(--border-subtle)]"
            )}
          >
            <Target size={40} className="mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
            <p className="text-sm text-[var(--text-muted)]">
              No quests yet. Create one to get started.
            </p>
          </motion.div>
        ) : (
          quests.map((quest) => {
            const questTasks = tasksByQuest[quest.id] ?? [];
            const completed = questTasks.filter((t) => t.completed).length;
            const total = questTasks.length;
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            const totalXp = questTasks.reduce((sum, t) => sum + (t.xp_value ?? 10), 0);
            const earnedXp = questTasks
              .filter((t) => t.completed)
              .reduce((sum, t) => sum + (t.xp_value ?? 10), 0);
            const isExpanded = expandedQuestId === quest.id;
            const isAddingToThisQuest = addingTaskToQuest === quest.id;

            return (
              <motion.div
                key={quest.id}
                variants={itemVariants}
                layout
                className={cn(
                  "rounded-xl",
                  "bg-[var(--bg-card)]",
                  "border border-[var(--border-subtle)]",
                  "hover:border-[var(--border-default)]",
                  "hover-lift transition-all duration-200"
                )}
              >
                {/* Quest Header - Clickable to expand */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedQuestId(isExpanded ? null : quest.id)}
                  onKeyDown={(e) => {
                    // Don't intercept keyboard events from input fields
                    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                      return;
                    }
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedQuestId(isExpanded ? null : quest.id);
                    }
                  }}
                  className="w-full p-4 text-left cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {editingQuestId === quest.id ? (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleEditQuest(quest.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            className={cn(
                              "flex-1 px-2 py-1 rounded",
                              "bg-[var(--bg-elevated)] border border-[var(--border-default)]",
                              "text-[var(--text-primary)]",
                              "focus:outline-none focus:border-[var(--accent-primary)]"
                            )}
                          />
                          <button
                            onClick={() => handleEditQuest(quest.id)}
                            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                            title="Save"
                          >
                            <Check size={14} className="text-[var(--accent-success)]" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                            title="Cancel"
                          >
                            <X size={14} className="text-[var(--text-muted)]" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h2 className="font-medium text-[var(--text-primary)] truncate">
                            {quest.title}
                          </h2>
                          {/* Three-dot menu */}
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setOpenQuestMenu(openQuestMenu === quest.id ? null : quest.id)}
                              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                              title="Quest options"
                            >
                              <MoreVertical size={18} className="text-[var(--text-muted)]" />
                            </button>
                            {/* Dropdown */}
                            {openQuestMenu === quest.id && (
                              <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg min-w-[140px] py-1">
                                <button
                                  onClick={() => {
                                    startEditing(quest);
                                    setOpenQuestMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors"
                                >
                                  <Pencil size={16} className="text-[var(--text-muted)]" />
                                  <span>Edit</span>
                                </button>
                                {quests.length > 1 && (
                                  <button
                                    onClick={() => {
                                      setDeletingQuestId(quest.id);
                                      setOpenQuestMenu(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-[var(--bg-hover)] text-red-500 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                        Created: {quest.created_at.slice(0, 10)}
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-mono font-semibold text-[var(--text-primary)]">
                          {completed}/{total}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          +{earnedXp}/{totalXp} XP
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1"
                      >
                        <ChevronDown size={18} className="text-[var(--text-muted)]" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-1.5 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
                        className={cn(
                          "h-full rounded-full",
                          percent === 100
                            ? "bg-[var(--accent-success)]"
                            : "bg-[var(--accent-primary)]"
                        )}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {total === 0 ? "No tasks yet. Click to add tasks." : `${percent}% complete`}
                    </p>
                  </div>
                </div>

                {/* Expandable Task List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
                        {/* Task List */}
                        {questTasks.length > 0 && (
                          <ul className="mt-3 space-y-2">
                            <AnimatePresence>
                              {questTasks.map((task, index) => (
                                <motion.li
                                  key={task.id}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 8, scale: 0.95 }}
                                  transition={{ duration: 0.2, delay: index * 0.03 }}
                                  className={cn(
                                    "flex items-center gap-3 py-2.5 px-3 rounded-lg",
                                    "bg-[var(--bg-elevated)]",
                                    "border border-[var(--border-subtle)]",
                                    "hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]",
                                    "transition-all duration-200",
                                    "group",
                                    task.completed && "opacity-60"
                                  )}
                                >
                                  {/* Checkbox */}
                                  <motion.button
                                    onClick={() => handleToggleTask(task.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className={cn(
                                      "flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                                      task.completed
                                        ? "bg-[var(--accent-success)] border-[var(--accent-success)]"
                                        : "border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5"
                                    )}
                                    title={task.completed ? "Mark incomplete" : "Mark complete"}
                                  >
                                    <AnimatePresence mode="wait">
                                      {task.completed && (
                                        <motion.div
                                          initial={{ scale: 0, rotate: -45 }}
                                          animate={{ scale: 1, rotate: 0 }}
                                          exit={{ scale: 0, rotate: 45 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          <Check size={14} className="text-white" />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </motion.button>

                                  {/* Task Title */}
                                  <span
                                    className={cn(
                                      "flex-1 text-sm transition-all duration-200",
                                      task.completed
                                        ? "line-through text-[var(--text-muted)]"
                                        : "text-[var(--text-primary)]"
                                    )}
                                  >
                                    {task.title}
                                  </span>

                                  <PriorityPill priority={task.priority} compact />

                                  {/* XP Badge */}
                                  <motion.span
                                    className={cn(
                                      "text-xs font-mono px-2 py-0.5 rounded-md flex-shrink-0",
                                      task.completed
                                        ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                                        : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                                    )}
                                    animate={task.completed ? { scale: [1, 1.1, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                  >
                                    {task.completed ? "+" : ""}{task.xp_value} XP
                                  </motion.span>

                                  {/* Three-dot menu for tasks */}
                                  <div className="relative">
                                    <motion.button
                                      onClick={() => setOpenTaskMenu(openTaskMenu === task.id ? null : task.id)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
                                      title="Task options"
                                    >
                                      <MoreVertical size={16} className="text-[var(--text-muted)]" />
                                    </motion.button>
                                    {/* Dropdown */}
                                    <AnimatePresence>
                                      {openTaskMenu === task.id && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                          transition={{ duration: 0.15 }}
                                          className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg min-w-[140px] py-1 glass-card"
                                        >
                                          <button
                                            onClick={() => {
                                              setEditingTask(task);
                                              setOpenTaskMenu(null);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-colors"
                                          >
                                            <Pencil size={16} className="text-[var(--text-muted)]" />
                                            <span>Edit</span>
                                          </button>
                                          <button
                                            onClick={() => {
                                              setDeletingTaskId(task.id);
                                              setOpenTaskMenu(null);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-[var(--bg-hover)] text-red-500 transition-colors"
                                          >
                                            <Trash2 size={16} />
                                            <span>Delete</span>
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </motion.li>
                              ))}
                            </AnimatePresence>
                          </ul>
                        )}

                        {/* Add Task Section */}
                        <div className="mt-4">
                          {isAddingToThisQuest ? (
                            <div className="space-y-3 p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                              {/* Task Title Input */}
                              <input
                                autoFocus
                                placeholder="Task title..."
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newTaskTitle.trim()) {
                                    handleAddTask(quest.id);
                                  }
                                  if (e.key === "Escape") {
                                    resetTaskForm();
                                  }
                                }}
                                className={cn(
                                  "w-full px-3 py-2 rounded-lg",
                                  "bg-[var(--bg-card)] border border-[var(--border-default)]",
                                  "text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                                  "focus:outline-none focus:border-[var(--accent-primary)]"
                                )}
                              />

                              {/* Priority and Due Date Row */}
                              <div className="flex flex-col sm:flex-row gap-3">
                                {/* Priority Select */}
                                <div className="flex-1">
                                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">
                                    Priority
                                  </label>
                                  <div className="flex gap-1">
                                    {(["low", "medium", "high"] as const).map((p) => (
                                      <button
                                        key={p}
                                        type="button"
                                        onClick={() => setNewTaskPriority(p)}
                                        className={cn(
                                          "flex-1 px-2 py-1.5 rounded text-xs font-medium",
                                          "border transition-all capitalize",
                                          newTaskPriority === p
                                            ? "border-current bg-[var(--bg-hover)]"
                                            : "border-transparent bg-[var(--bg-card)] text-[var(--text-muted)]"
                                        )}
                                        style={{
                                          color: newTaskPriority === p
                                            ? `var(--priority-${p})`
                                            : undefined,
                                          borderColor: newTaskPriority === p
                                            ? `var(--priority-${p})`
                                            : "transparent",
                                        }}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Due Date Picker */}
                                <div className="flex-1">
                                  <label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">
                                    Due Date
                                  </label>
                                  <input
                                    type="date"
                                    value={newTaskDueDate}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                    className={cn(
                                      "w-full px-3 py-1.5 rounded",
                                      "bg-[var(--bg-card)] border border-[var(--border-default)]",
                                      "text-sm text-[var(--text-primary)]",
                                      "focus:outline-none focus:border-[var(--accent-primary)]",
                                      "theme-color-scheme"
                                    )}
                                  />
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={resetTaskForm}
                                  className={cn(
                                    "px-3 py-1.5 text-sm rounded",
                                    "bg-[var(--bg-hover)] text-[var(--text-secondary)]",
                                    "hover:bg-[var(--bg-elevated)] transition-colors"
                                  )}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleAddTask(quest.id)}
                                  disabled={addingTask || !newTaskTitle.trim()}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded",
                                    "bg-[var(--accent-primary)] text-white",
                                    "hover:bg-[var(--accent-primary)]/80 transition-colors",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                  )}
                                >
                                  <Plus size={14} />
                                  {addingTask ? "Adding..." : "Add Task"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <motion.button
                              onClick={() => setAddingTaskToQuest(quest.id)}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className={cn(
                                "w-full flex items-center justify-center gap-2",
                                "py-3 rounded-lg border border-dashed border-[var(--border-subtle)]",
                                "text-sm text-[var(--text-muted)]",
                                "hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]",
                                "hover:bg-[var(--accent-primary)]/5",
                                "transition-all duration-200"
                              )}
                            >
                              <Plus size={16} />
                              Add Task
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </motion.section>

      {/* Delete Quest Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingQuestId !== null}
        title="Delete Quest"
        message="This will permanently delete the quest and all its tasks. This action cannot be undone."
        onConfirm={() => deletingQuestId && handleDeleteQuest(deletingQuestId)}
        onCancel={() => setDeletingQuestId(null)}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        onSave={handleEditTask}
        onClose={() => setEditingTask(null)}
      />

      {/* Delete Task Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingTaskId !== null}
        title="Delete Task"
        message="This will delete the task. You can undo this action for a short time after deletion."
        onConfirm={() => deletingTaskId && handleDeleteTask(deletingTaskId)}
        onCancel={() => setDeletingTaskId(null)}
      />
    </div>
  );
}
