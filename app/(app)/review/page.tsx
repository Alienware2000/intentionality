import ReviewClient from "./ReviewClient";

export default async function ReviewPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Daily Review
        </h1>
        <div className="mt-2 h-[2px] w-20 bg-gradient-to-r from-[var(--accent-primary)] to-transparent" />
        <p className="text-[var(--text-secondary)] text-sm mt-3">
          Reflect on your day and plan for tomorrow. Earn 15 XP for completing.
        </p>
      </header>

      <ReviewClient />
    </div>
  );
}
