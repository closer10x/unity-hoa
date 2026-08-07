"use client";

import React from "react";
import Header from "./Header";
import { MobileNav, Sidebar } from "./Nav";
import { useStore } from "@/lib/admin-portal/store";
import { pad } from "@/lib/admin-portal/tokens";

import Dashboard from "./sections/Dashboard";
import Accounting from "./sections/Accounting";
import Owners from "./sections/Owners";
import WorkOrders from "./sections/WorkOrders";
import Schedule from "./sections/Schedule";
import Architectural from "./sections/Architectural";
import Violations from "./sections/Violations";
import Bookings from "./sections/Bookings";
import Communications from "./sections/Communications";
import Board from "./sections/Board";
import Legal from "./sections/Legal";
import Vendors from "./sections/Vendors";
import Documents from "./sections/Documents";
import Communities from "./sections/Communities";
import Calendar from "./sections/Calendar";
import Team from "./sections/Team";

const SECTIONS: Record<string, React.ComponentType> = {
  dashboard: Dashboard, accounting: Accounting, owners: Owners, work: WorkOrders, schedule: Schedule,
  arc: Architectural, violations: Violations, bookings: Bookings, comms: Communications,
  board: Board, legal: Legal, vendors: Vendors, docs: Documents,
  portfolio: Communities, calendar: Calendar, team: Team,
};

export default function Shell() {
  const s = useStore();
  // Server-resolved permissions: a section outside this account's allowed
  // list can never render, even if s.view is forced to it.
  const view = s.allowedSections.includes(s.view)
    ? s.view
    : s.allowedSections[0] ?? "dashboard";
  const Section = SECTIONS[view] ?? Dashboard;

  return (
    <>
      <Header />
      {/* Left-aligned, not centred: centring made the whole shell shift a few
          pixels whenever a section's height brought the scrollbar in or out,
          so the nav appeared to jump between sections. */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "flex-start",
        gap: "clamp(20px, 3vw, 40px)", padding: pad.shell,
        maxWidth: 1520, marginInline: 0,
      }}>
        {s.isMobile ? <MobileNav /> : <Sidebar />}
        <main style={{ flex: "999 1 420px", minWidth: 0, display: "grid", gap: pad.gap, alignContent: "start" }}>
          <Section />
        </main>
      </div>
    </>
  );
}
