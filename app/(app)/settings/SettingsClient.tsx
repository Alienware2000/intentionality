"use client";

// =============================================================================
// SETTINGS CLIENT COMPONENT
// Main settings interface with integrations and AI sections.
// =============================================================================

import CalendarImportCard from "./CalendarImportCard";
import GoogleCalendarCard from "./GoogleCalendarCard";
import AILearningCard from "./AILearningCard";
import PrivacySettingsCard from "./PrivacySettingsCard";

export default function SettingsClient() {
  return (
    <div className="space-y-8">
      {/* Privacy & Social Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Privacy & Social
        </h2>
        <div className="space-y-4">
          <PrivacySettingsCard />
        </div>
      </section>

      {/* AI Assistant Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          AI Assistant (Kofi)
        </h2>
        <div className="space-y-4">
          <AILearningCard />
        </div>
      </section>

      {/* Calendar Import Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Calendar Import (ICS Feeds)
        </h2>
        <div className="space-y-4">
          <CalendarImportCard />
        </div>
      </section>

      {/* Google Calendar Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Google Calendar
        </h2>
        <div className="space-y-4">
          <GoogleCalendarCard />
        </div>
      </section>
    </div>
  );
}
