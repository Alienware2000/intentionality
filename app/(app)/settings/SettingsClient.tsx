"use client";

// =============================================================================
// SETTINGS CLIENT COMPONENT
// Main settings interface with integrations section.
// =============================================================================

import CanvasConnectionCard from "./CanvasConnectionCard";

export default function SettingsClient() {
  return (
    <div className="space-y-8">
      {/* Integrations Section */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Integrations
        </h2>
        <div className="space-y-4">
          <CanvasConnectionCard />
        </div>
      </section>
    </div>
  );
}
