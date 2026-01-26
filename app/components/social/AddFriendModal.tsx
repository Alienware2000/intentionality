"use client";

// =============================================================================
// ADD FRIEND MODAL COMPONENT
// Modal for searching and adding friends by username.
// =============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  User,
  UserPlus,
  Check,
  Loader2,
  Zap,
  Flame,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useSocial } from "@/app/components/SocialProvider";
import { SOCIAL_LIMITS } from "@/app/lib/constants";
import type { UserSearchResult } from "@/app/lib/types";

type AddFriendModalProps = {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
};

/**
 * AddFriendModal allows users to search for and add friends.
 *
 * @example
 * <AddFriendModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
 */
export default function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const { searchUsers, sendFriendRequest } = useSocial();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

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

  // Debounced search - waits for user to stop typing before calling API
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

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
        const users = await searchUsers(query);
        setResults(users);
        setIsSearching(false);
      }, SOCIAL_LIMITS.SEARCH_DEBOUNCE_MS);
    },
    [searchUsers]
  );

  // Send friend request
  const handleSendRequest = async (userId: string) => {
    setSendingTo(userId);
    const success = await sendFriendRequest(userId);
    setSendingTo(null);

    if (success) {
      setSentTo((prev) => new Set(prev).add(userId));
    }
  };

  // Close and reset
  const handleClose = () => {
    setSearchQuery("");
    setResults([]);
    setSentTo(new Set());
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Add Friend
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <X size={18} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Search Input */}
              <div className="p-4">
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
                    autoFocus
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-xl",
                      "bg-[var(--bg-card)] border border-[var(--border-subtle)]",
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
              <div className="max-h-80 overflow-y-auto">
                {results.length === 0 && searchQuery.length >= 2 && !isSearching && (
                  <div className="p-8 text-center">
                    <User
                      size={32}
                      className="mx-auto text-[var(--text-muted)] mb-2"
                    />
                    <p className="text-[var(--text-secondary)]">No users found</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Try a different search term
                    </p>
                  </div>
                )}

                {results.map((user) => {
                  const isSent = sentTo.has(user.user_id) || user.has_pending_request;
                  const isSending = sendingTo === user.user_id;

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
                          <span className="flex items-center gap-1">
                            <Zap size={10} className="text-[var(--accent-primary)]" />
                            Lv.{user.level}
                          </span>
                          {user.current_streak > 0 && (
                            <span className="flex items-center gap-1">
                              <Flame size={10} className="text-[var(--accent-streak)]" />
                              {user.current_streak}d
                            </span>
                          )}
                          <span>{user.title}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {user.is_friend ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-success)]/10 text-[var(--accent-success)] text-sm">
                          <Check size={14} />
                          Friends
                        </span>
                      ) : isSent ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm">
                          <Check size={14} />
                          Sent
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user.user_id)}
                          disabled={isSending}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm",
                            "bg-[var(--accent-primary)] text-white",
                            "hover:opacity-90 transition-opacity",
                            "disabled:opacity-50"
                          )}
                        >
                          {isSending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <UserPlus size={14} />
                          )}
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <p className="text-xs text-[var(--text-muted)] text-center">
                  Friends can see your level, streak, and activity
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
