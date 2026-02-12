"use client";

// =============================================================================
// INVITE MEMBERS MODAL COMPONENT
// Modal for inviting members via share code or username search.
// Mobile-first: bottom sheet on mobile, centered on desktop.
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Share2,
  Search,
  User,
  UserPlus,
  Loader2,
  Zap,
  Flame,
  Link,
  AtSign,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useSocial } from "@/app/components/SocialProvider";
import { useToast } from "@/app/components/Toast";
import { SOCIAL_LIMITS } from "@/app/lib/constants";
import type { UserSearchResult } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type InviteMembersModalProps = {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Group data */
  group: {
    id: string;
    name: string;
    invite_code: string;
  };
  /** List of current member user IDs (to filter from search) */
  memberUserIds: string[];
};

type TabType = "code" | "username";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * InviteMembersModal allows owners/admins to invite members via code or username.
 *
 * @example
 * <InviteMembersModal
 *   isOpen={showInvite}
 *   onClose={() => setShowInvite(false)}
 *   group={{ id: "123", name: "Study Group", invite_code: "ABC123" }}
 *   memberUserIds={["user1", "user2"]}
 * />
 */
export default function InviteMembersModal({
  isOpen,
  onClose,
  group,
  memberUserIds,
}: InviteMembersModalProps) {
  const { searchUsers } = useSocial();
  const { showToast } = useToast();

  const [tab, setTab] = useState<TabType>("code");
  const [copied, setCopied] = useState(false);

  // Username search state
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [invitingTo, setInvitingTo] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());

  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Copy invite code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ message: "Failed to copy", type: "error" });
    }
  };

  // Native share
  const handleShare = async () => {
    if (!navigator.share) {
      handleCopyCode();
      return;
    }

    try {
      await navigator.share({
        title: `Join ${group.name}`,
        text: `Join my study group "${group.name}" on Intentionality! Use code: ${group.invite_code}`,
      });
    } catch (err) {
      // User cancelled share - ignore
      if ((err as Error).name !== "AbortError") {
        handleCopyCode();
      }
    }
  };

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setSearchError(null);

      // Clear any pending search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (query.length < SOCIAL_LIMITS.SEARCH_MIN_CHARS) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      // Debounce the actual API call
      debounceRef.current = setTimeout(async () => {
        try {
          const users = await searchUsers(query);
          // Filter out users who are already members
          const filtered = users.filter(
            (u) => !memberUserIds.includes(u.user_id)
          );
          setResults(filtered);
          setSearchError(null);
        } catch (e) {
          setResults([]);
          setSearchError(
            e instanceof Error ? e.message : "Search unavailable"
          );
        } finally {
          setIsSearching(false);
        }
      }, SOCIAL_LIMITS.SEARCH_DEBOUNCE_MS);
    },
    [searchUsers, memberUserIds]
  );

  // Send group invite via API
  const handleInvite = async (userId: string) => {
    setInvitingTo(userId);

    try {
      const res = await fetch(`/api/groups/${group.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();

      if (data.ok) {
        setInvitedUsers((prev) => new Set(prev).add(userId));
        showToast({
          message: data.message || "Invitation sent!",
          type: "success",
        });
      } else {
        showToast({
          message: data.error || "Failed to send invitation",
          type: "error",
        });
      }
    } catch {
      showToast({
        message: "Failed to send invitation",
        type: "error",
      });
    } finally {
      setInvitingTo(null);
    }
  };

  // Handle close
  const handleClose = () => {
    setSearchQuery("");
    setResults([]);
    setSearchError(null);
    setInvitedUsers(new Set());
    // Clear any pending debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 modal-backdrop z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              // Bottom-positioned on mobile, centered on desktop
              "fixed z-50",
              "bottom-0 left-0 right-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
              "w-full sm:w-full max-w-md",
              "rounded-t-2xl sm:rounded-2xl",
              "bg-[var(--bg-card)] glass-card border border-[var(--border-default)]",
              "max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                  <UserPlus size={18} className="text-[var(--accent-primary)]" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Invite Members
                </h2>
              </div>
              <button
                onClick={handleClose}
                className={cn(
                  "p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-all hover:rotate-[15deg]",
                  "min-h-[44px] min-w-[44px] flex items-center justify-center",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
                )}
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-2 border-b border-[var(--border-subtle)]">
              <button
                onClick={() => setTab("code")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "min-h-[44px]",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  tab === "code"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                <Link size={16} />
                Share Code
              </button>
              <button
                onClick={() => setTab("username")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "min-h-[44px]",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  tab === "username"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                )}
              >
                <AtSign size={16} />
                By Username
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {tab === "code" ? (
                <motion.div
                  key="code"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 space-y-4"
                >
                  {/* Invite Code Display */}
                  <div className="text-center space-y-4">
                    <p className="text-sm text-[var(--text-muted)]">
                      Share this code to invite members to{" "}
                      <span className="font-medium text-[var(--text-secondary)]">
                        {group.name}
                      </span>
                    </p>

                    {/* Large Code Display */}
                    <div
                      className={cn(
                        "py-6 px-8 rounded-2xl",
                        "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                      )}
                    >
                      <p className="text-3xl font-mono font-bold tracking-widest text-[var(--accent-primary)]">
                        {group.invite_code}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleCopyCode}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium",
                          "min-h-[44px]",
                          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                          "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                          "hover:bg-[var(--bg-hover)] transition-colors",
                          copied && "border-[var(--accent-success)]"
                        )}
                      >
                        {copied ? (
                          <>
                            <Check size={16} className="text-[var(--accent-success)]" />
                            <span className="text-[var(--accent-success)]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} className="text-[var(--text-muted)]" />
                            <span className="text-[var(--text-secondary)]">Copy Code</span>
                          </>
                        )}
                      </button>

                      {"share" in navigator && (
                        <button
                          onClick={handleShare}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium",
                            "min-h-[44px]",
                            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                            "bg-[var(--accent-primary)] text-white",
                            "hover:opacity-90 transition-opacity"
                          )}
                        >
                          <Share2 size={16} />
                          Share
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-[var(--border-subtle)]">
                    <p className="text-xs text-[var(--text-muted)] text-center">
                      Members can join by entering this code on the Groups page
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  {/* Search Input */}
                  <div className="p-4 border-b border-[var(--border-subtle)]">
                    <div className="relative">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search by username..."
                        className={cn(
                          "w-full pl-10 pr-4 py-3 rounded-xl",
                          "min-h-[44px]",
                          "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                          "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                        )}
                      />
                      {isSearching && (
                        <Loader2
                          size={18}
                          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--accent-primary)]"
                        />
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      Enter at least 2 characters to search
                    </p>
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto">
                    {/* Search error state */}
                    {searchError && !isSearching && (
                      <div className="p-8 text-center">
                        <User size={32} className="mx-auto text-red-400 mb-2" />
                        <p className="text-[var(--text-secondary)]">
                          Search unavailable
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {searchError}
                        </p>
                      </div>
                    )}

                    {/* No results state */}
                    {!searchError &&
                      results.length === 0 &&
                      searchQuery.length >= 2 &&
                      !isSearching && (
                        <div className="p-8 text-center">
                          <User
                            size={32}
                            className="mx-auto text-[var(--text-muted)] mb-2"
                          />
                          <p className="text-[var(--text-secondary)]">
                            No users found
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">
                            Try a different search term
                          </p>
                        </div>
                      )}

                    {/* Empty state */}
                    {searchQuery.length < 2 && !isSearching && (
                      <div className="p-8 text-center">
                        <Search
                          size={32}
                          className="mx-auto text-[var(--text-muted)] mb-2"
                        />
                        <p className="text-[var(--text-secondary)]">
                          Search for users
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          Find friends to invite to your group
                        </p>
                      </div>
                    )}

                    {results.map((user) => {
                      const isInvited = invitedUsers.has(user.user_id);
                      const isInviting = invitingTo === user.user_id;

                      return (
                        <div
                          key={user.user_id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          {/* Avatar */}
                          <div className="p-2.5 rounded-full bg-[var(--bg-elevated)]">
                            <User size={18} className="text-[var(--text-muted)]" />
                          </div>

                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {user.display_name || "Anonymous"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                              {user.username && (
                                <span className="text-[var(--accent-primary)]">
                                  @{user.username}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Zap
                                  size={10}
                                  className="text-[var(--accent-primary)]"
                                />
                                Lv.{user.level}
                              </span>
                              {user.current_streak > 0 && (
                                <span className="flex items-center gap-1">
                                  <Flame
                                    size={10}
                                    className="text-[var(--accent-streak)]"
                                  />
                                  {user.current_streak}d
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          {isInvited ? (
                            <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm">
                              <Check size={14} />
                              Invited
                            </span>
                          ) : (
                            <button
                              onClick={() => handleInvite(user.user_id)}
                              disabled={isInviting}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm",
                                "min-h-[44px] sm:min-h-0",
                                "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                                "bg-[var(--accent-primary)] text-white",
                                "hover:opacity-90 transition-opacity",
                                "disabled:opacity-50"
                              )}
                            >
                              {isInviting ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <UserPlus size={14} />
                              )}
                              Invite
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                    <p className="text-xs text-[var(--text-muted)] text-center">
                      Invitations are sent directly to users
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
