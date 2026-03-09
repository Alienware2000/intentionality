// =============================================================================
// MARKETING LAYOUT
// Lightweight layout for public marketing pages (landing page, etc.)
// No auth providers, minimal wrapper for performance.
// =============================================================================

import { ThemeProvider } from "../components/ThemeProvider";
import "./landing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="landing-page">
        <div className="intentionality-bg" />
        <main className="relative z-10 min-h-screen">{children}</main>
      </div>
    </ThemeProvider>
  );
}
