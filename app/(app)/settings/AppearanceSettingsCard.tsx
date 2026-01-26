"use client";

// =============================================================================
// APPEARANCE SETTINGS CARD
// User-selectable accent theme, base theme, and dark/light mode settings.
// =============================================================================

import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/cn";
import { useTheme, BASE_THEMES, BASE_THEME_ORDER } from "@/app/components/ThemeProvider";
import AccentThemeSelector from "@/app/components/ui/AccentThemeSelector";

export default function AppearanceSettingsCard() {
  const { theme, setTheme, baseTheme, setBaseTheme } = useTheme();

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-6">
      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
          Accent Color
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Choose a color theme that suits your style
        </p>
        <AccentThemeSelector showLabels size="md" />
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-subtle)]" />

      {/* Background Style (Dark Mode Only) */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
          Background Style
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          {theme === "light"
            ? "Only available in dark mode"
            : "Choose your dark mode background"}
        </p>
        <div className="flex gap-3">
          {BASE_THEME_ORDER.map((base) => {
            const config = BASE_THEMES[base];
            const isSelected = baseTheme === base;
            const isDisabled = theme === "light";

            return (
              <motion.button
                key={base}
                type="button"
                onClick={() => !isDisabled && setBaseTheme(base)}
                disabled={isDisabled}
                whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg",
                  "border transition-all duration-200",
                  isDisabled && "opacity-50 cursor-not-allowed",
                  isSelected && !isDisabled
                    ? "border-[var(--accent-primary)] bg-[rgba(var(--accent-primary-rgb),0.1)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                )}
              >
                {/* Preview swatch */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg border",
                    isSelected && !isDisabled
                      ? "border-[var(--accent-primary)]"
                      : "border-[var(--border-default)]"
                  )}
                  style={{ backgroundColor: config.bgPreview }}
                />
                <div className="text-center">
                  <div className={cn(
                    "text-sm font-medium",
                    isSelected && !isDisabled
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  )}>
                    {config.name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {config.description}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-subtle)]" />

      {/* Theme Mode */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
          Theme Mode
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Choose between dark and light mode
        </p>
        <div className="flex gap-3">
          <motion.button
            type="button"
            onClick={() => setTheme("dark")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg",
              "border transition-all duration-200",
              theme === "dark"
                ? "border-[var(--accent-primary)] bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Moon size={18} />
            <span className="text-sm font-medium">Dark</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setTheme("light")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg",
              "border transition-all duration-200",
              theme === "light"
                ? "border-[var(--accent-primary)] bg-[rgba(var(--accent-primary-rgb),0.1)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
            )}
          >
            <Sun size={18} />
            <span className="text-sm font-medium">Light</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
