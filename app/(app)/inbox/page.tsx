import InboxClient from "./InboxClient";

export default async function InboxPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Brain Dump Inbox
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Unprocessed thoughts and ideas waiting to be turned into tasks.
        </p>
      </header>

      <InboxClient />
    </div>
  );
}
