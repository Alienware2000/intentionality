import { Suspense } from "react";
import AuthContent from "./AuthContent";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <AuthContent />
    </Suspense>
  );
}

function AuthLoadingFallback() {
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <header className="space-y-2 text-center">
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Welcome
        </h1>
        <div className="mx-auto h-[2px] w-16 bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent" />
        <p className="text-[var(--text-secondary)] mt-4">Loading...</p>
      </header>
    </div>
  );
}
