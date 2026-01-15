// =============================================================================
// CLASS NAME UTILITY
// Combines clsx and tailwind-merge for conditional class name handling.
// =============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and merges Tailwind classes intelligently.
 * @example cn("px-4 py-2", isActive && "bg-red-500", "bg-blue-500")
 * // => "px-4 py-2 bg-blue-500" (bg-blue-500 wins due to twMerge)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
