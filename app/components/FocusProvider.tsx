"use client";

// =============================================================================
// FOCUS PROVIDER CONTEXT
// Manages global focus session state including timer countdown.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { FocusSession } from "@/app/lib/types";
import { fetchApi, getErrorMessage } from "@/app/lib/api";
import { useProfile } from "./ProfileProvider";
import { useCelebration } from "./CelebrationOverlay";
import { getFocusTotalXp } from "@/app/lib/gamification";

type FocusMode = "work" | "break" | "completed" | "idle";

type FocusState = {
  session: FocusSession | null;
  timeRemaining: number; // seconds
  isRunning: boolean;
  mode: FocusMode;
  error: string | null;
};

type FocusContextType = FocusState & {
  startSession: (options?: {
    workDuration?: number;
    breakDuration?: number;
    taskId?: string;
    title?: string;
  }) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  skipToBreak: () => void;
  skipBreak: () => void;
};

const FocusContext = createContext<FocusContextType | null>(null);

type SessionResponse = { ok: true; session: FocusSession };
type SessionsResponse = { ok: true; sessions: FocusSession[] };

export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FocusState>({
    session: null,
    timeRemaining: 0,
    isRunning: false,
    mode: "idle",
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Timestamp-based timing: store when current phase ends (ms since epoch)
  const targetEndTimeRef = useRef<number | null>(null);
  const { refreshProfile } = useProfile();
  const { showXpGain, showLevelUp } = useCelebration();

  // Check for active session on mount
  useEffect(() => {
    async function checkActiveSession() {
      try {
        const data = await fetchApi<SessionsResponse>("/api/focus?status=active&limit=1");
        if (data.sessions.length > 0) {
          const session = data.sessions[0];
          const startedAt = new Date(session.started_at).getTime();
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - startedAt) / 1000);
          const totalWorkSeconds = session.work_duration * 60;
          const totalBreakSeconds = session.break_duration * 60;

          let mode: FocusMode;
          let remaining: number;
          let isRunning: boolean;

          if (elapsedSeconds >= totalWorkSeconds + totalBreakSeconds) {
            // Both work and break have elapsed → completed mode
            mode = "completed";
            remaining = 0;
            isRunning = false;
            targetEndTimeRef.current = null;
          } else if (elapsedSeconds >= totalWorkSeconds) {
            // Work done, in break period
            mode = "break";
            remaining = Math.max(0, totalWorkSeconds + totalBreakSeconds - elapsedSeconds);
            isRunning = remaining > 0;
            targetEndTimeRef.current = startedAt + (totalWorkSeconds + totalBreakSeconds) * 1000;
          } else {
            // Still in work period
            mode = "work";
            remaining = totalWorkSeconds - elapsedSeconds;
            isRunning = remaining > 0;
            targetEndTimeRef.current = startedAt + totalWorkSeconds * 1000;
          }

          setState({
            session,
            timeRemaining: remaining,
            isRunning,
            mode,
            error: null,
          });
        }
      } catch {
        // Silently ignore - no active session
      }
    }
    checkActiveSession();
  }, []);

  // Calculate time remaining from target end time (handles background tab throttling)
  const calculateTimeRemaining = useCallback(() => {
    if (!targetEndTimeRef.current) return 0;
    return Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
  }, []);

  // Handle phase transitions
  const handlePhaseComplete = useCallback(() => {
    setState((prev) => {
      if (prev.mode === "work") {
        // Switch to break
        const breakSeconds = (prev.session?.break_duration ?? 5) * 60;
        targetEndTimeRef.current = Date.now() + breakSeconds * 1000;
        return {
          ...prev,
          timeRemaining: breakSeconds,
          mode: "break",
          isRunning: breakSeconds > 0,
        };
      } else if (prev.mode === "break") {
        // Break finished, show completion screen
        targetEndTimeRef.current = null;
        return {
          ...prev,
          timeRemaining: 0,
          mode: "completed",
          isRunning: false,
        };
      }
      return prev;
    });
  }, []);

  // Timer interval - uses timestamp-based calculation
  useEffect(() => {
    if (state.isRunning && state.timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        const remaining = calculateTimeRemaining();
        if (remaining <= 0) {
          handlePhaseComplete();
        } else {
          setState((prev) => ({ ...prev, timeRemaining: remaining }));
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.timeRemaining, calculateTimeRemaining, handlePhaseComplete]);

  // Handle visibility change - recalculate time when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && state.isRunning) {
        const remaining = calculateTimeRemaining();
        if (remaining <= 0) {
          handlePhaseComplete();
        } else {
          setState((prev) => ({ ...prev, timeRemaining: remaining }));
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state.isRunning, calculateTimeRemaining, handlePhaseComplete]);

  const startSession = useCallback(
    async (options?: {
      workDuration?: number;
      breakDuration?: number;
      taskId?: string;
      title?: string;
    }) => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        const data = await fetchApi<SessionResponse>("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            work_duration: options?.workDuration ?? 25,
            break_duration: options?.breakDuration ?? 5,
            task_id: options?.taskId,
            title: options?.title,
          }),
        });

        const session = data.session;
        const workSeconds = session.work_duration * 60;
        targetEndTimeRef.current = Date.now() + workSeconds * 1000;
        setState({
          session,
          timeRemaining: workSeconds,
          isRunning: true,
          mode: "work",
          error: null,
        });
      } catch (e) {
        setState((prev) => ({ ...prev, error: getErrorMessage(e) }));
      }
    },
    []
  );

  const pauseSession = useCallback(() => {
    // Store remaining time in state, clear target (will recalculate on resume)
    const remaining = calculateTimeRemaining();
    targetEndTimeRef.current = null;
    setState((prev) => ({ ...prev, isRunning: false, timeRemaining: remaining > 0 ? remaining : prev.timeRemaining }));
  }, [calculateTimeRemaining]);

  const resumeSession = useCallback(() => {
    // Set new target based on remaining time
    setState((prev) => {
      targetEndTimeRef.current = Date.now() + prev.timeRemaining * 1000;
      return { ...prev, isRunning: true };
    });
  }, []);

  const completeSession = useCallback(async () => {
    if (!state.session) return;

    // 1. Calculate expected XP BEFORE clearing session
    const expectedXp = getFocusTotalXp(state.session.work_duration);
    const sessionId = state.session.id;

    // 2. OPTIMISTIC UPDATE - Immediately clear session and show success
    targetEndTimeRef.current = null;
    setState({
      session: null,
      timeRemaining: 0,
      isRunning: false,
      mode: "idle",
      error: null,
    });

    // 3. Trigger XP animation IMMEDIATELY (doesn't wait for API)
    showXpGain(expectedXp);

    // 4. Fire API call in background (don't block on it)
    fetchApi<{ ok: true; newLevel?: number }>("/api/focus/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((result) => {
        // Refresh profile in background to sync actual XP
        refreshProfile();
        // Trigger level-up animation if user leveled up
        if (result.newLevel) {
          showLevelUp(result.newLevel);
        }
      })
      .catch((e) => {
        // Log error but don't revert UI - session was completed
        console.error("Failed to complete session:", getErrorMessage(e));
      });
  }, [state.session, refreshProfile, showXpGain, showLevelUp]);

  const abandonSession = useCallback(async () => {
    if (!state.session) return;

    try {
      await fetchApi("/api/focus/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.session.id }),
      });

      targetEndTimeRef.current = null;
      setState({
        session: null,
        timeRemaining: 0,
        isRunning: false,
        mode: "idle",
        error: null,
      });
    } catch (e) {
      setState((prev) => ({ ...prev, error: getErrorMessage(e) }));
    }
  }, [state.session]);

  const skipToBreak = useCallback(() => {
    if (state.mode !== "work") return;
    const breakSeconds = (state.session?.break_duration ?? 5) * 60;
    targetEndTimeRef.current = Date.now() + breakSeconds * 1000;
    setState((prev) => ({
      ...prev,
      timeRemaining: breakSeconds,
      mode: "break",
      isRunning: breakSeconds > 0,
    }));
  }, [state.mode, state.session?.break_duration]);

  const skipBreak = useCallback(() => {
    if (state.mode !== "break") return;
    targetEndTimeRef.current = null;
    setState((prev) => ({
      ...prev,
      timeRemaining: 0,
      mode: "completed",
      isRunning: false,
    }));
  }, [state.mode]);

  return (
    <FocusContext.Provider
      value={{
        ...state,
        startSession,
        pauseSession,
        resumeSession,
        completeSession,
        abandonSession,
        skipToBreak,
        skipBreak,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useFocus must be used within a FocusProvider");
  }
  return context;
}
