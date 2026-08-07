"use client";

import React from "react";

import Header from "./Header";
import { MobileNav, Sidebar } from "./Nav";
import { useResident } from "@/lib/resident-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";

import Overview from "./sections/Overview";
import Payments from "./sections/Payments";
import Maintenance from "./sections/Maintenance";
import Architectural from "./sections/Architectural";
import Compliance from "./sections/Compliance";
import Amenities from "./sections/Amenities";
import Access from "./sections/Access";
import Community from "./sections/Community";
import Messages from "./sections/Messages";
import Documents from "./sections/Documents";
import Account from "./sections/Account";

const SECTIONS: Record<string, React.ComponentType> = {
  overview: Overview, payments: Payments, maintenance: Maintenance,
  architectural: Architectural, compliance: Compliance, amenities: Amenities,
  access: Access, community: Community, messages: Messages,
  documents: Documents, account: Account,
};

export default function Shell() {
  const s = useResident();
  const Section = SECTIONS[s.view] ?? Overview;

  return (
    <>
      <Header />
      {s.property.alert ? (
        <div
          style={{
            padding: `12px ${pad.shell}`,
            background: "oklch(0.96 0.035 70)",
            borderBottom: `1px solid ${color.hairline}`,
            fontSize: 14,
            lineHeight: 1.55,
            color: "oklch(0.4 0.07 60)",
          }}
        >
          {s.property.alert}
        </div>
      ) : null}
      {/* Left-aligned, not centred — centring made the shell shift with the
          scrollbar; see the admin Shell for the history. */}
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "flex-start",
          gap: "clamp(20px, 3vw, 40px)", padding: pad.shell,
          maxWidth: 1440, marginInline: 0,
        }}
      >
        {s.isMobile ? <MobileNav /> : <Sidebar />}
        <main style={{ flex: "999 1 420px", minWidth: 0, display: "grid", gap: pad.gap, alignContent: "start" }}>
          <Section />
        </main>
      </div>
    </>
  );
}
