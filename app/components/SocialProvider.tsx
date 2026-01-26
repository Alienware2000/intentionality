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
      const res = await fetch("/api/friends");
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

  const sendFriendRequest = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/friends", {
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

  const acceptFriendRequest = useCallback(async (friendshipId: Id): Promise<boolean> => {
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
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

  const rejectFriendRequest = useCallback(async (friendshipId: Id): Promise<boolean> => {
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
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
      const res = await fetch("/api/groups");
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

  const refreshNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const res = await fetch("/api/notifications");
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
      try {
        const res = await fetch(
          `/api/friends/search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();

        if (data.ok) {
          return data.users ?? [];
        }
        return [];
      } catch {
        return [];
      }
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
