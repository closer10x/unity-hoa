"use client";

import React from "react";

/**
 * The title block at the top of every section.
 *
 * The redesign puts the section's name and a plain-English subtitle on the
 * left and the two things a resident most often came to do on the right. It
 * replaces per-section <PageTitle> so the wording lives in one place and the
 * actions cannot drift apart between screens.
 */
export function PageHead({
  title,
  sub,
  actions,
}: {
  title: string;
  sub: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-[clamp(24px,6vw,28px)] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </div>
      {actions ? (
        /* min-w-0 so the cluster may shrink below its widest button rather
           than setting a floor the whole column has to honour — without it a
           320px screen was 11px wider than itself. */
        <div className="flex min-w-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}

/** Section name and subtitle, in one place so no screen invents its own. */
export const SECTION_COPY: Record<string, { title: string; sub: string }> = {
  overview: { title: "Overview", sub: "Your home, your balance and anything waiting on you" },
  payments: { title: "Dues & ledger", sub: "HOA fees, payments and statements" },
  maintenance: { title: "Maintenance", sub: "Requests for common areas and amenities" },
  architectural: { title: "Architectural", sub: "Applications to change your home's exterior" },
  compliance: { title: "Compliance", sub: "Anything open against your property, and how to clear it" },
  amenities: { title: "Amenities", sub: "Book the clubhouse, pool and pavilion" },
  access: { title: "Access & guests", sub: "Gate codes, fobs and visitor passes" },
  community: { title: "Community", sub: "Events, notices and what the board is deciding" },
  messages: { title: "Messages", sub: "Your conversations with the office" },
  documents: { title: "Documents", sub: "Governing documents, budgets and minutes" },
  account: { title: "Account", sub: "Your details, household, notifications and sign-in" },
};
