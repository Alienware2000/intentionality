// =============================================================================
// MARKETING LAYOUT
// Lightweight layout for public marketing pages (landing page, etc.)
// No auth providers, minimal wrapper for performance.
// =============================================================================

import { ThemeProvider } from "../components/ThemeProvider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="intentionality-bg" />
      <main className="relative z-10 min-h-screen">{children}</main>
    </ThemeProvider>
  );
}
