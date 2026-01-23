import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Settings
        </h1>
        <div className="mt-2 h-[2px] w-24 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Configure integrations and preferences.
        </p>
      </header>

      <SettingsClient />
    </div>
  );
}
