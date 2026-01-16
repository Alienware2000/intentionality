"use client";

// =============================================================================
// SETTINGS CLIENT COMPONENT
// Main settings interface with integrations section.
// =============================================================================

import CanvasConnectionCard from "./CanvasConnectionCard";
import CalendarImportCard from "./CalendarImportCard";
import GoogleCalendarCard from "./GoogleCalendarCard";

export default function SettingsClient() {
  return (
    <div className="space-y-8">
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

      {/* Canvas Integration Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Canvas LMS
        </h2>
        <div className="space-y-4">
          <CanvasConnectionCard />
        </div>
      </section>
    </div>
  );
}
