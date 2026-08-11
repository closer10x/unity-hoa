"use client";

import React from "react";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, radius } from "@/lib/admin-portal/tokens";
import { Card, CardHead, Mono, PageTitle, Pill, Row, RowMain, Tile, Tiles } from "../ui";

/**
 * The dashboard answers one question — what needs me today — and everything
 * on it is computed from the same records the sections show. Nothing here is
 * a fixture: "Needs a decision" used to read from an empty constant, so the
 * card that promised the most important thing on the screen could never say
 * anything at all.
 */

/** How loudly an item asks to be dealt with. Drives colour and order. */
type Urgency = "critical" | "attention" | "routine";

type Decision = {
  id: string;
  label: string;
  detail: string;
  target: string;
  urgency: Urgency;
};

const URGENCY_RANK: Record<Urgency, number> = { critical: 0, attention: 1, routine: 2 };

const URGENCY_TONE: Record<Urgency, { dot: string; word: string }> = {
  critical: { dot: "oklch(0.58 0.19 25)", word: "Overdue" },
  attention: { dot: "oklch(0.7 0.14 75)", word: "Waiting" },
  routine: { dot: "oklch(0.62 0.06 155)", word: "To do" },
};

/** Days between an ISO date and today, negative once it has passed. */
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso.length > 10 ? iso : `${iso}T12:00:00Z`);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86_400_000);
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export default function Dashboard() {
  const s = useStore();

  /* Everything waiting on the office, gathered from live records. Each entry
     names the number and the consequence, because "3 items" tells nobody
     whether to open it. */
  const decisions: Decision[] = React.useMemo(() => {
    const out: Decision[] = [];

    const overdue = s.invoices.filter((i) => i.overdue);
    if (overdue.length) {
      out.push({
        id: "invoices-overdue",
        label: `${overdue.length} ${plural(overdue.length, "invoice")} past due`,
        detail: `${overdue.map((i) => i.billTo).slice(0, 3).join(", ")}${overdue.length > 3 ? " and others" : ""} — collections start here`,
        target: "accounting",
        urgency: "critical",
      });
    }

    /* Money in neither company's books is invisible at return time, which is
       exactly when it is too late to sort out. */
    const unassigned = s.invoices.filter((i) => !i.entity && i.status !== "void");
    if (unassigned.length) {
      out.push({
        id: "invoices-unassigned",
        label: `${unassigned.length} ${plural(unassigned.length, "invoice")} assigned to no company`,
        detail: "Not in either set of books until someone says whose revenue it is",
        target: "accounting",
        urgency: "attention",
      });
    }

    const drafts = s.invoices.filter((i) => i.status === "draft");
    if (drafts.length) {
      out.push({
        id: "invoices-draft",
        label: `${drafts.length} ${plural(drafts.length, "invoice")} drafted but never issued`,
        detail: "Nothing is owed until they go out",
        target: "accounting",
        urgency: "routine",
      });
    }

    /* The 30-day statutory clock: an application that runs out is approved by
       default, so this one is genuinely urgent rather than merely late. */
    const arcOpen = s.arcApps.filter((a) => a.status === "Awaiting decision");
    const arcSoon = arcOpen.filter((a) => {
      const d = daysUntil(a.due);
      return d != null && d <= 7;
    });
    if (arcOpen.length) {
      out.push({
        id: "arc",
        label: `${arcOpen.length} architectural ${plural(arcOpen.length, "application")} awaiting a decision`,
        detail: arcSoon.length
          ? `${arcSoon.length} within a week of the 30-day deadline — silence approves them`
          : "On the 30-day statutory clock",
        target: "arc",
        urgency: arcSoon.length ? "critical" : "attention",
      });
    }

    const unassignedWork = s.work.filter(
      (w) => w.status !== "Closed" && (!w.assignee || w.assignee === "Unassigned"),
    );
    if (unassignedWork.length) {
      out.push({
        id: "work-unassigned",
        label: `${unassignedWork.length} work ${plural(unassignedWork.length, "order")} with nobody on ${unassignedWork.length === 1 ? "it" : "them"}`,
        detail: unassignedWork.map((w) => w.title).slice(0, 2).join(", "),
        target: "work",
        urgency: "attention",
      });
    }

    const openCases = s.violations.filter((v) => v.status !== "Resolved");
    if (openCases.length) {
      out.push({
        id: "violations",
        label: `${openCases.length} violation ${plural(openCases.length, "case")} still open`,
        detail: "Each one is waiting on the next notice in the ladder",
        target: "violations",
        urgency: "routine",
      });
    }

    const requested = s.bookings.filter((b) => b.status === "Requested");
    if (requested.length) {
      out.push({
        id: "bookings",
        label: `${requested.length} amenity ${plural(requested.length, "booking")} requested`,
        detail: "Residents are waiting on a yes or no",
        target: "bookings",
        urgency: "attention",
      });
    }

    /* A staff member with no sign-in cannot be given anything to do. */
    const noAccount = s.staff.filter((p) => p.active && !p.profileId);
    if (noAccount.length) {
      out.push({
        id: "staff",
        label: `${noAccount.length} team ${plural(noAccount.length, "member")} without a portal account`,
        detail: noAccount.map((p) => p.name).slice(0, 3).join(", "),
        target: "team",
        urgency: "routine",
      });
    }

    return out.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
  }, [s.invoices, s.arcApps, s.work, s.violations, s.bookings, s.staff]);

  const critical = decisions.filter((d) => d.urgency === "critical").length;

  return (
    <>
      <PageTitle title="Dashboard" lede={`What needs attention across ${s.scopeLabel}.`} />

      {/* 150 does double duty: two tiles side by side on a 375px phone
          instead of one per screenful, and still five across the desk, since
          flex-wrap grows them to fill either way. A single floor covers both
          because the basis is a floor, not a width. */}
      <Tiles min={150}>
        {s.metrics.map((m) => (
          <Tile key={m.label} label={m.label} value={m.value} note={m.note} tone={m.tone} />
        ))}
      </Tiles>

      <Card>
        <CardHead
          title="Needs a decision"
          meta={
            decisions.length
              ? "Items waiting on the office, most urgent first — each opens its section"
              : "Nothing is waiting on the office right now"
          }
        >
          {critical > 0 ? (
            <Mono size={12} style={{ color: URGENCY_TONE.critical.dot }}>
              {critical} urgent
            </Mono>
          ) : null}
        </CardHead>

        {decisions.length === 0 ? (
          <Row>
            <span style={{ fontSize: 15, color: color.inkTertiary }}>
              Every invoice is current, every application has a decision and every job has
              somebody on it. Anything that needs you will appear here.
            </span>
          </Row>
        ) : (
          decisions.map((d) => (
            <Row key={d.id} style={{ alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 11, minWidth: 0 }}>
                {/* Colour carries the urgency — no icons. The dot is the only
                    thing on the row you can read from across a desk. */}
                <span
                  aria-hidden
                  style={{
                    width: 8, height: 8, borderRadius: "50%", flex: "0 0 auto",
                    background: URGENCY_TONE[d.urgency].dot,
                    transform: "translateY(-1px)",
                  }}
                />
                <RowMain label={d.label} detail={d.detail} />
              </span>
              <Mono size={11} style={{ color: color.inkQuaternary }}>
                {URGENCY_TONE[d.urgency].word}
              </Mono>
              <Pill
                style={{ padding: "10px 16px", fontSize: 13, justifySelf: "end" }}
                onClick={() => s.setView(d.target)}
              >
                Open
              </Pill>
            </Row>
          ))
        )}
      </Card>

      <Card>
        <CardHead
          title="Latest changes"
          meta="The most recent actions across both portals, with who made them — full history in Team → Audit trail"
        />
        {s.auditLog.length === 0 ? (
          <Row>
            <span style={{ fontSize: 15, color: color.inkTertiary }}>
              Nothing recorded yet this session. Actions you take appear here and in Team → Audit trail.
            </span>
          </Row>
        ) : (
          s.auditLog.slice(0, 6).map((a) => (
            // Fixed trailing tracks, not auto-fit, so the actor pill and time
            // land in the same column on every row — the eye runs straight down
            // the pills. The action text takes the flexible 1fr and shrinks
            // first, so these small tracks never collapse the way a data row's
            // would. The pill sits right of the prose but on a shared left edge.
            <Row key={a.id} style={{ alignItems: "baseline", gridTemplateColumns: "minmax(0, 1fr) 150px 84px" }}>
              <span style={{ fontSize: 15, lineHeight: 1.5 }}>{a.text}</span>
              <span
                style={{
                  justifySelf: "start", fontSize: 12.5, color: "oklch(0.4 0.04 155)",
                  background: color.accentTint, borderRadius: radius.pill,
                  padding: "3px 10px", whiteSpace: "nowrap",
                }}
              >
                {a.who}
              </span>
              <span style={{ justifySelf: "start", fontFamily: font.mono, fontSize: 12, color: color.inkQuaternary }}>
                {a.time}
              </span>
            </Row>
          ))
        )}
      </Card>
    </>
  );
}
