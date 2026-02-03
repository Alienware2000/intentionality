/**
 * Apple touch icon for iOS home screen
 * Uses dark background (#18181b) for better visibility on iOS
 */
import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          borderRadius: "22.5%",
        }}
      >
        <svg viewBox="0 0 64 64" width="120" height="120">
          {/* Top serif */}
          <rect x="12" y="8" width="40" height="8" rx="2" fill="#ffffff" />
          {/* Vertical stem */}
          <rect x="24" y="8" width="16" height="48" rx="2" fill="#ffffff" />
          {/* Bottom serif */}
          <rect x="12" y="48" width="40" height="8" rx="2" fill="#ffffff" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
