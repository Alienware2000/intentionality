"use client";

// =============================================================================
// PROFILE SETTINGS CARD
// Manages username editing and invite link sharing.
// Part of the settings page for profile customization.
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import {
  User,
  AtSign,
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Share2,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useProfile } from "@/app/components/ProfileProvider";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Username validation regex: 3-20 chars, lowercase alphanumeric + underscores */
const USERNAME_REGEX = /^[a-z0-9][a-z0-9_]*[a-z0-9]$|^[a-z0-9]{1,2}$/;

/** Debounce delay for availability check */
const AVAILABILITY_CHECK_DELAY = 400;

/** Base URL for invite links */
const INVITE_BASE_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/u/`
    : "https://intentionality.app/u/";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "current";

type ProfileSettingsCardProps = {
  isExpanded?: boolean;
  onToggle?: () => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ProfileSettingsCard({
  isExpanded: controlledExpanded,
  onToggle,
}: ProfileSettingsCardProps) {
  const { profile, refreshProfile, loading: profileLoading } = useProfile();

  // Username editing state
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("idle");
  const [formatError, setFormatError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Display name editing state
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  // Invite link state
  const [copied, setCopied] = useState(false);

  // Expansion state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  // Validate username format
  const validateUsername = useCallback((value: string): string | null => {
    if (value.length === 0) return null;
    if (value.length < 3) return "Must be at least 3 characters";
    if (value.length > 20) return "Must be 20 characters or less";
    if (!USERNAME_REGEX.test(value)) {
      return "Only letters, numbers, and underscores";
    }
    return null;
  }, []);

  // Check username availability
  const checkAvailability = useCallback(
    async (usernameToCheck: string) => {
      if (!usernameToCheck || usernameToCheck.length < 3) {
        setAvailabilityStatus("idle");
        return;
      }

      // If it's the current username, mark as current
      if (profile?.username?.toLowerCase() === usernameToCheck.toLowerCase()) {
        setAvailabilityStatus("current");
        return;
      }

      const formatErr = validateUsername(usernameToCheck);
      if (formatErr) {
        setAvailabilityStatus("invalid");
        return;
      }

      setAvailabilityStatus("checking");

      try {
        const res = await fetch(
          `/api/friends/search?q=${encodeURIComponent(usernameToCheck)}`
        );
        const data = await res.json();

        if (data.ok) {
          const taken = data.users?.some(
            (u: { username: string | null }) =>
              u.username?.toLowerCase() === usernameToCheck.toLowerCase()
          );
          setAvailabilityStatus(taken ? "taken" : "available");
        } else {
          setAvailabilityStatus("available");
        }
      } catch {
        setAvailabilityStatus("available");
      }
    },
    [profile?.username, validateUsername]
  );

  // Handle username input change
  const handleUsernameChange = useCallback(
    (value: string) => {
      const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
      setNewUsername(normalized);
      setSaveError(null);
      setSaveSuccess(false);

      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }

      const formatErr = validateUsername(normalized);
      setFormatError(formatErr);

      if (formatErr || normalized.length < 3) {
        setAvailabilityStatus("idle");
        return;
      }

      checkTimeoutRef.current = setTimeout(() => {
        checkAvailability(normalized);
      }, AVAILABILITY_CHECK_DELAY);
    },
    [validateUsername, checkAvailability]
  );

  // Start editing username
  const startEditingUsername = () => {
    setEditingUsername(true);
    setNewUsername(profile?.username || "");
    setAvailabilityStatus(profile?.username ? "current" : "idle");
    setFormatError(null);
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Cancel editing username
  const cancelEditingUsername = () => {
    setEditingUsername(false);
    setNewUsername("");
    setAvailabilityStatus("idle");
    setFormatError(null);
    setSaveError(null);
  };

  // Save username
  const saveUsername = async () => {
    if (!newUsername || formatError) return;
    if (availabilityStatus !== "available" && availabilityStatus !== "current") return;
    if (newUsername === profile?.username) {
      cancelEditingUsername();
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await res.json();

      if (data.ok) {
        await refreshProfile();
        setSaveSuccess(true);
        setTimeout(() => {
          setEditingUsername(false);
          setSaveSuccess(false);
        }, 1500);
      } else {
        setSaveError(data.error || "Failed to save");
      }
    } catch {
      setSaveError("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Start editing display name
  const startEditingName = () => {
    setEditingName(true);
    setNewDisplayName(profile?.display_name || "");
    setDisplayNameError(null);
  };

  // Save display name
  const saveDisplayName = async () => {
    if (!newDisplayName.trim()) return;
    if (newDisplayName.trim() === profile?.display_name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setDisplayNameError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: newDisplayName.trim() }),
      });

      const data = await res.json();

      if (data.ok) {
        await refreshProfile();
        setEditingName(false);
      } else {
        setDisplayNameError(data.error || "Failed to save");
      }
    } catch {
      setDisplayNameError("An error occurred");
    } finally {
      setSavingName(false);
    }
  };

  // Copy invite link
  const copyInviteLink = async () => {
    if (!profile?.username) return;

    const link = `${INVITE_BASE_URL}${profile.username}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Share invite link (Web Share API)
  const shareInviteLink = async () => {
    if (!profile?.username) return;

    const link = `${INVITE_BASE_URL}${profile.username}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Intentionality!",
          text: `Let's stay productive together on Intentionality!`,
          url: link,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
        copyInviteLink();
      }
    } else {
      copyInviteLink();
    }
  };

  // Get status display for username
  const getStatusDisplay = () => {
    switch (availabilityStatus) {
      case "checking":
        return {
          icon: <Loader2 size={14} className="animate-spin" />,
          color: "text-[var(--text-muted)]",
          text: "Checking...",
        };
      case "available":
        return {
          icon: <Check size={14} />,
          color: "text-[var(--accent-success)]",
          text: "Available",
        };
      case "current":
        return {
          icon: <Check size={14} />,
          color: "text-[var(--text-muted)]",
          text: "Current",
        };
      case "taken":
        return {
          icon: null,
          color: "text-red-500",
          text: "Taken",
        };
      case "invalid":
        return {
          icon: null,
          color: "text-red-500",
          text: "Invalid",
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  if (profileLoading) {
    return (
      <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse">
        <div className="h-6 w-48 bg-[var(--skeleton-bg)] rounded mb-4" />
        <div className="h-4 w-full bg-[var(--skeleton-bg)] rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--bg-card)] glass-card border border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className={cn(
          "w-full flex items-center justify-between p-4 text-left",
          "hover:bg-[var(--bg-hover)] transition-colors",
          "min-h-[44px]",
          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
          "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
            <User size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Profile & Sharing</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {profile?.username ? `@${profile.username}` : "Set up your username"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-[var(--text-muted)]" />
        ) : (
          <ChevronDown size={18} className="text-[var(--text-muted)]" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-6">
          {/* Display Name Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
              Display Name
            </h4>
            {editingName ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => {
                      setNewDisplayName(e.target.value);
                      setDisplayNameError(null);
                    }}
                    placeholder="Your name"
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg",
                      "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                    )}
                  />
                  <button
                    onClick={saveDisplayName}
                    disabled={savingName || !newDisplayName.trim()}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium",
                      "bg-[var(--accent-primary)] text-white",
                      "disabled:opacity-50"
                    )}
                  >
                    {savingName ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  >
                    Cancel
                  </button>
                </div>
                {displayNameError && (
                  <p className="text-xs text-red-500">{displayNameError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[var(--text-muted)]" />
                  <span className="text-[var(--text-primary)]">
                    {profile?.display_name || "Not set"}
                  </span>
                </div>
                <button
                  onClick={startEditingName}
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
              Username
            </h4>
            {editingUsername ? (
              <div className="space-y-2">
                <div className="relative">
                  <AtSign
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="username"
                    className={cn(
                      "w-full pl-9 pr-24 py-2 rounded-lg",
                      "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                      "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                    )}
                  />
                  {statusDisplay && (
                    <div
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs",
                        statusDisplay.color
                      )}
                    >
                      {statusDisplay.icon}
                      <span>{statusDisplay.text}</span>
                    </div>
                  )}
                </div>
                {formatError && (
                  <p className="text-xs text-red-500">{formatError}</p>
                )}
                {saveError && (
                  <p className="text-xs text-red-500">{saveError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={saveUsername}
                    disabled={
                      saving ||
                      !!formatError ||
                      (availabilityStatus !== "available" && availabilityStatus !== "current")
                    }
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium",
                      "bg-[var(--accent-primary)] text-white",
                      "disabled:opacity-50"
                    )}
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : saveSuccess ? (
                      <>
                        <Check size={14} /> Saved!
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                  <button
                    onClick={cancelEditingUsername}
                    className="px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
                <div className="flex items-center gap-2">
                  <AtSign size={16} className="text-[var(--text-muted)]" />
                  <span className="text-[var(--text-primary)]">
                    {profile?.username ? `@${profile.username}` : "Not set"}
                  </span>
                </div>
                <button
                  onClick={startEditingUsername}
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  {profile?.username ? "Edit" : "Set up"}
                </button>
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              Friends can find you by searching for your username
            </p>
          </div>

          {/* Invite Link Section */}
          {profile?.username && (
            <div className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
              <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                Share Your Profile
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                Send this link to friends so they can find you on Intentionality
              </p>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <Link2 size={16} className="text-[var(--text-muted)] shrink-0" />
                <span className="flex-1 text-sm text-[var(--text-primary)] truncate font-mono">
                  {INVITE_BASE_URL}{profile.username}
                </span>
                <button
                  onClick={copyInviteLink}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                    copied
                      ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                      : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  {copied ? (
                    <>
                      <Check size={12} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy
                    </>
                  )}
                </button>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <button
                    onClick={shareInviteLink}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    <Share2 size={12} /> Share
                  </button>
                )}
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                When friends join through your link, you&apos;ll be automatically connected!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
