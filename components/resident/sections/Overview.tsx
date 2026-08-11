"use client";

import React from "react";

import { useResident } from "@/lib/resident-portal/store";
import { color, font } from "@/lib/admin-portal/tokens";
import {
  Card, CardHead, Empty, Eyebrow, Mono, PageTitle, Row, RowMain,
  TextButton, Tiles,
} from "@/components/admin/ui";

/** A clickable summary tile that routes into its full section. */
function LinkTile({
  label, value, note, onGo, action, critical = false,
}: {
  label: string; value: string; note?: string; onGo: () => void; action: string;
  /** Past due — the figure and note render in the critical red. */
  critical?: boolean;
}) {
  return (
    <div style={{ background: color.surface, border: `1px solid ${critical ? "oklch(0.85 0.06 30)" : color.hairline}`, borderRadius: 14, padding: 22, display: "grid", gap: 4, alignContent: "start" }}>
      <p style={{ margin: "0 0 6px" }}><Eyebrow>{label}</Eyebrow></p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", fontFamily: value.startsWith("$") ? font.mono : undefined, color: critical ? color.critical : undefined }}>
        {value}
      </p>
      {note ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: critical ? color.critical : color.inkTertiary }}>{note}</p> : null}
      <span style={{ marginTop: 6 }}>
        <TextButton onClick={onGo}>{action}</TextButton>
      </span>
    </div>
  );
}

export default function Overview() {
  const s = useResident();
  const p = s.property;
  const firstName = s.residentName.split(" ")[0] || s.residentName;

  const openNotices = s.notices.filter((n) => !n.ok);
  const standing = openNotices.length === 0 ? "Good standing" : `${openNotices.length} open notice${openNotices.length === 1 ? "" : "s"}`;

  return (
    <>
      <PageTitle
        title={`Welcome home, ${firstName}`}
        lede={p.id === "none"
          ? "The office hasn't linked your account to a property yet — reach out and we'll get you set up."
          : `${p.name} · ${p.address}`}
      />

      {/* Same 150 floor the admin dashboard uses: two cards side by side on
          a phone rather than one filling the screen, still wide on a desk. */}
      <Tiles min={150}>
        <LinkTile
          label={p.overdue ? "HOA fee past due" : "Next HOA fee"}
          value={p.balance || "—"}
          note={
            p.overdue
              ? `Was due ${p.due} — pay now to avoid late fees`
              : p.due
                ? `Due ${p.due}${p.cadence ? ` · ${p.cadence} HOA fee` : ""}`
                : "No billing on file yet"
          }
          onGo={() => s.setView("payments")}
          action="Pay now"
          critical={p.overdue}
        />
        <LinkTile
          label="Open requests"
          value={String(s.openRequestCount)}
          note={s.requests.find((r) => r.open)?.title ?? "Nothing waiting on the office"}
          onGo={() => s.setView("maintenance")}
          action="Maintenance"
        />
        <LinkTile
          label="Standing"
          value={standing}
          note={openNotices[0]?.title ?? "No open violations on your property"}
          onGo={() => s.setView("compliance")}
          action="Compliance"
        />
      </Tiles>

      <Card>
        <CardHead title="Recent activity" meta="Your account ledger" />
        {s.ledger.length === 0 ? (
          <Empty>No activity on your account yet. HOA fee postings and payments will appear here.</Empty>
        ) : (
          s.ledger.slice(0, 5).map((l) => (
            /* Placed explicitly rather than auto-flowed. Three cells against
               the tracks auto-fit makes here, so `justify-self: end` alone
               would park the amount mid-row with empty columns beyond it —
               the last track is what reaches the edge. But pinning the amount
               there also pushes an auto-placed sibling onto a second row, so
               the description is given its column too.

               A phone gets the shape a statement has: date and amount on the
               top line, the description across the width beneath. */
            <Row
              key={l.id}
              style={s.isMobile ? { gridTemplateColumns: "auto 1fr", rowGap: 2 } : undefined}
            >
              <Mono
                size={13}
                style={{
                  color: color.neutral,
                  ...(s.isMobile ? { gridRow: 1, gridColumn: 1 } : {}),
                }}
              >
                {l.date}
              </Mono>
              <span style={s.isMobile ? { gridRow: 2, gridColumn: "1 / -1" } : { gridColumn: 2 }}>
                <RowMain label={l.label} />
              </span>
              <Mono
                size={14}
                style={{
                  color: l.credit ? color.positive : color.ink,
                  justifySelf: "end",
                  ...(s.isMobile
                    ? { gridRow: 1, gridColumn: 2 }
                    : { gridColumn: "-2 / -1" }),
                }}
              >
                {l.amount}
              </Mono>
            </Row>
          ))
        )}
        <div style={{ padding: "12px 24px" }}>
          <TextButton onClick={() => s.setView("payments")}>Full ledger and payments</TextButton>
        </div>
      </Card>

      <Card>
        <CardHead title="Coming up" meta="Community calendar" />
        {s.events.length === 0 ? (
          <Empty>Nothing scheduled right now. Community events and meetings will appear here.</Empty>
        ) : (
          s.events.slice(0, 4).map((e) => (
            <Row key={e.id}>
              <Mono size={13} style={{ color: color.neutral }}>{e.date}</Mono>
              <RowMain label={e.title} detail={e.detail} />
            </Row>
          ))
        )}
        <div style={{ padding: "12px 24px" }}>
          <TextButton onClick={() => s.setView("community")}>Events, ballots and announcements</TextButton>
        </div>
      </Card>

      <Card>
        <CardHead title="Recent notices" meta="From the office" />
        {s.announcements.length === 0 ? (
          <Empty>No announcements yet.</Empty>
        ) : (
          s.announcements.slice(0, 3).map((a) => (
            <Row key={a.id}>
              <Mono size={13} style={{ color: color.neutral }}>{a.meta}</Mono>
              <RowMain label={a.title} detail={a.body} />
            </Row>
          ))
        )}
        <div style={{ padding: "12px 24px", display: "flex", gap: 14, flexWrap: "wrap" }}>
          <TextButton onClick={() => s.setView("documents")}>Documents</TextButton>
          <TextButton onClick={() => s.setView("messages")}>Message the office</TextButton>
        </div>
      </Card>

      {p.id === "none" ? (
        <Card>
          <Empty>
            Once the office links your account to your lot, your balance, ledger,
            requests and documents will all appear here automatically.
          </Empty>
        </Card>
      ) : null}
    </>
  );
}
