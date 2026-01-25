import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Configure integrations and preferences.
        </p>
      </header>

      <SettingsClient />
    </div>
  );
}
