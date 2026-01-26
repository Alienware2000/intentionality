"use client";

// =============================================================================
// PRIVACY SETTINGS CARD
// Manages user privacy settings for social features.
// Controls leaderboard visibility, friend requests, and profile visibility.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Globe,
  Users,
  Eye,
  Zap,
  TrendingUp,
  Flame,
  Award,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/app/lib/cn";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type PrivacySettings = {
  show_on_global_leaderboard: boolean;
  allow_friend_requests: boolean;
  show_xp: boolean;
  show_level: boolean;
  show_streak: boolean;
  show_achievements: boolean;
};

// -----------------------------------------------------------------------------
// Toggle Switch Component
// -----------------------------------------------------------------------------

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        checked ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-elevated)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// -----------------------------------------------------------------------------
// Setting Row Component
// -----------------------------------------------------------------------------

type SettingRowProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  highlight?: boolean;
};

function SettingRow({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
  highlight,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 rounded-lg",
        highlight && checked && "bg-[var(--accent-primary)]/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            checked ? "bg-[var(--accent-primary)]/10" : "bg-[var(--bg-elevated)]"
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function PrivacySettingsCard() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/privacy");
      const result = await response.json();

      if (result.ok) {
        setSettings(result.settings);
      } else {
        setError(result.error || "Failed to load privacy settings");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a single setting
  const updateSetting = async (key: keyof PrivacySettings, value: boolean) => {
    if (!settings) return;

    // Optimistic update
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
    setSuccess(null);
    setError(null);

    try {
      setSaving(true);
      const response = await fetch("/api/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      const result = await response.json();

      if (result.ok) {
        setSettings(result.settings);
        setSuccess("Saved!");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        // Revert on error
        setSettings((prev) => (prev ? { ...prev, [key]: !value } : null));
        setError(result.error || "Failed to save");
      }
    } catch (err) {
      // Revert on error
      setSettings((prev) => (prev ? { ...prev, [key]: !value } : null));
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse">
        <div className="h-6 w-48 bg-[var(--skeleton-bg)] rounded mb-4" />
        <div className="h-4 w-full bg-[var(--skeleton-bg)] rounded" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        <p className="text-[var(--text-muted)]">Unable to load privacy settings</p>
        <button
          onClick={fetchSettings}
          className="mt-2 text-sm text-[var(--accent-primary)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--bg-card)] glass-card border border-[var(--border-subtle)] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
            <Shield size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">
              Privacy & Visibility
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Control what others can see about you
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {success && (
            <span className="flex items-center gap-1 text-xs text-[var(--accent-success)]">
              <CheckCircle2 size={14} />
              {success}
            </span>
          )}
          {saving && (
            <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
          )}
          {expanded ? (
            <ChevronUp size={18} className="text-[var(--text-muted)]" />
          ) : (
            <ChevronDown size={18} className="text-[var(--text-muted)]" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Global Leaderboard Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-2">
              Leaderboards
            </h4>
            <SettingRow
              icon={
                <Globe
                  size={16}
                  className={
                    settings.show_on_global_leaderboard
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                />
              }
              title="Appear on Global Leaderboard"
              description="Let everyone see your stats and compete publicly"
              checked={settings.show_on_global_leaderboard}
              onChange={(v) => updateSetting("show_on_global_leaderboard", v)}
              disabled={saving}
              highlight
            />
          </div>

          {/* Friends Section */}
          <div className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-2">
              Friend Requests
            </h4>
            <SettingRow
              icon={
                <Users
                  size={16}
                  className={
                    settings.allow_friend_requests
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                />
              }
              title="Allow Friend Requests"
              description="Other users can send you friend requests"
              checked={settings.allow_friend_requests}
              onChange={(v) => updateSetting("allow_friend_requests", v)}
              disabled={saving}
            />
          </div>

          {/* Profile Visibility Section */}
          <div className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-2">
              Profile Visibility (to Friends)
            </h4>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Control what your friends can see on your profile
            </p>

            <SettingRow
              icon={
                <Zap
                  size={16}
                  className={
                    settings.show_xp
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                />
              }
              title="Show XP"
              description="Display your total experience points"
              checked={settings.show_xp}
              onChange={(v) => updateSetting("show_xp", v)}
              disabled={saving}
            />

            <SettingRow
              icon={
                <TrendingUp
                  size={16}
                  className={
                    settings.show_level
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                />
              }
              title="Show Level"
              description="Display your current level"
              checked={settings.show_level}
              onChange={(v) => updateSetting("show_level", v)}
              disabled={saving}
            />

            <SettingRow
              icon={
                <Flame
                  size={16}
                  className={
                    settings.show_streak
                      ? "text-[var(--accent-streak)]"
                      : "text-[var(--text-muted)]"
                  }
                />
              }
              title="Show Streak"
              description="Display your current streak days"
              checked={settings.show_streak}
              onChange={(v) => updateSetting("show_streak", v)}
              disabled={saving}
            />

            <SettingRow
              icon={
                <Award
                  size={16}
                  className={
                    settings.show_achievements
                      ? "text-amber-500"
                      : "text-[var(--text-muted)]"
                  }
                />
              }
              title="Show Achievements"
              description="Display your earned achievements"
              checked={settings.show_achievements}
              onChange={(v) => updateSetting("show_achievements", v)}
              disabled={saving}
            />
          </div>

          {/* Info note */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-muted)]">
              <Eye size={12} className="inline mr-1" />
              These settings control what others can see. Your data is always private and secure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
