"use client";

import React from "react";

import { useResident } from "@/lib/resident-portal/store";
import {
  Card, CardHead, Empty, Eyebrow, ListRow, PAGE, Pill, StatCard, StatRow,
  quietBtn, secondaryBtn,
} from "../ui";

/**
 * What a homeowner came to find out: what they owe, what is waiting on them,
 * and whether anything is wrong with their property. Three figures, then the
 * detail behind them.
 */
export default function Overview() {
  const s = useResident();
  const p = s.property;
  const firstName = s.residentName.split(" ")[0] || s.residentName;

  const openNotices = s.notices.filter((n) => !n.ok);
  const standing =
    openNotices.length === 0
      ? "Clear"
      : `${openNotices.length} open`;

  const nextEvent = s.events[0];

  return (
    <div className={PAGE} style={{ paddingInline: 0, paddingTop: 0 }}>
      {/* The balance is the one figure with a deadline, so it is the one dark
          card on the screen. */}
      <StatRow>
        <StatCard
          tone="ink"
          label={p.overdue ? "Past due" : "Balance"}
          value={p.balance || "—"}
          note={
            p.overdue
              ? `Was due ${p.due} — pay now to avoid late fees`
              : p.due
                ? `${p.cadence ? `${p.cadence} HOA fee` : "HOA fee"} · due ${p.due}`
                : "No billing on file yet"
          }
          action={
            <button
              type="button"
              onClick={() => s.setView("payments")}
              className="min-h-11 w-full rounded-lg bg-white py-[13px] text-[15px] font-semibold text-ink transition-colors hover:bg-cream"
            >
              {p.balance ? "Pay now" : "View ledger"}
            </button>
          }
        />
        <StatCard
          label="Open requests"
          value={String(s.openRequestCount)}
          note={s.requests.find((r) => r.open)?.title ?? "Nothing waiting on the office"}
          action={
            <button
              type="button"
              onClick={() => s.setView("maintenance")}
              className={`${secondaryBtn} w-full bg-paper`}
            >
              View requests
            </button>
          }
        />
        <StatCard
          tone="tint"
          label="Standing"
          value={standing}
          note={openNotices[0]?.title ?? "No open violations on your property"}
          action={
            <button
              type="button"
              onClick={() => s.setView("compliance")}
              className="min-h-11 w-full rounded-lg bg-white py-[13px] text-[15px] font-semibold text-ink transition-colors hover:bg-field"
            >
              {openNotices.length ? "See what's open" : "Compliance"}
            </button>
          }
        />
      </StatRow>

      {/* Wide first, narrow second — and both drop to full width when the
          column cannot hold them side by side. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-4">
        <Card className="px-[clamp(18px,3vw,30px)] py-7">
          <CardHead
            title="Recent activity"
            action={
              <button type="button" className={quietBtn} onClick={() => s.setView("payments")}>
                Full ledger →
              </button>
            }
          />
          {s.ledger.length === 0 ? (
            <Empty>
              No activity on your account yet. HOA fee postings and payments appear here as
              they happen.
            </Empty>
          ) : (
            s.ledger.slice(0, 5).map((l, i, arr) => (
              <ListRow key={l.id} last={i === arr.length - 1}>
                <span className="flex min-w-0 flex-[1_1_200px] items-baseline gap-4">
                  <span className="w-[74px] shrink-0 text-sm text-faint">{l.date}</span>
                  <span className="min-w-0 text-[15px] text-body">{l.label}</span>
                </span>
                <span
                  className={`shrink-0 text-[15px] font-semibold ${l.credit ? "text-moss" : "text-ink"}`}
                >
                  {l.amount}
                </span>
              </ListRow>
            ))
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card className="px-[clamp(18px,3vw,30px)] py-7">
            <CardHead title="Quick actions" />
            <div className="mt-4 grid gap-2">
              {[
                { id: "maintenance", label: "File a maintenance request" },
                { id: "architectural", label: "Submit an architectural application" },
                { id: "amenities", label: "Book an amenity" },
                { id: "documents", label: "Read the governing documents" },
              ].map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => s.setView(q.id)}
                  className="min-h-11 rounded-[10px] border border-line bg-paper px-4 py-3.5 text-left text-[15px] font-semibold text-ink transition-colors hover:border-ink"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="px-[clamp(18px,3vw,30px)] py-7">
            <Eyebrow>{nextEvent ? "Next in the community" : "From the office"}</Eyebrow>
            {nextEvent ? (
              <>
                <p className="mt-3 font-display text-[18px] leading-[1.3] font-semibold tracking-[-0.02em]">
                  {nextEvent.title}
                </p>
                <p className="mt-1.5 mb-3.5 text-[15px] leading-[1.6] text-body">
                  {nextEvent.detail}
                </p>
                <span className="text-[13px] text-faint">{nextEvent.date}</span>
              </>
            ) : s.announcements[0] ? (
              <>
                <p className="mt-3 font-display text-[18px] leading-[1.3] font-semibold tracking-[-0.02em]">
                  {s.announcements[0].title}
                </p>
                <p className="mt-1.5 mb-3.5 text-[15px] leading-[1.6] text-body">
                  {s.announcements[0].body}
                </p>
                <span className="text-[13px] text-faint">{s.announcements[0].meta}</span>
              </>
            ) : (
              <Empty>Nothing posted yet. Events and notices from the office appear here.</Empty>
            )}
            <div className="mt-4 flex flex-wrap gap-4">
              <button type="button" className={quietBtn} onClick={() => s.setView("community")}>
                Community →
              </button>
              <button type="button" className={quietBtn} onClick={() => s.setView("messages")}>
                Message the office →
              </button>
            </div>
          </Card>
        </div>
      </div>

      {s.announcements.length > 0 ? (
        <Card className="px-[clamp(18px,3vw,30px)] py-7">
          <CardHead
            title="Recent notices"
            action={
              <button type="button" className={quietBtn} onClick={() => s.setView("community")}>
                All notices →
              </button>
            }
          />
          {s.announcements.slice(0, 3).map((a, i, arr) => (
            <ListRow key={a.id} last={i === arr.length - 1}>
              <span className="min-w-0 flex-[1_1_240px]">
                <span className="block text-[15px] font-semibold text-ink">{a.title}</span>
                <span className="mt-1 block text-[15px] leading-[1.6] text-body">{a.body}</span>
              </span>
              <span className="shrink-0 text-[13px] text-faint">{a.meta}</span>
            </ListRow>
          ))}
        </Card>
      ) : null}

      {p.id === "none" ? (
        <Card className="px-[clamp(18px,3vw,30px)] py-7">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <CardTitleless />
            <Pill tone="amber">Not linked</Pill>
          </div>
          <p className="mt-2 text-[15px] leading-[1.6] text-body">
            The office hasn&rsquo;t linked your account to a property yet, {firstName}. Once
            they do, your balance, ledger, requests and documents all appear here on their
            own — there is nothing for you to set up.
          </p>
          <button type="button" className={`${quietBtn} mt-3`} onClick={() => s.setView("messages")}>
            Ask the office →
          </button>
        </Card>
      ) : null}
    </div>
  );
}

/** The unlinked card's heading, kept out of the ternary above for legibility. */
function CardTitleless() {
  return (
    <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">
      Your account isn&rsquo;t linked to a home yet
    </h2>
  );
}
