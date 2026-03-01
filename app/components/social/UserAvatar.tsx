"use client";

// =============================================================================
// USER AVATAR COMPONENT
// Colored initial avatar with optional active indicator dot.
// Color is deterministic per userId for visual consistency.
// =============================================================================

import { getAvatarColor, getInitial } from "@/app/lib/avatar";
import { cn } from "@/app/lib/cn";

type Props = {
  userId: string;
  displayName: string | null | undefined;
  size?: number;
  showActive?: boolean;
  className?: string;
};

export default function UserAvatar({
  userId,
  displayName,
  size = 40,
  showActive,
  className,
}: Props) {
  const color = getAvatarColor(userId);
  const initial = getInitial(displayName);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <div
        className="flex items-center justify-center rounded-full text-white font-bold select-none"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          fontSize: size * 0.4,
        }}
      >
        {initial}
      </div>
      {showActive && (
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--accent-success)] border-2 border-[var(--bg-card)]"
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </div>
  );
}
