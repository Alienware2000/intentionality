/**
 * Dynamic favicon generator using Next.js ImageResponse API
 * Generates PNG favicons at multiple sizes from the geometric slab "I" design
 */
import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg viewBox="0 0 64 64" width="32" height="32">
          {/* Top serif */}
          <rect x="12" y="8" width="40" height="8" rx="2" fill="#000000" />
          {/* Vertical stem */}
          <rect x="24" y="8" width="16" height="48" rx="2" fill="#000000" />
          {/* Bottom serif */}
          <rect x="12" y="48" width="40" height="8" rx="2" fill="#000000" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
