// =============================================================================
// APP LAYOUT
// Main layout for authenticated app pages.
// Wraps children with ThemeProvider, ProfileProvider, FocusProvider, and BrainDumpProvider.
// Includes responsive navigation: Sidebar on desktop, MobileNav on mobile.
// =============================================================================

import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import { FocusProvider } from "../components/FocusProvider";
import { ProfileProvider } from "../components/ProfileProvider";
import { BrainDumpProvider } from "../components/BrainDumpProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { CelebrationProvider } from "../components/CelebrationOverlay";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication is handled by middleware (middleware.ts)
  return (
    <ThemeProvider>
      <ProfileProvider>
        <CelebrationProvider>
          <FocusProvider>
            <BrainDumpProvider>
              <div className="relative z-10 flex h-screen overflow-hidden">
                {/* Desktop sidebar - hidden on mobile */}
                <Sidebar />

                {/* Main content area with bottom padding for mobile nav */}
                <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
                  <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                  </div>
                </div>

                {/* Mobile bottom navigation */}
                <MobileNav />
              </div>
            </BrainDumpProvider>
          </FocusProvider>
        </CelebrationProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
