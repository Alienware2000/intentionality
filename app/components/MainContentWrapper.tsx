"use client";

// =============================================================================
// MAIN CONTENT WRAPPER
// Client component wrapper for main content area that applies dynamic margin
// based on sidebar collapsed state.
// =============================================================================

import { cn } from "@/app/lib/cn";
import { useSidebar } from "./SidebarProvider";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function MainContentWrapper({ children, className }: Props) {
  const { isCollapsed, animationsEnabled } = useSidebar();

  return (
    <div
      className={cn(
        "flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto pb-20 md:pb-0",
        isCollapsed ? "md:ml-16" : "md:ml-64",
        animationsEnabled && "transition-[margin] duration-200 ease-out",
        className
      )}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
