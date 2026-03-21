// =============================================================================
// TOGGLE SWITCH COMPONENT
// Shared accessible toggle switch used in privacy settings and leaderboard.
// =============================================================================

import { cn } from "@/app/lib/cn";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export default function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
        "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
        checked ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-elevated)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out self-center",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
