"use client";

import React from "react";

import { color, font } from "@/lib/admin-portal/tokens";

/**
 * Every section's name, its one-line description and the thing the office
 * most often came to that screen to do.
 *
 * It lives here rather than inside each section because it was drifting: two
 * screens called the same list different names, and the wording of a lede is
 * the sort of thing nobody notices is inconsistent until they read the whole
 * portal in one sitting.
 *
 * `action` is a label only. What it does is the section's business — the
 * shell hands the click back through `onAction`, and a section that has no
 * primary action simply omits it.
 */
export const SECTION_META: Record<
  string,
  { title: string; sub: string; action?: string }
> = {
  dashboard: {
    title: "Dashboard",
    sub: "What needs attention across every community.",
  },
  calendar: {
    title: "Calendar",
    sub: "Due dates, meetings, inspections and office closures.",
  },
  owners: {
    title: "Owners",
    sub: "Every homeowner of record, their balance and how to reach them.",
    action: "Add a homeowner",
  },
  comms: {
    title: "Communications",
    sub: "Conversations with residents, and announcements to the community.",
    action: "New message",
  },
  board: {
    title: "Board & meetings",
    sub: "The roster, agendas, minutes and the notice clock.",
    action: "Schedule a meeting",
  },
  accounting: {
    title: "Accounting",
    sub: "Receivables, invoices, the general ledger and the two companies' books.",
    action: "New invoice",
  },
  legal: {
    title: "Legal & liens",
    sub: "The collections ladder, counsel referrals and recorded liens.",
  },
  work: {
    title: "Work orders",
    sub: "Resident reports and scheduled maintenance. Assign it, then close with a note.",
    action: "New work order",
  },
  arc: {
    title: "Architectural review",
    sub: "Applications on the 30-day statutory clock. Silence approves them.",
  },
  violations: {
    title: "Violations & inspections",
    sub: "Findings, the notice ladder, and every letter that went out.",
    action: "Log a finding",
  },
  bookings: {
    title: "Amenity bookings",
    sub: "Clubhouse and pavilion reservations from the resident portal.",
    action: "Book for a resident",
  },
  vendors: {
    title: "Vendors",
    sub: "Contracts, certificates of insurance and what each is owed.",
    action: "Add a vendor",
  },
  docs: {
    title: "Documents",
    sub: "The governing documents, and what residents can see in their portal.",
    action: "Upload a document",
  },
  portfolio: {
    title: "Communities",
    sub: "Every association under management, and where each is in onboarding.",
    action: "Add a community",
  },
  team: {
    title: "Unity Grid team",
    sub: "Staff accounts, what each role can reach, and the audit trail.",
    action: "Invite a team member",
  },
  schedule: {
    title: "Schedule",
    sub: "Who is on today, and the week's coverage across the field crew.",
  },
};

/**
 * The event the header's primary button fires.
 *
 * A window event rather than a field on the store: the button lives in the
 * shell and the drawer it opens lives in the section, and everything between
 * them is someone else's state. This couples the two by name only.
 */
export const PRIMARY_ACTION = "unitygrid:primary-action";

export function firePrimaryAction() {
  window.dispatchEvent(new CustomEvent(PRIMARY_ACTION));
}

/** Sections call this to open their own add-drawer from the header button. */
export function usePrimaryAction(onFire: () => void) {
  const ref = React.useRef(onFire);
  /* Kept current in an effect rather than during render — the handler may
     close over state that changes, and writing a ref while rendering is not
     safe under concurrent React. */
  React.useEffect(() => {
    ref.current = onFire;
  });
  React.useEffect(() => {
    const h = () => ref.current();
    window.addEventListener(PRIMARY_ACTION, h);
    return () => window.removeEventListener(PRIMARY_ACTION, h);
  }, []);
}

/**
 * The title block. The section name and its description on the left, the
 * date and the screen's primary action on the right — the redesign's chrome,
 * and the reason no section renders its own <PageTitle> any more.
 */
export function SectionHead({
  view,
  right,
}: {
  view: string;
  right?: React.ReactNode;
}) {
  const meta = SECTION_META[view] ?? SECTION_META.dashboard;
  return (
    <div
      style={{
        display: "flex", flexWrap: "wrap", alignItems: "flex-end",
        justifyContent: "space-between", gap: "12px 24px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0, fontFamily: font.display,
            fontSize: "clamp(24px, 5vw, 28px)", fontWeight: 600,
            letterSpacing: "-0.03em", color: color.ink,
          }}
        >
          {meta.title}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: color.inkTertiary, textWrap: "pretty" }}>
          {meta.sub}
        </p>
      </div>
      {right ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, flexWrap: "wrap" }}>
          {right}
        </div>
      ) : null}
    </div>
  );
}
