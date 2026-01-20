// =============================================================================
// AUTH LAYOUT
// Centered authentication screens with toast notifications support.
// =============================================================================

import { ToastProvider } from "@/app/components/Toast";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-base)]">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </ToastProvider>
  );
}
