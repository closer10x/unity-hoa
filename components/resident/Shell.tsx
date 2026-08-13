"use client";

import React from "react";

import Header from "./Header";
import { MobileNav, Sidebar } from "./Nav";
import { PageHead, SECTION_COPY } from "./PageHead";
import { primaryBtn, secondaryBtn } from "./ui";
import { useResident } from "@/lib/resident-portal/store";

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
  const copy = SECTION_COPY[s.view] ?? SECTION_COPY.overview;

  /* The two things a resident came to do, on every screen. Paying leads
     because it is the one with a deadline; both jump to the section that
     actually does the work rather than opening a second surface.

     On a phone they wrap under the title rather than disappearing. They used
     to be dropped on mobile to save a row, which took the pay button off the
     one device most residents open this on — and a homeowner who cannot find
     how to pay is the whole portal failing at its first job. */
  const actions = (
    <>
      {/* grow + a 150px basis: side by side wherever both fit, and one to a
          line — each filling the width — where they do not. Intrinsic, so
          there is no width at which they overlap or overflow. */}
      <button
        type="button"
        className={`${secondaryBtn} grow basis-[150px]`}
        onClick={() => s.setView("maintenance")}
      >
        File a request
      </button>
      <button
        type="button"
        className={`${primaryBtn} grow basis-[150px]`}
        onClick={() => s.setView("payments")}
      >
        {s.property.balance ? `Pay ${s.property.balance}` : "Pay HOA fees"}
      </button>
    </>
  );

  return (
    <div className="min-h-dvh bg-paper font-marketing text-ink">
      <Header />

      {s.property.alert ? (
        <div className="border-b border-line bg-[#F2E9D6] px-[clamp(16px,4vw,44px)] py-3 text-sm leading-[1.55] text-[#8A6A2F]">
          {s.property.alert}
        </div>
      ) : null}

      {/* Left-aligned, not centred — centring made the shell shift with the
          scrollbar; see the admin Shell for the history. */}
      <div
        className="flex flex-wrap items-start gap-[clamp(16px,2.5vw,28px)] p-[clamp(16px,2.5vw,24px)]"
        style={{ maxWidth: 1520 }}
      >
        {s.isMobile ? <MobileNav /> : <Sidebar />}

        {/* The reserve at the bottom keeps the fixed assistant button off the
            last row of every list. */}
        <main
          className="grid min-w-0 flex-[999_1_420px] content-start gap-4"
          style={{ paddingBottom: s.isMobile ? 96 : 0 }}
        >
          <PageHead title={copy.title} sub={copy.sub} actions={actions} />
          <Section />
        </main>
      </div>
    </div>
  );
}
