"use client";

// =============================================================================
// TRANSFER OWNERSHIP MODAL COMPONENT
// Modal for group owners to transfer ownership to another member.
// Mobile-first: bottom sheet on mobile, centered on desktop.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Crown,
  User,
  Loader2,
  AlertTriangle,
  Check,
  Shield,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useToast } from "@/app/components/Toast";
import type { GroupMemberRole } from "@/app/lib/types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type MemberForTransfer = {
  user_id: string;
  display_name: string | null;
  level: number;
  role: GroupMemberRole;
};

type TransferOwnershipModalProps = {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Group data */
  group: {
    id: string;
    name: string;
  };
  /** List of members (excluding owner) */
  members: MemberForTransfer[];
  /** Current user ID (owner) */
  currentUserId: string;
  /** Callback after successful transfer */
  onTransferred?: () => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * TransferOwnershipModal allows group owners to transfer ownership.
 *
 * @example
 * <TransferOwnershipModal
 *   isOpen={showTransfer}
 *   onClose={() => setShowTransfer(false)}
 *   group={{ id: "123", name: "Study Group" }}
 *   members={groupMembers}
 *   currentUserId={userId}
 *   onTransferred={() => { refresh(); setShowTransfer(false); }}
 * />
 */
export default function TransferOwnershipModal({
  isOpen,
  onClose,
  group,
  members,
  currentUserId,
  onTransferred,
}: TransferOwnershipModalProps) {
  const { showToast } = useToast();

  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Filter out the owner from the members list
  const transferableMembers = members.filter(
    (m) => m.user_id !== currentUserId && m.role !== "owner"
  );

  // Handle transfer
  const handleTransfer = async () => {
    if (!selectedMember) return;

    setIsTransferring(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_owner_id: selectedMember }),
      });
      const data = await res.json();

      if (data.ok) {
        showToast({ message: "Ownership transferred", type: "success" });
        handleClose();
        onTransferred?.();
      } else {
        showToast({
          message: data.error || "Failed to transfer ownership",
          type: "error",
        });
        setShowConfirm(false);
      }
    } catch {
      showToast({ message: "Failed to transfer ownership", type: "error" });
      setShowConfirm(false);
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (isTransferring) return;
    setSelectedMember(null);
    setShowConfirm(false);
    onClose();
  };

  // Get selected member details for confirmation
  const selectedMemberDetails = transferableMembers.find(
    (m) => m.user_id === selectedMember
  );

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
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Crown size={18} className="text-amber-500" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Transfer Ownership
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isTransferring}
                className={cn(
                  "p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-all hover:rotate-[15deg]",
                  "min-h-[44px] min-w-[44px] flex items-center justify-center",
                  "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                  "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]",
                  "disabled:opacity-50"
                )}
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Confirmation View */}
            <AnimatePresence mode="wait">
              {showConfirm && selectedMemberDetails ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 space-y-4"
                >
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <AlertTriangle size={20} className="text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        Transfer ownership?
                      </h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-secondary)]">
                          {selectedMemberDetails.display_name || "This member"}
                        </span>{" "}
                        will become the new owner of{" "}
                        <span className="font-medium text-[var(--text-secondary)]">
                          {group.name}
                        </span>
                        . You will become an admin.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={isTransferring}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-medium",
                        "min-h-[44px]",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
                        "hover:bg-[var(--bg-hover)] transition-colors",
                        "disabled:opacity-50"
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTransfer}
                      disabled={isTransferring}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium",
                        "min-h-[44px]",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "bg-amber-500 text-white",
                        "hover:bg-amber-600 transition-colors",
                        "disabled:opacity-50"
                      )}
                    >
                      {isTransferring ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Transferring...
                        </>
                      ) : (
                        <>
                          <Crown size={16} />
                          Transfer
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  {/* Info */}
                  <div className="p-4 border-b border-[var(--border-subtle)]">
                    <p className="text-sm text-[var(--text-muted)]">
                      Select a member to become the new owner of{" "}
                      <span className="font-medium text-[var(--text-secondary)]">
                        {group.name}
                      </span>
                    </p>
                  </div>

                  {/* Members List */}
                  <div className="flex-1 overflow-y-auto">
                    {transferableMembers.length === 0 ? (
                      <div className="p-8 text-center">
                        <User
                          size={32}
                          className="mx-auto text-[var(--text-muted)] mb-2"
                        />
                        <p className="text-[var(--text-secondary)]">
                          No other members
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          Invite members to transfer ownership
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {transferableMembers.map((member) => (
                          <button
                            key={member.user_id}
                            onClick={() => setSelectedMember(member.user_id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                              "min-h-[44px]",
                              "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                              selectedMember === member.user_id
                                ? "bg-amber-500/10 border border-amber-500/30"
                                : "hover:bg-[var(--bg-hover)] border border-transparent"
                            )}
                          >
                            {/* Avatar */}
                            <div
                              className={cn(
                                "p-2.5 rounded-full",
                                member.role === "admin"
                                  ? "bg-[var(--accent-primary)]/10"
                                  : "bg-[var(--bg-elevated)]"
                              )}
                            >
                              <User
                                size={18}
                                className={
                                  member.role === "admin"
                                    ? "text-[var(--accent-primary)]"
                                    : "text-[var(--text-muted)]"
                                }
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-[var(--text-primary)] truncate">
                                  {member.display_name || "Anonymous"}
                                </p>
                                {member.role === "admin" && (
                                  <Shield
                                    size={12}
                                    className="text-[var(--accent-primary)]"
                                  />
                                )}
                              </div>
                              <p className="text-xs text-[var(--text-muted)]">
                                Lv.{member.level}
                              </p>
                            </div>

                            {/* Selection indicator */}
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                selectedMember === member.user_id
                                  ? "border-amber-500 bg-amber-500"
                                  : "border-[var(--border-default)]"
                              )}
                            >
                              {selectedMember === member.user_id && (
                                <Check size={12} className="text-white" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {transferableMembers.length > 0 && (
                    <div className="p-4 border-t border-[var(--border-subtle)]">
                      <button
                        onClick={() => setShowConfirm(true)}
                        disabled={!selectedMember}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium",
                          "min-h-[44px]",
                          "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                          "bg-amber-500 text-white",
                          "hover:bg-amber-600 transition-colors",
                          "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        <Crown size={16} />
                        Continue
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
