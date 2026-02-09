// =============================================================================
// SOCIAL PROVIDER
// React Context for managing social features state: friends, groups, notifications.
// Provides centralized state management for all social features.
// =============================================================================

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { fetchWithRetry } from "@/app/lib/fetch-with-retry";
import type {
  FriendWithProfile,
  FriendRequest,
  GroupWithMembership,
  NotificationWithSender,
  UserSearchResult,
  NudgeType,
  Group,
  Id,
} from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Social context state */
type SocialContextState = {
  // Friends state
  friends: FriendWithProfile[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendWithProfile[];

  // Groups state
  groups: GroupWithMembership[];

  // Notifications state
  notifications: NotificationWithSender[];
  unreadNotificationCount: number;

  // Loading/error states (granular)
  friendsLoading: boolean;
  groupsLoading: boolean;
  notificationsLoading: boolean;
  isLoading: boolean; // Combined: true if any resource is still loading
  error: string | null;

  // Friends actions
  refreshFriends: () => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<boolean>;
  acceptFriendRequest: (friendshipId: Id) => Promise<boolean>;
  rejectFriendRequest: (friendshipId: Id) => Promise<boolean>;
  removeFriend: (friendshipId: Id) => Promise<boolean>;
  blockUser: (userId: string) => Promise<boolean>;

  // Groups actions
  refreshGroups: () => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<Group | null>;
  joinGroup: (inviteCode: string) => Promise<boolean>;
  leaveGroup: (groupId: Id) => Promise<boolean>;

  // Notifications actions
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  removeNotification: (notificationId: string) => void;

  // Nudge action
  sendNudge: (
    toUserId: string,
    message?: string,
    nudgeType?: NudgeType
  ) => Promise<boolean>;

  // Search action
  searchUsers: (query: string) => Promise<UserSearchResult[]>;
};

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const SocialContext = createContext<SocialContextState | null>(null);

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

type SocialProviderProps = {
  children: React.ReactNode;
};

/**
 * SocialProvider wraps the app to provide social state to all components.
 *
 * @example
 * // In app layout:
 * <SocialProvider>
 *   <Sidebar />
 *   <main>{children}</main>
 * </SocialProvider>
 *
 * @example
 * // In a component:
 * const { friends, sendFriendRequest, notifications } = useSocial();
 */
export function SocialProvider({ children }: SocialProviderProps) {
  // Friends state
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);

  // Groups state
  const [groups, setGroups] = useState<GroupWithMembership[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationWithSender[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Granular loading states
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-fetching on initial load
  const hasFetched = useRef(false);

  // Combined loading state for backwards compatibility
  const isLoading = friendsLoading || groupsLoading || notificationsLoading;

  // ---------------------------------------------------------------------------
  // Friends Actions
  // ---------------------------------------------------------------------------

  const refreshFriends = useCallback(async () => {
    try {
      setFriendsLoading(true);
      setError(null);
      const res = await fetchWithRetry("/api/friends");
      const data = await res.json();

      if (data.ok) {
        setFriends(data.friends ?? []);
        setPendingRequests(data.pending_requests ?? []);
        setSentRequests(data.sent_requests ?? []);
      } else {
        setError(data.error || "Failed to load friends");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load friends";
      setError(message);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  // Define refreshNotifications early so it can be used by acceptFriendRequest/rejectFriendRequest
  const refreshNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const res = await fetchWithRetry("/api/notifications");
      const data = await res.json();

      if (data.ok) {
        setNotifications(data.notifications ?? []);
        setUnreadNotificationCount(data.unread_count ?? 0);
      }
    } catch {
      // Silently fail for notifications - not critical
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const sendFriendRequest = useCallback(async (userId: string): Promise<boolean> => {
    // Optimistic update: Add to sent requests immediately
    const optimisticRequest: FriendWithProfile = {
      friendship_id: `temp-${Date.now()}`, // Temporary ID
      user_id: userId,
      status: "pending",
      display_name: null,
      username: null,
      xp_total: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      title: "Novice",
      is_requester: true,
      requested_at: new Date().toISOString(),
      responded_at: null,
    };
    const previousSentRequests = sentRequests;
    setSentRequests(prev => [...prev, optimisticRequest]);

    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();

      if (data.ok) {
        // Sync with server to get accurate data
        await refreshFriends();
        return true;
      }
      // Revert on failure
      setSentRequests(previousSentRequests);
      return false;
    } catch {
      // Revert on error
      setSentRequests(previousSentRequests);
      return false;
    }
  }, [refreshFriends, sentRequests]);

  const acceptFriendRequest = useCallback(async (friendshipId: Id): Promise<boolean> => {
    // Optimistic update: Remove from pending requests immediately
    const previousPendingRequests = pendingRequests;
    const acceptedRequest = pendingRequests.find(r => r.id === friendshipId);
    setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));

    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await res.json();

      if (data.ok) {
        // Sync with server to get accurate friend list
        await refreshFriends();
        return true;
      }
      // Revert on failure
      if (acceptedRequest) {
        setPendingRequests(previousPendingRequests);
      }
      return false;
    } catch {
      // Revert on error
      if (acceptedRequest) {
        setPendingRequests(previousPendingRequests);
      }
      return false;
    }
  }, [refreshFriends, pendingRequests]);

  const rejectFriendRequest = useCallback(async (friendshipId: Id): Promise<boolean> => {
    // Optimistic update: Remove from pending requests immediately
    const previousPendingRequests = pendingRequests;
    const rejectedRequest = pendingRequests.find(r => r.id === friendshipId);
    setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));

    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const data = await res.json();

      if (data.ok) {
        // Sync with server
        await refreshFriends();
        return true;
      }
      // Revert on failure
      if (rejectedRequest) {
        setPendingRequests(previousPendingRequests);
      }
      return false;
    } catch {
      // Revert on error
      if (rejectedRequest) {
        setPendingRequests(previousPendingRequests);
      }
      return false;
    }
  }, [refreshFriends, pendingRequests]);

  const removeFriend = useCallback(async (friendshipId: Id): Promise<boolean> => {
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.ok) {
        await refreshFriends();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshFriends]);

  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/friends/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();

      if (data.ok) {
        await refreshFriends();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshFriends]);

  // ---------------------------------------------------------------------------
  // Groups Actions
  // ---------------------------------------------------------------------------

  const refreshGroups = useCallback(async () => {
    try {
      setGroupsLoading(true);
      setError(null);
      const res = await fetchWithRetry("/api/groups");
      const data = await res.json();

      if (data.ok) {
        setGroups(data.groups ?? []);
      } else {
        setError(data.error || "Failed to load groups");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load groups";
      setError(message);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const createGroup = useCallback(
    async (name: string, description?: string): Promise<Group | null> => {
      try {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description }),
        });
        const data = await res.json();

        if (data.ok) {
          await refreshGroups();
          return data.group;
        }
        return null;
      } catch {
        return null;
      }
    },
    [refreshGroups]
  );

  const joinGroup = useCallback(async (inviteCode: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      const data = await res.json();

      if (data.ok) {
        await refreshGroups();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshGroups]);

  const leaveGroup = useCallback(async (groupId: Id): Promise<boolean> => {
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.ok) {
        await refreshGroups();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshGroups]);

  // ---------------------------------------------------------------------------
  // Notifications Actions
  // ---------------------------------------------------------------------------

  // NOTE: refreshNotifications is defined earlier (after refreshFriends) so it can be
  // used by acceptFriendRequest and rejectFriendRequest without temporal dead zone issues.

  const markNotificationRead = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (data.ok) {
        // Update local state optimistically
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const markAllNotificationsRead = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      const data = await res.json();

      if (data.ok) {
        // Update local state optimistically
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
        setUnreadNotificationCount(0);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    // Note: Don't decrement unread count here - markNotificationRead already handles it
  }, []);

  // ---------------------------------------------------------------------------
  // Nudge Action
  // ---------------------------------------------------------------------------

  const sendNudge = useCallback(
    async (
      toUserId: string,
      message?: string,
      nudgeType?: NudgeType
    ): Promise<boolean> => {
      try {
        const res = await fetch("/api/friends/nudge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to_user_id: toUserId,
            message,
            nudge_type: nudgeType,
          }),
        });
        const data = await res.json();
        return data.ok;
      } catch {
        return false;
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Search Action
  // ---------------------------------------------------------------------------

  const searchUsers = useCallback(
    async (query: string): Promise<UserSearchResult[]> => {
      const res = await fetch(
        `/api/friends/search?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      if (data.ok) {
        return data.users ?? [];
      }
      // Throw error with the API error message for the UI to handle
      throw new Error(data.error || "Search failed");
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Initial Load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Prevent double-fetching on StrictMode or re-renders
    if (hasFetched.current) return;
    hasFetched.current = true;

    // Load each resource independently - no coupling between them
    // If one fails or is slow, others still load successfully
    refreshFriends();
    refreshGroups();
    refreshNotifications();
  }, [refreshFriends, refreshGroups, refreshNotifications]);

  // Store refreshNotifications in a ref to avoid interval recreation
  const refreshNotificationsRef = useRef(refreshNotifications);
  useEffect(() => {
    refreshNotificationsRef.current = refreshNotifications;
  }, [refreshNotifications]);

  // Poll notifications every 60 seconds for real-time feel
  // Using a ref to avoid recreating the interval when dependencies change
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotificationsRef.current();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const value = useMemo<SocialContextState>(
    () => ({
      // State
      friends,
      pendingRequests,
      sentRequests,
      groups,
      notifications,
      unreadNotificationCount,
      friendsLoading,
      groupsLoading,
      notificationsLoading,
      isLoading,
      error,

      // Friends actions
      refreshFriends,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      blockUser,

      // Groups actions
      refreshGroups,
      createGroup,
      joinGroup,
      leaveGroup,

      // Notifications actions
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      removeNotification,

      // Other actions
      sendNudge,
      searchUsers,
    }),
    [
      friends,
      pendingRequests,
      sentRequests,
      groups,
      notifications,
      unreadNotificationCount,
      friendsLoading,
      groupsLoading,
      notificationsLoading,
      isLoading,
      error,
      refreshFriends,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      removeFriend,
      blockUser,
      refreshGroups,
      createGroup,
      joinGroup,
      leaveGroup,
      refreshNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      removeNotification,
      sendNudge,
      searchUsers,
    ]
  );

  return (
    <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

/**
 * Hook to access social state and actions.
 *
 * @throws Error if used outside SocialProvider
 *
 * @example
 * const { friends, sendFriendRequest } = useSocial();
 *
 * // Send a friend request
 * const success = await sendFriendRequest(userId);
 *
 * @example
 * // Access notifications
 * const { notifications, unreadNotificationCount } = useSocial();
 */
export function useSocial(): SocialContextState {
  const context = useContext(SocialContext);

  if (!context) {
    throw new Error("useSocial must be used within a SocialProvider");
  }

  return context;
}
