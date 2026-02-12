"use client";

// =============================================================================
// GROUP SETTINGS MODAL COMPONENT
// Modal for group owners to edit group settings, transfer ownership, or delete.
// Mobile-first: bottom sheet on mobile, centered on desktop.
// =============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Trash2,
  Crown,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useSocial } from "@/app/components/SocialProvider";
import { useToast } from "@/app/components/Toast";
import { SOCIAL_LIMITS } from "@/app/lib/constants";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type GroupSettingsModalProps = {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Group data */
  group: {
    id: string;
    name: string;
    description: string | null;
  };
  /** Callback when group is deleted (to navigate away) */
  onDeleted?: () => void;
  /** Callback to open transfer ownership modal */
  onTransferOwnership?: () => void;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * GroupSettingsModal allows group owners to edit settings or delete the group.
 * Uses a key-based remount pattern to reset form state when switching groups.
 *
 * @example
 * <GroupSettingsModal
 *   isOpen={showSettings}
 *   onClose={() => setShowSettings(false)}
 *   group={{ id: "123", name: "Study Group", description: "For studying" }}
 *   onDeleted={() => router.push("/groups")}
 *   onTransferOwnership={() => setShowTransfer(true)}
 * />
 */
export default function GroupSettingsModal(props: GroupSettingsModalProps) {
  // Key-based remount: when group.id changes, the inner component remounts
  // This resets all form state without needing useEffect
  return <GroupSettingsModalInner key={props.group.id} {...props} />;
}

function GroupSettingsModalInner({
  isOpen,
  onClose,
  group,
  onDeleted,
  onTransferOwnership,
}: GroupSettingsModalProps) {
  const { updateGroup, deleteGroup } = useSocial();
  const { showToast } = useToast();

  // Form state - initialized from props, resets on remount via key
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check if form has changes
  const hasChanges =
    name.trim() !== group.name ||
    (description.trim() || null) !== group.description;

  // Handle save
  const handleSave = async () => {
    if (!hasChanges) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast({ message: "Group name is required", type: "error" });
      return;
    }

    if (trimmedName.length > SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH) {
      showToast({
        message: `Name must be ${SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH} characters or less`,
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    const success = await updateGroup(group.id, {
      name: trimmedName,
      description: description.trim() || null,
    });
    setIsSaving(false);

    if (success) {
      showToast({ message: "Group settings saved", type: "success" });
      onClose();
    } else {
      showToast({ message: "Failed to save changes", type: "error" });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteGroup(group.id);
    setIsDeleting(false);

    if (success) {
      showToast({ message: "Group deleted", type: "success" });
      onClose();
      onDeleted?.();
    } else {
      showToast({ message: "Failed to delete group", type: "error" });
      setShowDeleteConfirm(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (isSaving || isDeleting) return;
    setShowDeleteConfirm(false);
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
              "max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            )}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                  <Settings size={18} className="text-[var(--accent-primary)]" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Group Settings
                </h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isSaving || isDeleting}
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

            {/* Delete Confirmation View */}
            <AnimatePresence mode="wait">
              {showDeleteConfirm ? (
                <motion.div
                  key="delete-confirm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 space-y-4"
                >
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        Delete this group?
                      </h3>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        This will permanently delete{" "}
                        <span className="font-medium text-[var(--text-secondary)]">
                          {group.name}
                        </span>{" "}
                        and remove all members. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
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
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium",
                        "min-h-[44px]",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "bg-red-500 text-white",
                        "hover:bg-red-600 transition-colors",
                        "disabled:opacity-50"
                      )}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          Delete Group
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="settings-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="p-4 space-y-6"
                >
                  {/* Edit Form */}
                  <div className="space-y-4">
                    {/* Name field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--text-secondary)]">
                        Group Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl",
                          "min-h-[44px]",
                          "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                          "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                        )}
                        placeholder="Enter group name"
                      />
                      <p className="text-xs text-[var(--text-muted)]">
                        {name.length}/{SOCIAL_LIMITS.GROUP_NAME_MAX_LENGTH} characters
                      </p>
                    </div>

                    {/* Description field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--text-secondary)]">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={SOCIAL_LIMITS.GROUP_DESCRIPTION_MAX_LENGTH}
                        rows={3}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl resize-none",
                          "bg-[var(--bg-elevated)] border border-[var(--border-subtle)]",
                          "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
                        )}
                        placeholder="Describe what this group is about (optional)"
                      />
                      <p className="text-xs text-[var(--text-muted)]">
                        {description.length}/{SOCIAL_LIMITS.GROUP_DESCRIPTION_MAX_LENGTH}{" "}
                        characters
                      </p>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium",
                        "min-h-[44px]",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "bg-[var(--accent-primary)] text-white",
                        "hover:opacity-90 transition-opacity",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[var(--border-subtle)]" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[var(--bg-card)] px-3 text-xs text-[var(--text-muted)] uppercase tracking-wider">
                        Danger Zone
                      </span>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="space-y-3">
                    {/* Transfer Ownership */}
                    <button
                      onClick={onTransferOwnership}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                        "min-h-[44px]",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "bg-amber-500/10 border border-amber-500/20",
                        "hover:bg-amber-500/20 transition-colors",
                        "text-left"
                      )}
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Crown size={18} className="text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-amber-500">
                          Transfer Ownership
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Make another member the owner
                        </p>
                      </div>
                    </button>

                    {/* Delete Group */}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
                        "min-h-[44px]",
                        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
                        "bg-red-500/10 border border-red-500/20",
                        "hover:bg-red-500/20 transition-colors",
                        "text-left"
                      )}
                    >
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <Trash2 size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-red-500">Delete Group</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Permanently delete this group
                        </p>
                      </div>
                    </button>
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
