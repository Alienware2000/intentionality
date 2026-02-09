"use client";

// =============================================================================
// USERNAME SETUP MODAL COMPONENT
// Blocking modal for users to set up their username.
// Appears when username is NULL (new or existing users after feature launch).
// Cannot be dismissed without completing profile setup.
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, AtSign, Sparkles, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useProfile } from "./ProfileProvider";
import { useToast } from "./Toast";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Username validation regex: 3-20 chars, lowercase alphanumeric + underscores */
const USERNAME_REGEX = /^[a-z0-9][a-z0-9_]*[a-z0-9]$|^[a-z0-9]{1,2}$/;

/** Debounce delay for availability check */
const AVAILABILITY_CHECK_DELAY = 400;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type AvailabilityStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function UsernameSetupModal() {
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("idle");
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);

  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if modal should be shown
  const shouldShow = !profileLoading && profile && profile.username === null;

  // Pre-fill display name from profile
  useEffect(() => {
    if (profile?.display_name && !displayName) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name, displayName]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  // Validate username format
  const validateUsername = useCallback((value: string): string | null => {
    if (value.length === 0) return null;
    if (value.length < 3) return "Must be at least 3 characters";
    if (value.length > 20) return "Must be 20 characters or less";
    if (!USERNAME_REGEX.test(value)) {
      return "Only letters, numbers, and underscores. Must start and end with a letter or number.";
    }
    return null;
  }, []);

  // Check username availability
  const checkAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setAvailabilityStatus("idle");
      return;
    }

    const formatErr = validateUsername(usernameToCheck);
    if (formatErr) {
      setAvailabilityStatus("invalid");
      return;
    }

    setAvailabilityStatus("checking");

    try {
      // We'll check by trying to search for this exact username
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(usernameToCheck)}`);
      const data = await res.json();

      if (data.ok) {
        // Check if any result has this exact username
        const taken = data.users?.some(
          (u: { username: string | null }) =>
            u.username?.toLowerCase() === usernameToCheck.toLowerCase()
        );
        setAvailabilityStatus(taken ? "taken" : "available");
      } else {
        // If search fails, assume available (will be caught on save)
        setAvailabilityStatus("available");
      }
    } catch {
      // On error, assume available (will be caught on save)
      setAvailabilityStatus("available");
    }
  }, [validateUsername]);

  // Handle username input change with debounced availability check
  const handleUsernameChange = useCallback(
    (value: string) => {
      const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
      setUsername(normalized);
      setSaveError(null);

      // Clear any pending check
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }

      // Validate format first
      const formatErr = validateUsername(normalized);
      setFormatError(formatErr);

      if (formatErr || normalized.length < 3) {
        setAvailabilityStatus("idle");
        return;
      }

      // Debounce availability check
      checkTimeoutRef.current = setTimeout(() => {
        checkAvailability(normalized);
      }, AVAILABILITY_CHECK_DELAY);
    },
    [validateUsername, checkAvailability]
  );

  // Handle suggest username
  const handleSuggest = useCallback(async () => {
    setIsSuggestLoading(true);
    try {
      const res = await fetch(
        `/api/profile/suggest-username?name=${encodeURIComponent(displayName || "user")}`
      );
      const data = await res.json();
      if (data.ok && data.suggestion) {
        setUsername(data.suggestion);
        setFormatError(null);
        setAvailabilityStatus("available");
      } else {
        showToast({ message: "Couldn't generate a suggestion. Try typing one!", type: "default" });
      }
    } catch {
      showToast({ message: "Couldn't generate a suggestion. Try typing one!", type: "default" });
    } finally {
      setIsSuggestLoading(false);
    }
  }, [displayName, showToast]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Validate display name
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setSaveError("Please enter your name");
      return;
    }

    // Validate username
    if (!username || username.length < 3) {
      setSaveError("Please enter a username (at least 3 characters)");
      return;
    }

    const formatErr = validateUsername(username);
    if (formatErr) {
      setSaveError(formatErr);
      return;
    }

    if (availabilityStatus === "taken") {
      setSaveError("This username is already taken");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: trimmedName,
          username: username,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        // Refresh profile to close modal
        await refreshProfile();
      } else {
        setSaveError(data.error || "Failed to save profile");
      }
    } catch {
      setSaveError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [displayName, username, validateUsername, availabilityStatus, refreshProfile]);

  // Get status icon and color
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
      case "taken":
        return {
          icon: <X size={14} />,
          color: "text-red-500",
          text: "Taken",
        };
      case "invalid":
        return {
          icon: <X size={14} />,
          color: "text-red-500",
          text: "Invalid",
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  const canSubmit =
    displayName.trim().length > 0 &&
    username.length >= 3 &&
    !formatError &&
    availabilityStatus === "available" &&
    !isSaving;

  return (
    <AnimatePresence>
      {shouldShow && (
        <>
          {/* Backdrop - non-dismissable */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "relative w-full max-w-md p-6 rounded-2xl",
                "bg-[var(--bg-card)] border border-[var(--border-default)]",
                "shadow-2xl"
              )}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium mb-3">
                  <Sparkles size={12} />
                  One last thing...
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Complete your profile
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Help friends find you on Intentionality
                </p>
              </div>

              {/* Form */}
              <div className="space-y-5">
                {/* Display Name Field */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    What should we call you?
                  </label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setSaveError(null);
                      }}
                      placeholder="Your name"
                      className={cn(
                        "w-full pl-10 pr-4 py-3 rounded-xl",
                        "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                        "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30",
                        "transition-all"
                      )}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 ml-1">
                    This appears on your profile
                  </p>
                </div>

                {/* Username Field */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Pick a username
                  </label>
                  <div className="relative">
                    <AtSign
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="username"
                      className={cn(
                        "w-full pl-10 pr-24 py-3 rounded-xl",
                        "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                        "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30",
                        "transition-all"
                      )}
                    />
                    {/* Status indicator */}
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
                  {formatError ? (
                    <p className="text-xs text-red-500 mt-1.5 ml-1">{formatError}</p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] mt-1.5 ml-1">
                      Friends search for this to find you
                    </p>
                  )}
                </div>

                {/* Suggest Button */}
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={isSuggestLoading}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
                    "min-h-[44px] sm:min-h-0",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "active:scale-[0.97] active:bg-[var(--bg-hover)]",
                    "text-sm font-medium",
                    "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
                    "hover:bg-[var(--bg-hover)] transition-all duration-100",
                    "border border-[var(--border-subtle)]",
                    "disabled:opacity-50",
                    "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                  )}
                >
                  {isSuggestLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Suggest one for me
                </button>

                {/* Error Message */}
                {saveError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-500 text-center">{saveError}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                    "min-h-[44px] sm:min-h-0",
                    "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                    "active:scale-[0.97]",
                    "text-base font-semibold",
                    "bg-[var(--accent-primary)] text-white",
                    "hover:opacity-90 transition-all duration-100",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "shadow-lg shadow-[var(--accent-primary)]/20",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
                  )}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Let's Go!"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
