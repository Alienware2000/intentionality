import ReviewClient from "./ReviewClient";

export default async function ReviewPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Daily Review
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Reflect on your day and plan for tomorrow. Earn up to 20 XP.
        </p>
      </header>

      <ReviewClient />
    </div>
  );
}
