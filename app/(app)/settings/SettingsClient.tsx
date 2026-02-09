"use client";

// =============================================================================
// SETTINGS CLIENT COMPONENT
// Main settings interface with appearance, integrations and AI sections.
// Uses centralized expand/collapse state for all sections.
// =============================================================================

import { useState, useCallback } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/app/lib/cn";
import CalendarImportCard from "./CalendarImportCard";
import GoogleCalendarCard from "./GoogleCalendarCard";
import AILearningCard from "./AILearningCard";
import PrivacySettingsCard from "./PrivacySettingsCard";
import AppearanceSettingsCard from "./AppearanceSettingsCard";
import PremiumSettingsCard from "./PremiumSettingsCard";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type SectionKey = "appearance" | "privacy" | "plan" | "ai" | "calendar" | "google";

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function SettingsClient() {
  // Centralized expansion state - empty set means all collapsed
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set());

  const allSections: SectionKey[] = ["appearance", "privacy", "plan", "ai", "calendar", "google"];
  const allExpanded = expandedSections.size === allSections.length;
  const noneExpanded = expandedSections.size === 0;

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      // Collapse all
      setExpandedSections(new Set());
    } else {
      // Expand all
      setExpandedSections(new Set(allSections));
    }
  }, [allExpanded]);

  const isSectionExpanded = useCallback(
    (key: SectionKey) => expandedSections.has(key),
    [expandedSections]
  );

  return (
    <div className="space-y-6">
      {/* Expand/Collapse All Toggle */}
      <div className="flex justify-end">
        <button
          onClick={toggleAll}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium",
            "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            "hover:bg-[var(--bg-hover)] transition-colors",
            "min-h-[44px] sm:min-h-0",
            "[touch-action:manipulation] [-webkit-tap-highlight-color:transparent]",
            "focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]"
          )}
        >
          <ChevronsUpDown size={16} />
          {allExpanded ? "Collapse All" : noneExpanded ? "Expand All" : "Expand All"}
        </button>
      </div>

      {/* Appearance Section */}
      <AppearanceSettingsCard
        isExpanded={isSectionExpanded("appearance")}
        onToggle={() => toggleSection("appearance")}
      />

      {/* Privacy & Social Section */}
      <PrivacySettingsCard
        isExpanded={isSectionExpanded("privacy")}
        onToggle={() => toggleSection("privacy")}
      />

      {/* Your Plan Section */}
      <PremiumSettingsCard
        isExpanded={isSectionExpanded("plan")}
        onToggle={() => toggleSection("plan")}
      />

      {/* AI Assistant Section */}
      <AILearningCard
        isExpanded={isSectionExpanded("ai")}
        onToggle={() => toggleSection("ai")}
      />

      {/* Calendar Import Section */}
      <CalendarImportCard
        isExpanded={isSectionExpanded("calendar")}
        onToggle={() => toggleSection("calendar")}
      />

      {/* Google Calendar Section */}
      <GoogleCalendarCard
        isExpanded={isSectionExpanded("google")}
        onToggle={() => toggleSection("google")}
      />
    </div>
  );
}
