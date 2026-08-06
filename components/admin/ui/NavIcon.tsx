import React from "react";

/**
 * Minimal line icons for the nav.
 *
 * Note: docs/design/handoff.md says no icon set is used and status is carried
 * by colour and mono labels. These were asked for explicitly, so they are kept
 * as quiet as possible — geometry only, one stroke weight, currentColor, no
 * fills, and no dependency added (the portal ships with none).
 */

const S = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
};

const PATHS: Record<string, React.ReactNode> = {
  // Four panes — an overview
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  // Month grid
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  // Ledger column with a rule — money in, money out
  accounting: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </>
  ),
  // Balance beam
  legal: (
    <>
      <path d="M12 4v16M7 20h10M4 8h16M4 8l-2 5h4zM20 8l2 5h-4z" />
    </>
  ),
  // Spanner
  work: (
    <>
      <path d="M15.5 4a5 5 0 0 0-5.9 6.4L4 16v4h4l5.6-5.6A5 5 0 0 0 20 8.5z" />
      <path d="M8.5 15.5h.01" />
    </>
  ),
  // Roofline over a plan
  arc: (
    <>
      <path d="M3.5 10.5 12 4l8.5 6.5" />
      <path d="M6 12v8h12v-8" />
      <path d="M10.5 20v-4.5h3V20" />
    </>
  ),
  // Soft alert
  violations: (
    <>
      <path d="M12 4.5 21 19.5H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  // Reserved slot
  bookings: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M9 15.5l2 2 4-4" />
    </>
  ),
  // Trade case
  vendors: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M3 13h18" />
    </>
  ),
  // A person at a door
  owners: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  // Message
  comms: (
    <>
      <path d="M20 4.5H4a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 16.5h3V21l4.5-4.5H20a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 20 4.5z" />
    </>
  ),
  // Seats around a table
  board: (
    <>
      <circle cx="8" cy="8.5" r="2.8" />
      <circle cx="16" cy="8.5" r="2.8" />
      <path d="M2.5 19a5.5 5.5 0 0 1 11 0M13 19a5.5 5.5 0 0 1 8.5-4.6" />
    </>
  ),
  // Sheet with a turned corner
  docs: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  // Two rooflines — a neighbourhood
  portfolio: (
    <>
      <path d="M3 20V11l5.5-4 5.5 4v9" />
      <path d="M14 20v-6l3.5-2.5L21 14v6" />
      <path d="M2 20h20" />
    </>
  ),
  // Staff
  team: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.4A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
};

export function NavIcon({ id }: { id: string }) {
  const d = PATHS[id];
  if (!d) return null;
  return (
    <svg {...S} style={{ flex: "0 0 auto", opacity: 0.75 }}>
      {d}
    </svg>
  );
}
