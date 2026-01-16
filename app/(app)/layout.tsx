// =============================================================================
// APP LAYOUT
// Main layout for authenticated app pages.
// Wraps children with ProfileProvider and FocusProvider for global state.
// =============================================================================

import Sidebar from "../components/Sidebar";
import { FocusProvider } from "../components/FocusProvider";
import { ProfileProvider } from "../components/ProfileProvider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication is handled by middleware (middleware.ts)
  return (
    <ProfileProvider>
      <FocusProvider>
        <div className="relative z-10 flex h-screen overflow-hidden">
          <Sidebar />

          <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </div>
      </FocusProvider>
    </ProfileProvider>
  );
}
