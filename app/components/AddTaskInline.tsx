"use client";

// =============================================================================
// ADD TASK INLINE COMPONENT
// Compact inline task creation for use in week view and other contexts.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
import type { ISODateString, Id, Quest, Priority } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { cn } from "@/app/lib/cn";
import { useProfile } from "./ProfileProvider";

type Props = {
  date: ISODateString;
  onTaskAdded?: () => void;
  compact?: boolean;
};

type QuestsResponse = { ok: true; quests: Quest[] };

export default function AddTaskInline({ date, onTaskAdded, compact = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questId, setQuestId] = useState<Id>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshProfile } = useProfile();

  const loadQuests = useCallback(async () => {
    try {
      const data = await fetchApi<QuestsResponse>("/api/quests");
      setQuests(data.quests);
      if (data.quests.length > 0 && !questId) {
        setQuestId(data.quests[0].id);
      }
    } catch {
      // Silent fail - quests will remain empty
    }
  }, [questId]);

  useEffect(() => {
    if (isOpen && quests.length === 0) {
      loadQuests();
    }
  }, [isOpen, quests.length, loadQuests]);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed || !questId) return;

    setLoading(true);
    setError(null);

    try {
      await fetchApi("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          due_date: date,
          quest_id: questId,
          priority,
        }),
      });

      setTitle("");
      setIsOpen(false);
      onTaskAdded?.();
      refreshProfile();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setTitle("");
    setError(null);
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-1 text-xs",
          "text-[var(--text-muted)] hover:text-[var(--accent-primary)]",
          "transition-colors",
          compact ? "p-1" : "px-2 py-1"
        )}
      >
        <Plus size={14} />
        {!compact && <span>Add task</span>}
      </button>
    );
  }

  return (
    <div className="space-y-2 p-2 bg-[var(--bg-elevated)] rounded-lg">
      <div className="flex gap-2">
        <select
          value={questId}
          onChange={(e) => setQuestId(e.target.value as Id)}
          className={cn(
            "rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-2 py-1.5 text-xs text-[var(--text-primary)]",
            "outline-none focus:border-[var(--accent-primary)]"
          )}
        >
          {quests.filter((q) => q.quest_type !== "onboarding").map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className={cn(
            "rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-2 py-1.5 text-xs text-[var(--text-primary)]",
            "outline-none focus:border-[var(--accent-primary)]"
          )}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="flex gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") handleCancel();
          }}
          placeholder="Task title..."
          className={cn(
            "flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]",
            "px-2 py-1.5 text-sm text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]",
            "outline-none focus:border-[var(--accent-primary)]"
          )}
        />

        <button
          type="button"
          onClick={handleAdd}
          disabled={loading || !title.trim()}
          className={cn(
            "rounded bg-[var(--accent-primary)] px-3 py-1.5",
            "text-xs text-white font-medium",
            "hover:bg-[var(--accent-primary)]/80 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? "..." : "Add"}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          className={cn(
            "rounded px-2 py-1.5",
            "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            "hover:bg-[var(--bg-hover)] transition-colors"
          )}
        >
          <X size={16} />
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--accent-primary)]">{error}</p>
      )}
    </div>
  );
}
