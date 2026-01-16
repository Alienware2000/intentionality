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

type FocusMode = "work" | "break" | "idle";

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
          const remaining = Math.max(0, totalWorkSeconds - elapsedSeconds);

          setState({
            session,
            timeRemaining: remaining,
            isRunning: remaining > 0,
            mode: remaining > 0 ? "work" : "break",
            error: null,
          });
        }
      } catch (e) {
        // Silently ignore - no active session
      }
    }
    checkActiveSession();
  }, []);

  // Timer interval
  useEffect(() => {
    if (state.isRunning && state.timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          const newTime = prev.timeRemaining - 1;
          if (newTime <= 0) {
            // Timer finished
            if (prev.mode === "work") {
              // Switch to break
              const breakSeconds = (prev.session?.break_duration ?? 5) * 60;
              return {
                ...prev,
                timeRemaining: breakSeconds,
                mode: "break",
                isRunning: breakSeconds > 0,
              };
            } else {
              // Break finished, go idle
              return {
                ...prev,
                timeRemaining: 0,
                mode: "idle",
                isRunning: false,
              };
            }
          }
          return { ...prev, timeRemaining: newTime };
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.timeRemaining]);

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
        setState({
          session,
          timeRemaining: session.work_duration * 60,
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
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  const resumeSession = useCallback(() => {
    setState((prev) => ({ ...prev, isRunning: true }));
  }, []);

  const completeSession = useCallback(async () => {
    if (!state.session) return;

    try {
      await fetchApi("/api/focus/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.session.id }),
      });

      setState({
        session: null,
        timeRemaining: 0,
        isRunning: false,
        mode: "idle",
        error: null,
      });

      // Dispatch profile update event
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (e) {
      setState((prev) => ({ ...prev, error: getErrorMessage(e) }));
    }
  }, [state.session]);

  const abandonSession = useCallback(async () => {
    if (!state.session) return;

    try {
      await fetchApi("/api/focus/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.session.id }),
      });

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
    setState((prev) => ({
      ...prev,
      timeRemaining: breakSeconds,
      mode: "break",
      isRunning: breakSeconds > 0,
    }));
  }, [state.mode, state.session?.break_duration]);

  const skipBreak = useCallback(() => {
    if (state.mode !== "break") return;
    setState((prev) => ({
      ...prev,
      timeRemaining: 0,
      mode: "idle",
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
