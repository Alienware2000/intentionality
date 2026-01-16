// =============================================================================
// PROFILE PROVIDER
// React Context for managing user profile state across the app.
// Replaces the window event pattern with proper React state management.
// =============================================================================

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { UserProfile } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Profile context state */
type ProfileContextState = {
  /** Current user profile, null if not loaded */
  profile: UserProfile | null;
  /** Whether profile is currently loading */
  loading: boolean;
  /** Error message if profile failed to load */
  error: string | null;
  /** Refresh profile from the server */
  refreshProfile: () => Promise<void>;
  /**
   * Optimistically update profile locally.
   * Use this for immediate UI updates before server confirmation.
   */
  updateProfileLocally: (updates: Partial<UserProfile>) => void;
};

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const ProfileContext = createContext<ProfileContextState | null>(null);

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

type ProfileProviderProps = {
  children: React.ReactNode;
};

/**
 * ProfileProvider wraps the app to provide profile state to all components.
 *
 * @example
 * // In app layout:
 * <ProfileProvider>
 *   <Sidebar />
 *   <main>{children}</main>
 * </ProfileProvider>
 *
 * @example
 * // In a component:
 * const { profile, refreshProfile } = useProfile();
 * await toggleTask(taskId);
 * refreshProfile(); // Update sidebar XP
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch profile from the server
   */
  const refreshProfile = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/profile");
      const data = await res.json();

      if (data.ok) {
        setProfile(data.profile);
      } else {
        setError(data.error || "Failed to load profile");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Optimistically update profile state without fetching from server.
   * Use this for immediate UI feedback after XP-granting actions.
   */
  const updateProfileLocally = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  // Initial load
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ProfileContextState>(
    () => ({
      profile,
      loading,
      error,
      refreshProfile,
      updateProfileLocally,
    }),
    [profile, loading, error, refreshProfile, updateProfileLocally]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Hook to access profile state and actions.
 *
 * @throws Error if used outside ProfileProvider
 *
 * @example
 * const { profile, loading, refreshProfile } = useProfile();
 *
 * // After completing a task
 * await toggleTask(taskId);
 * refreshProfile();
 *
 * @example
 * // Optimistic update
 * const { profile, updateProfileLocally } = useProfile();
 * updateProfileLocally({ xp_total: profile.xp_total + 10 });
 */
export function useProfile(): ProfileContextState {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return context;
}
