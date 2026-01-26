"use client";

// =============================================================================
// ACCENT THEME SELECTOR COMPONENT
// Premium accent color picker with preview and instant application.
// Features animated selection indicators and theme descriptions.
// =============================================================================

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useTheme, ACCENT_THEMES, ACCENT_THEME_ORDER } from "../ThemeProvider";

type Props = {
  /** Show theme names and descriptions */
  showLabels?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
};

/**
 * AccentThemeSelector provides a visual picker for accent colors.
 * Can be used in settings page or as a standalone component.
 *
 * @example
 * // Compact in sidebar
 * <AccentThemeSelector size="sm" />
 *
 * @example
 * // Full display in settings
 * <AccentThemeSelector showLabels size="lg" />
 */
export default function AccentThemeSelector({
  showLabels = false,
  size = "md",
  className,
}: Props) {
  const { accent, setAccent } = useTheme();

  const sizeConfig = {
    sm: {
      swatch: "w-6 h-6",
      gap: "gap-2",
      ring: "ring-2 ring-offset-1",
    },
    md: {
      swatch: "w-8 h-8",
      gap: "gap-3",
      ring: "ring-2 ring-offset-2",
    },
    lg: {
      swatch: "w-10 h-10",
      gap: "gap-4",
      ring: "ring-[3px] ring-offset-2",
    },
  };

  const config = sizeConfig[size];

  if (showLabels) {
    return (
      <div className={cn("space-y-3", className)}>
        {ACCENT_THEME_ORDER.map((themeKey) => {
          const themeData = ACCENT_THEMES[themeKey];
          const isActive = accent === themeKey;

          return (
            <motion.button
              key={themeKey}
              type="button"
              onClick={() => setAccent(themeKey)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-xl",
                "border transition-all duration-200",
                isActive
                  ? "border-[var(--accent-primary)] bg-[rgba(var(--accent-primary-rgb),0.08)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
              )}
            >
              {/* Color swatch */}
              <div
                className={cn(
                  config.swatch,
                  "rounded-full flex-shrink-0 relative",
                  isActive && `${config.ring} ring-white/30 ring-offset-[var(--bg-card)]`
                )}
                style={{ backgroundColor: themeData.primary }}
              >
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Check size={size === "lg" ? 20 : 16} className="text-white drop-shadow-sm" />
                  </motion.div>
                )}
              </div>

              {/* Theme info */}
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {themeData.name}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {themeData.description}
                </div>
              </div>

              {/* Preview colors */}
              <div className="flex items-center gap-1.5 opacity-60">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: themeData.primary }}
                  title="Primary"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: themeData.highlight }}
                  title="Highlight"
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Compact mode - just swatches
  return (
    <div className={cn("flex items-center", config.gap, className)}>
      {ACCENT_THEME_ORDER.map((themeKey) => {
        const themeData = ACCENT_THEMES[themeKey];
        const isActive = accent === themeKey;

        return (
          <motion.button
            key={themeKey}
            type="button"
            onClick={() => setAccent(themeKey)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              config.swatch,
              "rounded-full transition-all duration-150 relative",
              isActive && `${config.ring} ring-white/40 ring-offset-[var(--bg-card)]`
            )}
            style={{ backgroundColor: themeData.primary }}
            title={`${themeData.name} - ${themeData.description}`}
          >
            {isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Check size={size === "lg" ? 18 : size === "md" ? 14 : 10} className="text-white drop-shadow-sm" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Compact inline accent selector for use in headers/toolbars.
 */
export function AccentThemeInline({ className }: { className?: string }) {
  return <AccentThemeSelector size="sm" className={className} />;
}
