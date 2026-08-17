"use client";

import React from "react";
import Header from "./Header";
import { SECTION_META, SectionHead, firePrimaryAction } from "./SectionHead";
import { MobileNav, Sidebar } from "./Nav";
import { fetchResidentThreads } from "@/lib/admin-portal/message-actions";
import { useStore } from "@/lib/admin-portal/store";
import { Primary } from "./ui";
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

/**
 * Resident messages arrive without the office doing anything, so the inbox is
 * the one screen that has to notice on its own. Polled from the shell rather
 * than from Communications, because the badge on the nav has to light up while
 * somebody is on another section — which is exactly when nobody is looking at
 * the inbox.
 *
 * Stops while the tab is hidden and refreshes the moment it comes back: a
 * portal left open overnight should not spend the night asking.
 */
const THREAD_POLL_MS = 20_000;

function useLiveThreads() {
  const s = useStore();
  const setThreads = s.setResidentThreads;

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      if (!cancelled && document.visibilityState === "visible") {
        const res = await fetchResidentThreads();
        /* A failed poll is not worth an error on screen — the next one is
           twenty seconds away and the page is still showing the last good
           answer. It matters when replying, and that path reports for
           itself. */
        if (!cancelled && res.ok) setThreads(() => res.threads);
      }
      if (!cancelled) timer = setTimeout(tick, THREAD_POLL_MS);
    }

    timer = setTimeout(tick, THREAD_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setThreads]);
}

export default function Shell() {
  const s = useStore();
  useLiveThreads();
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
        {/* The assistant button is fixed to the bottom-right, so the last row
            of a list would otherwise sit under it for good. The reserve is
            only needed where the button overlaps the column — on a phone. */}
        <main style={{
          flex: "999 1 420px", minWidth: 0, display: "grid", gap: pad.gap,
          alignContent: "start",
          paddingBottom: s.isMobile ? 96 : 0,
        }}>
          {/* The title, its description and the screen's primary action come
              from one table rather than from each section, which is how two
              screens ended up calling the same list different names. */}
          <SectionHead
            view={view}
            right={
              SECTION_META[view]?.action ? (
                <Primary onClick={firePrimaryAction}>
                  {SECTION_META[view].action}
                </Primary>
              ) : null
            }
          />
          <Section />
        </main>
      </div>
    </>
  );
}
